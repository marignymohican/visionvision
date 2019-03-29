import os
import sys
import datetime
import json
import requests
from pathlib import Path
from PIL import Image

from bs4 import BeautifulSoup

import firebase_admin
from firebase_admin import credentials
from firebase_admin import db

cred = credentials.Certificate('firebase.service.account.json')
default_app = firebase_admin.initialize_app(cred)

#firebase_admin.db.Reference(**kwargs)
dbParti = db.reference(path='participants',url='https://visionvision-3af1d.firebaseio.com/')

# what year is it???!!!???
escyear = '2019' # set the year manually....
# escyear = db.reference(path='config/year',url='https://visionvision-3af1d.firebaseio.com/')

eutvurl = 'https://eurovision.tv'
pAll = requests.get(eutvurl + '/participants')
soup = BeautifulSoup(pAll.content, 'html.parser')

# find all participants on the page via css class selector
eutvparticipants = soup.find_all(class_='card__StyledBox-sc-56uo41-0')
participants = []

slackHeaders = {'content-type': 'application/json'}
slack = requests.post('https://hooks.slack.com/services/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', data = json.dumps({'text': 'Checking for some new Eurovision stuff!'}), headers = slackHeaders)

def makethumbnail(locImg, remImg):
    # make a copy of the remote image
    with open(locImg + '.jpg', 'wb') as bigImg:
        bigImg.write(remImg)
    
    # compose the visionvision card image
    cardImg = Image.open(locImg + '.jpg')
    cardImgW, cardImgH = cardImg.size
    
    print('original size: ' + str(cardImg.size))
    # 768w / 403h
    # ideal ratio is: 1.90570719w:1h
    cardRatio = 1.90570719 # 2?                
    cardImgRatio = cardImgW / cardImgH                
    print('cardImgRatio: ' + str(cardImgRatio) + ':1')
    
    cropbox = ()
    
    # crop the image to the ratio we want
    if cardImgRatio < cardRatio:
        # the image has a greater height than needed
        # preserve the width
        
        newHeight = cardImgW / cardRatio
        trim = (cardImgH - newHeight) / 2
        cropbox = ( 0, int(trim), int(cardImgW), int(trim + newHeight) )
        
    else: # the image is vertical
        # the image has a greater width than needed
        # preserve the height
        
        newWidth = cardImgH * cardRatio
        print('newWidth: ' + str(newWidth))
        trim = (cardImgW - newWidth) / 2
        print('trim: ' + str(trim))
        cropbox = ( int(trim), 0 , int(trim + newWidth), int(cardImgH))

    cardImg = cardImg.crop(cropbox)
    
    scSize = (768,403)
    cardImg.thumbnail(scSize, Image.ANTIALIAS)
    
    cardImg = cardImg.convert('RGB')
    cardImg.save(locImg + '_sc' + '.jpg', 'JPEG')  



for p in eutvparticipants:
    if p.contents[0].name == 'a':
        print('-=-=-=-')
        print('participant found!')
        participant = {}

        # - flag
        pFlag = p.find('svg')
        del pFlag['height']
        del pFlag['style']
        participant['flag'] = str(pFlag)
        
        # - country name
        participant['name'] = pFlag.next_sibling.text
        participant['tagname'] = participant['name'].lower().replace('the ','').replace('.','').replace(' ','_')

        participant[escyear] = {}

        # - participant name
        participant[escyear]['artist'] = p.find('h3').text
        
        # - participant photo
        print('grabbing participant photo')
        participant[escyear]['img'] = {}
        participant[escyear]['img']['hot'] = p.find('img')['src'].replace('?p=card','')
        
        try:
            locImg = '../public/img/participants/' + escyear + '/' + participant['tagname']
            locImgExt = '.jpg'
            locImgPath = Path(locImg + locImgExt)
            if locImgPath.is_file():
                # file already exists
                print('aready have a photo for ' + participant[escyear]['artist'])
                
                # check to see if the remote file is the same as the local
                hotImg = requests.get(participant[escyear]['img']['hot'])
                tempImg = '../public/img/participants/' + escyear + '/temp.jpg'
                with open(tempImg, 'wb') as t:
                    t.write(hotImg.content)
                # if remote is different from local
                if Path(tempImg).stat().st_size != locImgPath.stat().st_size:
                    print('images are not the same size')
                    
                    # backup the local one
                    bakImg = '../public/img/participants/' + escyear + '/bak/' + participant['tagname'] + '.' + datetime.datetime.now().strftime("%Y%m%d%H%M") + '.jpg'
                    with open(locImg + locImgExt, 'rb') as l:
                        with open(bakImg, 'wb') as b:
                            b.write(l.read())
                    
                    # overwrite the local one
                    makethumbnail(locImg, hotImg.content)
                
                
                
                
                
                
                
            else:
                # file doesnt yet exist
                print('i dont have a photo for ' + participant[escyear]['artist'])
                
              
                
        except FileNotFoundError as ferr:
            print('!!!file not found!!!')
            print(ferr)
            
        except Exception as err:
            print('!!!some other error occurred!!!')
            print(err)

        # the song and setup for grand final (gotta go to the participant page for this)
        pGet = requests.get(eutvurl + p.contents[0]['href'])
        pPage = BeautifulSoup(pGet.content, 'html.parser')
        participant[escyear]['song'] = pPage.find('span', attrs={'itemtype': 'http://schema.org/musicComposition'})
        if participant[escyear]['song'] is not None:
            participant[escyear]['song'] = participant[escyear]['song'].find('meta', attrs={'itemprop': 'name'})['content']
        
        # update the json object for the local file
        participants.append(participant)
        
        dbPref = dbParti.order_by_child('name').equal_to(participant['name']).get()
        nodupe = True;
        if len(dbPref) > 0: # check if a participant of this name already exists
            for item in dbPref:
                if nodupe: # if there's more than one, we'll only keep this one
                    checkParti = dbParti.child(item).get()
                    
                    for value in participant[escyear]:
                        if participant[escyear][value] is not None:
                            if value not in checkParti[escyear]:
                                slack = requests.post('https://hooks.slack.com/services/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', data = json.dumps({'text': 'Adding ' + value + ' to ' + participant['name'] + '!'}), headers = slackHeaders)
                            elif participant[escyear][value] != checkParti[escyear][value]:
                                slack = requests.post('https://hooks.slack.com/services/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', data = json.dumps({'text': 'Updating ' + value + ' for ' + participant['name'] + '!'}), headers = slackHeaders)
                    
                    dbParti.child(item).update(participant)
                    nodupe = False
                else:
                    dbParti.child(item).delete()
        else:
            dbParti.push(participant)
            slack = requests.post('https://hooks.slack.com/services/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', data = json.dumps({'text': participant['name'] + ' has been added to the leaderboard!'}), headers = slackHeaders)

        # done with this participant
        print(participant)
        print('-=-=-=-=-')
        print(' ')
    

p = {}
p['participants'] = participants
pJson = open('participants.json', 'w')
pJson.write(json.dumps(p))
pJson.close()

print(' ')
print('+++++++')
print(' ')
print(' ')
