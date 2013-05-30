define('paginator', ['z'], function(z) {

    z.page.on('pointerdown', '.loadmore button', function(e) {
        // Get the button.
        var button = $(this);
        // Get the container.
        var swapEl = button.parents('.loadmore');
        // Show a loading indicator.
        swapEl.addClass('loading');
        swapEl.append('<div class="spinner alt btn-replace">');
    });

});
