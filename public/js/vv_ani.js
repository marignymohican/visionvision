function addsong(song,target) {
    $('.slideaway').remove();
    $('.songadded').removeClass('songadded');

    let chosen = $(song).children('.songcontainer').eq(0).clone();
    
    // only add a song to the leaderboard once
    $('#chooseUr10 li').each(function() {
        if ( $(this).find('.myvotes .songcontainer').attr('id') == chosen.attr('id') ) {
            $(this).find('.myvotes .vv_info').html('<span class="sAs">Select a song!</span>');
        }
    });
    
    let slideaway = $('<div class="slideaway" />');
    $(song).prepend(slideaway);
    slideaway.addClass('doslide');
    $('#overlay').delay(400).fadeOut(500, () => {
        slideaway.removeClass('doslide');
        $(target + ' .myvotes .vv_info').html(slideaway);
        
        $(target + ' .myvotes .vv_info').append(chosen);
        $(target + ' .myvotes .vv_info .slideaway').addClass('doslide');
    });

    $(target + ' .myvotes').addClass('songadded');
}

// get document coordinates of the element
function getCoords(elem) {
  let box = elem.getBoundingClientRect();

  return {
    top: box.top + pageYOffset,
    left: box.left + pageXOffset
  };
}