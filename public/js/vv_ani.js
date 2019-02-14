    // add a song to your leaderboard
    $('#overlay').on('click', '.songcontainer', function() {
        var chosen = $(this).clone();
        
        // only add a song to the leaderboard once
        $('#chooseUr10 li').each(function() {
            if ( $(this).find('.myvotes .songcontainer').attr('id') == chosen.attr('id') ) {
                $(this).find('.myvotes .vv_info').html('Select a song!');
            }
        });
        
        // check for full leaderboard display
        if ( !$('#toggle_leaders').hasClass('myvotes') ) {
            chosen.find('.song').css({'display': 'none'});
            chosen.find('.flag').css({'width': '100%'});
        }
        
        $(pointsto).find('.myvotes .vv_info').html(chosen);
        
        $('body').removeClass('noscroll');
        $('#overlay').fadeOut(500);
    });