

$(document).ready(function() {
    // Initialize Firebase
    const fbconfig = {
        apiKey: "AIzaSyAcqy5-9jdnUmq16cn9sL5K8jOGWJUZyHw",
        authDomain: "visionvision-3af1d.firebaseapp.com",
        databaseURL: "https://visionvision-3af1d.firebaseio.com",
        projectId: "visionvision-3af1d",
        storageBucket: "visionvision-3af1d.appspot.com",
        messagingSenderId: "821274017742"
    };
    firebase.initializeApp(fbconfig);
    
    const whatyearisit = firebase.database().ref('/config/year');
    const dbParticipants = firebase.database().ref('/participants');
    const dbMyVotes = firebase.database().ref('/voting_venues/mimis/votes');

    let votingtoken = false;
    let myvotes = [];
    const songcontainer = function(sc_data,year) {
        this.name = sc_data.name;
        this.sName = sc_data.name.toLowerCase().replace(/ /g,'_').replace(/\./g,'').replace(/the /g,'');
        this.song = function() {
            if ( sc_data[year].song ) { return '<h3>' + sc_data[year].song + '</h3>'; }
            else { return ''; }
        };
        this.language = function() {
            if ( sc_data[year].language ) { return '<p class="language">(Sung in ' + sc_data[year].language + ')</p>'; }
            else { return ''; }
        };
        this.artist = function() {
            if ( sc_data[year].artist ) { return '<h4><span>Performed by</span> ' + sc_data[year].artist + '</h4>'; }
            else { return ''; }
        };
        
        this.sc = function() {
            return (
                `<div id="sc_${this.sName}" class="songcontainer">
                    <div class="flag">
                        <img src="./img/flags/${this.sName}.png" />
                        <div class="f_text">${this.name}</div>
                    </div>
                    <div class="song" style="background-image: url(./img/participants/${year}/${this.sName}.jpg);">
                        ${this.song()}
                        ${this.language()}
                        ${this.artist()}
                    </div>
                </div>`
            );
        };
    };

    if (storageAvailable('localStorage')) {
        whatyearisit.once('value').then((data) => {
            setthestage(data.val());
        });
    } else {
        alert('i was unable to set a storage variable :(\n\nperhaps try a different browser?');
    }

    function setthestage(vv_year) {
        console.log('building out the leaderboard for ' + vv_year);
        // check for a previous voting token
        console.log('checking for previous votes');
        if ( !localStorage.getItem('vv_votingtoken') ) {
            // no votingtoken exists
            votingtoken = Math.ceil(Math.random() * 10000) + 'vv_dev' + Math.ceil(Math.random() * 10000);
            localStorage.setItem('vv_votingtoken', votingtoken);
        } else {
            // voting token exists
            votingtoken = localStorage.getItem('vv_votingtoken');
        }

        // build the song chooser
        dbParticipants.once('value', function(pdata) {
            console.log('constructing the song chooser');
            pdata.forEach(function(part) {
                
                let sc = $('<li />');
                sc.append( new songcontainer(part.val(),vv_year).sc() );
                sc.on('click',() => {
                    addsong(sc,pointsto);
                });
                
                $('#allthesongs').append(sc);
            });
            
            $('#allthesongs li').sort(function(a,b) {
                var va = $(a).find('.songcontainer').eq(0).attr('id'),
                    vb = $(b).find('.songcontainer').eq(0).attr('id');
                if ( va > vb ) { return 1; }
                if ( va < vb ) { return -1; }
                return 0;
            }).appendTo('#allthesongs');
            

        }).then(function() {
            // this is the part to remember when folk may have already submitted votes
            dbMyVotes.child(votingtoken).once('value',function(myData) {
                myvotes = myData.val();
            }).then(function() {
                if ( myvotes ) {
                    console.log('adding previous votes to my leaderboard');
                    myvotes.forEach(function(myData) {
                        let place = '#vv_place_' + myData.points;
                        let sc = '#sc_' + myData.name.toLowerCase().replace(/ /g,'_');
                        $(place).find('.myvotes .vv_info').html($(sc).clone());
                    }); 
                }
                $('#main #myvotes').fadeIn(500);
            });
        });
    }
    
    function venueLeaders(data) {
        console.log(data.val());

        // build a new array of all votes
        let allVotes = data.val();
        let votetally = [];
        
        for ( let votes in allVotes ) {
            if ( allVotes[votes] ) {
                allVotes[votes].forEach(function(vote) {
                    let addme = false;
                    for ( let v = 0; v < votetally.length; v++ ) {
                        if ( votetally[v] && votetally[v].name == vote.name ) {
                            addme = v;
                        }
                    }
                    if ( addme === 0 || addme ) {
                        votetally[addme].points += parseInt(vote.points);
                    } else {
                        vote.points = parseInt(vote.points);
                        votetally.push(vote);
                    }   
                });
            }
        }
        votetally.sort(function(a,b) {
            var va = a.points, vb = b.points;
            if ( va < vb ) { return 1; }
            if ( va > vb ) { return -1; }
            return 0;
        });

        $('#chooseUr10 li').each(function(index) {
            if ( votetally[index] ) {
                votetally[index].bigName = votetally[index].name.replace(/_/g, ' ');
                
                $(this).find('.venuevotes .vv_place').html(votetally[index].points);
                $(this).find('.venuevotes .vv_info').html(
                    `<div class="flag">
                        <img src="./img/flags/${votetally[index].name}.png" />
                        <div class="f_text">
                            ${votetally[index].bigName}
                        </div>
                    </div>`);
            } else {
                //$(this).find('.venuevotes').html('');
            }
        });
    }

// -=-=-=- CLICK EVENTS -=-=-=-
    // pop up the song chooser, identify the position to add a song to
    $('#myvotes').on('click','.myvotes',function() {
        pointsto = '#' + $(this).parent().attr('id');

        if ( $('#overlay #songchooser').hasClass('notvisible') ) {
            $('#overlay #songchooser').removeClass('notvisible');
            $('#overlay #whatisthis').addClass('notvisible');
        }
        
        $('#overlay').fadeIn(500, function() {
            $('#allthesongs').scrollTop(0);
        });
    });
    
    // submit your vote(s)
    $('#myvotes').on('click','#submitvote', function() {
        let votingData = [];
        
        $('#chooseUr10 li').each(function() {
            if ( $(this).find('.myvotes .songcontainer').length ) {
                votingData.push({
                    "name": $(this).find('.myvotes .songcontainer').attr('id').replace(/sc_/,''),
                    "points": $(this).attr('id').replace(/vv_place_/,'')
                });
            }
        });

        dbMyVotes.child(votingtoken).set(votingData);
        alert('Thanks!\n\nVote as often and as many times as you like, only the last time counts =-D');
    });
    
    // clear my leader board
    $('#myvotes').on('click','#clearleaderboard', function() {
        $('#chooseUr10 li').each(function() {
            $(this).find('.myvotes .vv_info').html('<span class="sAs">Select a song!</span>');
        });
        
        dbMyVotes.child(votingtoken).set(null);
        
        alert('All votes have been removed');
    });

    // clear just this vote
    $('#overlay').on('click', '.clearthis', function() {
        $(pointsto).find('.vv_info').html('<span class="sAs">Select a song!</span>');
        $('#overlay').fadeOut(500);
    });

    // just close the darn overlay!!!
    $('#overlay').on('click', '.cw', function() {
        $('#overlay').fadeOut(500);
    });

    // view more info on the eurovision
    $('nav').on('click', '#whatisthis', function() {
        
        if ( $('#overlay #whatisthis').hasClass('notvisible') ) {
            $('#overlay #whatisthis').removeClass('notvisible');
            $('#overlay #songchooser').addClass('notvisible');
        }
        $('body').addClass('noscroll');
        $('#overlay').fadeIn(500, function() {
            $('#allthesongs').scrollTop(0);
        });
        
    });

    // view the full leaderboard
    $('nav').on('click', '#toggle_leaders', function() {
        // dbMyVotes

        // show the full leaderboard
        if ( $(this).hasClass('myvotes') ) {
            $(this).removeClass('myvotes').text('Hide the Leaderboard');
            $('#chooseUr10').addClass('allvotes');
            
            dbMyVotes.on('value', (data) => venueLeaders(data) );

            $('#chooseUr10 li').animate({
                'height': '50px'
            }, 1000);
            $('#myvotes .vv_place').animate({
                'padding-top': '0.2em'
            }, 1000);
            $('#myvotes .vv_info .flag').animate({
                'width': '100%'
            }, 1000);
            $('#myvotes .myvotes').animate({
                'width': '45%',
                'height': '50px'
            }, 1000);
            $('#myvotes .venuevotes').animate({
                'border-width': '2px',
                'width': '45%',
                'height': '50px'
            }, 1000);
            
            $('#chooseUr10 .songcontainer .song').fadeOut(500);
        
        // hide the full leaderboard
        } else {
            $(this).addClass('myvotes').text('View the Leaderboard');
            $('#chooseUr10').removeClass('allvotes');
            
            dbMyVotes.off();
            
            $('#chooseUr10 li').animate({
                'height': '75px'
            }, 1000);
            $('#myvotes .vv_place').animate({
                'padding-top': '0.6em'
            }, 1000);
            $('#myvotes .vv_info .flag').animate({
                'width': '100px'
            }, 1000);
            $('#myvotes .myvotes').animate({
                'width': '100%',
                'height': '75px'
            }, 1000);
            $('#myvotes .venuevotes').animate({
                'border-width': '0',
                'width': '0'
            },1000);
            
            $('#chooseUr10 .songcontainer .song').fadeIn(500);
        }
    }); 

// -=-=-=-=- MISC
    function storageAvailable(type) {
        // https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
        var storage;
        try {
            storage = window[type];
            x = '__storage_test__';
            
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        }
        catch(e) {
            return e instanceof DOMException && (
                // everything except Firefox
                e.code === 22 ||
                // Firefox
                e.code === 1014 ||
                // test name field too, because code might not be present
                // everything except Firefox
                e.name === 'QuotaExceededError' ||
                // Firefox
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
                // acknowledge QuotaExceededError only if there's something already stored
                storage.length !== 0;
        }
    }
});