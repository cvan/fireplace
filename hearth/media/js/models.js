define('models', ['cache', 'defer', 'log', 'requests', 'settings', 'underscore'], function(cache, defer, log, requests, settings, _) {

    var console = log('model');

    // {'type': {'<id>': object}}
    var data_store = cache;
    if (settings.offline_cache_enabled) {
        data_store = cache.persist;
    }

    var prototypes = settings.model_prototypes;

    return function(type) {
        if (!(type in prototypes)) {
            throw new Error('Unknown model "' + type + '"');
        }

        if (!data_store.has(type)) {
            // Where's defaultdict when you need it
            data_store.set(type, {});
        }

        var key = prototypes[type];

        function cast(data) {
            function do_cast(data) {
                var keyed_value = data[key];
                data_store.set(type + ':' + keyed_value, data);
                console.log('Stored ' + keyed_value + ' as ' + type);
            }
            if (_.isArray(data)) {
                _.each(data, do_cast);
                return data;
            }
            return do_cast(data), data;
        }

        function uncast(object) {
            function do_uncast(object) {
                return data_store.get(type + ':' + object[key]);
            }
            if (_.isArray(object)) {
                return object.map(do_uncast);
            }
            return do_uncast(object);
        }

        function get(url, keyed_value, getter) {
            getter = getter || requests.get;

            if (keyed_value) {
                var cached = data_store.get(type + ':' + keyed_value);
                if (cached) {
                    // Call the `.done()` function back in `request()`.
                    console.log('Found ' + type + ' with key ' + keyed_value);
                    return defer.Deferred()
                                .resolve(cached)
                                .promise({__cached: true});
                }

                console.log(type + ' cache miss for key ' + keyed_value);
            }

            return getter(url);
        }

        function lookup(keyed_value, by) {
            if (by) {
                var item = data_store.get(type + ':' + key);
                if (by in item && item[by] === keyed_value) {
                    return item;
                }
                return;
            }
            if (keyed_value in data_store.get(type)) {
                console.log('Found ' + type + ' with lookup key ' + keyed_value);
                return data_store.get(type + ':' + keyed_value);
            }

            console.log(type + ' cache miss for key ' + keyed_value);
        }

        function purge() {
            // TODO: IDK?
            data_store.purge(type);
        }

        function del(keyed_value, by) {
            if (by) {
                var instance = lookup(keyed_value, by);
                if (!instance) {
                    console.error('Could not find model cache entry to delete.');
                    return;
                }
                keyed_value = instance[key];
            }
            data_store.bust(type + ':' + keyed_value);
        }

        return {
            cast: cast,
            uncast: uncast,
            get: get,
            lookup: lookup,
            purge: purge,
            del: del
        };
    };

});
