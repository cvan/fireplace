define('views/category', ['capabilities', 'urls', 'utils', 'z'], function(capabilities, urls, utils, z) {
    'use strict';

    return function(builder, args, params) {
        var category = args[0];
        _.defaults(params || {}, {sort: 'popularity'});

        builder.z('type', 'root');
        builder.z('search', params.name || category);
        builder.z('title', params.name || category);

        builder.start('category/main.html', {
            endpoint: urls.api.url('category', [category]),
            category: category,
            category_name: category,
            sort: params.sort
        }).done(function() {setTrays();});
    };
});
