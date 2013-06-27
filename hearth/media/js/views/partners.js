define('views/partners', ['l10n'], function(l10n) {
    'use strict';

    var gettext = l10n.gettext;

    return function(builder, args) {
        var partner = args[0];
        var version = args[1];
        var region = args[2];

        var validPartners = ['napster'];

        builder.start('partners.html', {
            partner: partner,
            version: version,
            region: region
        });

        builder.z('type', 'leaf');
        builder.z('title', gettext('Privacy Policy'));
    };
});
