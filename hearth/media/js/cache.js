define('cache',
    ['log', 'rewriters', 'settings', 'storage'],
    function(log, rewriters, settings, storage) {

    var console = log('cache');

    var cache_key = 'request_cache';
    var cache = {};
    if (settings.offline_cache_enabled()) {
        cache = JSON.parse(storage.getItem(cache_key) || '{}');
    }

    function save() {
        if (!settings.offline_cache_enabled()) {
            return;
        }

        var cacheToSave = {};
        var doSave = false;

        Object.keys(cache).forEach(function (key) {
            doSave = false;

            // Check if this URL is allowed to be cached.
            settings.cache_whitelist.some(function (pattern) {
                if ((new RegExp(pattern)).test(key)) {
                    return doSave = true;
                }
            });

            // If it is, let's add it to the list to persist.
            if (doSave) {
                cacheToSave[key] = cache[key];
            }
        });

        storage.setItem(cache_key, JSON.stringify(cacheToSave));
    }

    function has(key) {
        return key in cache;
    }

    function get(key) {
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
        save();
    }

    function set(key, value) {
        for (var i = 0, rw; rw = rewriters[i++];) {
            var output = rw(key, value, cache);
            if (output === null) {
                return;
            } else if (output) {
                value = output;
            }
        }
        cache[key] = value;
        save();
    }

    function bust(key) {
        console.log('Busting cache for ', key);
        if (key in cache) {
            delete cache[key];
        }
        save();
    }

    var persistentCachePrefix = 'cache.persist::';
    var persistent = {
        // This uses localStorage for persistent storage of cache entries.
        get: function(key) {
            if (has(key)) {
                return get(key);
            } else if (key in storageKeys) {
                var val = storage.getItem(persistentCachePrefix + key);
                set(key, val);
                return val;
            }
        },
        set: function(key, val) {
            storage.setItem(persistentCachePrefix + key, val);
            set(key, val);
        },
        bust: function(key) {
            if (key in storageKeys) {
                storage.removeItem(persistentCachePrefix + key);
            }
            bust(key);
        },
        has: function(key) {
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
