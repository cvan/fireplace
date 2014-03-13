define('models', ['defer', 'log', 'requests', 'settings', 'storage', 'underscore'], function(defer, log, requests, settings, storage, _) {

    var console = log('model');

    // {'type': {'<id>': object}}
    var cache_key = 'model_cache';
    var data_store = {};
    if (settings.offline_cache_enabled()) {
        data_store = JSON.parse(storage.getItem(cache_key) || '{}');
    }

    function save() {
        storage.setItem(cache_key, JSON.stringify(data_store));
    }

    var prototypes = settings.model_prototypes;

    return function(type) {
        if (!(type in prototypes)) {
            throw new Error('Unknown model "' + type + '"');
        }

        if (!(type in data_store)) {
            // Where's defaultdict when you need it
            data_store[type] = {};
            save();
        }

        var key = prototypes[type];

        function cast(data) {
            function do_cast(data) {
                var keyed_value = data[key];
                data_store[type][keyed_value] = data;
                save();
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
                return data_store[type][object[key]];
            }
            if (_.isArray(object)) {
                return object.map(do_uncast);
            }
            return do_uncast(object);
        }

        function get(url, keyed_value, getter, nocache, persistent) {
            getter = getter || requests.get;

            if (keyed_value) {
                if (keyed_value in data_store[type]) {
                    // Call the `.done()` function back in `request()`.
                    console.log('Found ' + type + ' with key ' + keyed_value);
                    return defer.Deferred()
                                .resolve(data_store[type][keyed_value])
                                .promise({__cached: true});
                }

                console.log(type + ' cache miss for key ' + keyed_value);
            }

            return getter(url, nocache, persistent);
        }

        function lookup(keyed_value, by) {
            if (by) {
                for (var key in data_store[type]) {
                    var item = data_store[type][key];
                    if (by in item && item[by] === keyed_value) {
                        return item;
                    }
                }
                return;
            }
            if (keyed_value in data_store[type]) {
                console.log('Found ' + type + ' with lookup key ' + keyed_value);
                return data_store[type][keyed_value];
            }

            console.log(type + ' cache miss for key ' + keyed_value);
        }

        function purge() {
            data_store[type] = [];
            save();
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
            delete data_store[type][keyed_value];
            save();
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
