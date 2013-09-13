define('webactivities', ['capabilities', 'log', 'urls', 'z'], function(capabilities, log, urls, z) {

    var console = log('webactivities');

    function handleActivity(name, data) {
        switch (name) {
            case 'marketplace-app':
                // Load up an app detail page.
                var slug = data.slug;
                var manifest_url = data.manifest_url || data.manifest;
                if (slug) {
                    z.page.trigger('navigate', [urls.reverse('app', [slug]) + '?src=webactivities']);
                } else if (manifest_url) {
                    z.page.trigger('search', {q: ':manifest=' + manifest_url, src: 'webactivities'});
                }
                break;
            case 'marketplace-app-rating':
                // Load up the page to leave a rating for the app.
                z.page.trigger('navigate', [urls.reverse('app/ratings/add', [data.slug])]);
                break;
            case 'marketplace-category':
                // Load up a category page.
                z.page.trigger('navigate', [urls.reverse('category', [data.slug])]);
                break;
            case 'marketplace-search':
                // Load up a search.
                z.page.trigger('search', {q: data.query});
                break;
        }
    }

    // if (capabilities.webactivities) {
    //     navigator.mozSetMessageHandler('activity', function(req) {
    //         handleActivity(req.source.name, req.source.data);
    //     });
    // }

    window.addEventListener('message', function(e) {
        // if (e.origin !== 'http://localhost:7003') {  // https://marketplace.firefox.com
        //     console.log('Ignored post message from ' + e.origin + ': ' + e.data);
        //     return;
        // }
        // Receive postMessage from the packaged app and do something with it.
        console.log('Handled post message from ' + e.origin + ': ' + e.data);
        if (e.data && e.data.name && e.data.data) {
            handleActivity(e.data.name, e.data.data);
        }
    }, false);

    if (window.self !== window.top) {
        // If the Marketplace is being iframed, tell the parent window
        // (the packaged app) we've been successfully loaded.
        // The origin is app://marketplace.firefox.com but origins work only
        // in Firefox OS 1.1.
        window.top.postMessage('loaded', '*');
    }

});
