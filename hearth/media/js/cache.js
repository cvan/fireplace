define('cache', ['log', 'rewriters', 'storage'], function(log, rewriters, storage) {

    var console = log('cache');

    var cache = {};
    window.cache = cache;

    function has(key) {
        console.error('cache.has');
        return key in cache;
    }

    function get(key) {
        console.error('cache.get');
        return cache[key];
    }

    function purge(filter) {
        for (var key in cache) {
            if (cache.hasOwnProperty(key)) {
                if (filter && !filter(key)) {
                    continue;
                }
                delete cache[key];
            }
        }
    }

    function set(key, value) {
        console.error('cache.set');
        for (var i = 0, rw; rw = rewriters[i++];) {
            var output = rw(key, value, cache);
            if (output === null) {
                return;
            } else if (output) {
                value = output;
            }
        }
        cache[key] = value;
    }

    function bust(key) {
        console.log('Busting cache for ', key);
        if (key in cache) {
            delete cache[key];
        }
    }

    var persistentCachePrefix = 'cache.persist::';
    var persistent = {
        // This uses localStorage for persistent storage of cache entries.
        get: function(key) {
            if (has(key)) {
                console.error('persistent.get.if');
                return get(key);
            } else {
                console.error('persistent.get.else');
                var val = JSON.parse(storage.getItem(persistentCachePrefix + key));
                console.error('x', JSON.parse(storage.getItem(persistentCachePrefix + key)), '' )
                // debugger;
                if (val.collections) {
                    console.error(val.collections[0].apps[0].id)
                    //console.error(val.collections.operator);
                }
                console.error('1');
                set(key, val);
                console.error('2');
                return val;
            }
        },
        set: function(key, val) {
            console.error('persistent.set');
            storage.setItem(persistentCachePrefix + key, JSON.stringify(val));
            set(key, val);
        },
        bust: function(key) {
            if (key in storageKeys) {
                storage.removeItem(persistentCachePrefix + key);
            }
            bust(key);
        },
        has: function(key) {
            console.error('persistent.has');
            return storage.getItem(persistentCachePrefix + key);
        },
        purge: function() {
            for (var i = 0; i < storage.length; i++) {
                var key = storage.key(i);
                if (key.indexOf(persistentCachePrefix) === 0) {
                    storage.removeItem(persistentCachePrefix + key);
                    bust(key.replace(persistentCachePrefix, ''));
                }
            }
        }
    };

    function rewrite(matcher, worker, limit) {
        console.error('cache.rewrite');
        var count = 0;
        console.log('Attempting cache rewrite');
        for (var key in cache) {
            if (matcher(key)) {
                console.log('Matched cache rewrite pattern for key ', key);
                var rewrittenValue = worker(cache[key], key);
                cache[key] = rewrittenValue;

                // Update persistent cache if the key exists there.
                if (persistent.has(key)) {
                    persistent.set(key, rewrittenValue);
                }
                if (limit && ++count >= limit) {
                    console.log('Cache rewrite limit hit, exiting');
                    return;
                }
            }
        }
    }

    return {
        has: has,
        get: get,
        set: set,
        bust: bust,
        purge: purge,

        attemptRewrite: rewrite,
        raw: cache,

        persist: persistent
    };
});
