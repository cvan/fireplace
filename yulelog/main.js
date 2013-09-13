(function() {

    // No trailing slash, please.
    var MKT_URL = 'https://marketplace.firefox.com';

    var webactivities = !!(window.setMessageHandler || window.mozSetMessageHandler);

    if (navigator.mozSetMessageHandler) {
        // Load up an app.
        navigator.mozSetMessageHandler('marketplace-app', function(req) {
            var url = '';
            var slug = req.source.data.slug;
            var manifest_url = req.source.data.manifest_url || req.source.data.manifest;
            if (slug) {
                url = '/app/' + slug + '?src=webactivities';
            } else if (manifest_url) {
                url = '/search/?q=:manifest=' + manifest_url + '&src=webactivities';
            }
            e = document.createElement('div');
            e.innerHTML = url;
            document.body.appendChild(e);
        });

        // Load up the page to leave a rating for the app.
        navigator.mozSetMessageHandler('marketplace-app-rating', function(req) {
            var slug = req.source.data.slug;
            z.page.trigger('navigate', [urls.reverse('app/ratings/add', [slug])]);
        });

        // Load up a category page.
        navigator.mozSetMessageHandler('marketplace-category', function(req) {
            var slug = req.source.data.slug;
            z.page.trigger('navigate', [urls.reverse('category', [slug])]);
        });

        // Load up a search.
        navigator.mozSetMessageHandler('marketplace-search', function(req) {
            var query = req.source.data.query;
            z.page.trigger('search', {q: query});
        });
    }
    // e = document.createElement('div');
    // e.innerHTML = 'no' + (navigator.mozSetMessageHandler || 'nope');
    // document.body.appendChild(e);

    var qs = '';
    try {
        var conn = navigator.mozMobileConnection;
        if (conn) {
            // `MCC`: Mobile Country Code
            // `MNC`: Mobile Network Code
            // `lastKnownHomeNetwork`: `{MCC}-{MNC}` (SIM's origin)
            // `lastKnownNetwork`: `{MCC}-{MNC}` (could be different network if roaming)
            var network = (conn.lastKnownHomeNetwork || conn.lastKnownNetwork || '-').split('-');
            qs = '?mcc=' + (network[0] || '') + '&mnc=' + (network[1] || '');
            console.log('lastKnownNetwork', conn.lastKnownNetwork);
            console.log('lastKnownHomeNetwork', conn.lastKnownHomeNetwork);
            console.log('MCC: "' + network[0] + '"');
            console.log('MNC: "' + network[1] + '"');
        }
    } catch(e) {
        // Fail gracefully if `navigator.mozMobileConnection` gives us problems.
    }
    var iframeSrc = MKT_URL + '/' + qs;
    var i = document.createElement('iframe');
    i.seamless = true;
    i.onerror = function() {
        document.body.classList.add('offline');
    };
    i.src = iframeSrc;
    //document.body.appendChild(i);

    // When refocussing the app, toggle the iframe based on `navigator.onLine`.
    window.addEventListener('focus', toggleOffline, false);

    function toggleOffline(init) {
        console.log('Checking for network connection...')
        if (navigator.onLine === false) {
            // Hide iframe.
            console.log('Network connection not found; hiding iframe ...');
            document.body.classList.add('offline');
        } else {
            // Show iframe.
            console.log('Network connection found; showing iframe ...');
            if (!init) {
                // Reload the page to reload the iframe.
                window.location.reload();
            }
        }
    }

    toggleOffline(true);

    document.querySelector('.try-again').addEventListener('click', function(e) {
        toggleOffline();
    }, false);

    var languages = ['cs', 'de', 'en-US', 'es', 'fr', 'ga-IE', 'it', 'pl', 'pt-BR'];

    var lang_expander = {
        en: 'en-US',
        pt: 'pt-BR'
    };

    function get_locale(locale) {
        if (languages.indexOf(locale) !== -1) {
            return locale;
        }
        locale = locale.split('-')[0];
        if (languages.indexOf(locale) !== -1) {
            return locale;
        }
        if (locale in lang_expander) {
            locale = lang_expander[locale];
            if (languages.indexOf(locale) !== -1) {
                return locale;
            }
        }
        return 'en-US';
    }
    var qs_lang = /[\?&]lang=([\w\-]+)/i.exec(window.location.search);
    var locale = get_locale((qs_lang && qs_lang[1]) || navigator.language);

    var translations = {
        'offline-message': {
            'cs': 'Omlouváme se, ale pro přístup k Marketplace musíte být online.',
            'de': 'Es tut uns Leid, Sie müssen online sein, um auf den Marktplatz zugreifen zu können.',
            'es': 'Disculpa, debes tener una conexión a internet para acceder al Marketplace.',
            'fr': 'Désolé, vous devez être en ligne pour accéder au Marketplace.',
            'it': 'Devi essere in linea per accedere al Marketplace.',
            'pl': 'Przepraszamy, musisz być online, by mieć dostęp do Marketplace.',
            'pt-BR': 'Lamentamos, mas você precisa estar on-line para acessar o Marketplace.'
        },
        'try-again': {
            'cs': 'Zkusit znovu',
            'de': 'Erneut versuchen',
            'es': 'Probar de nuevo',
            'fr': 'Réessayer',
            'it': 'Prova di nuovo',
            'pl': 'Spróbuj ponownie',
            'pt-BR': 'Tente novamente'
        }
    };

    var transName;
    var transBlocks = document.querySelectorAll('[data-l10n]');
    for (var i = 0; i < transBlocks.length; i++) {
        transName = transBlocks[i].dataset.l10n;
        if (locale in translations[transName]) {
            transBlocks[i].innerHTML = translations[transName][locale];
        }
    }

})();
