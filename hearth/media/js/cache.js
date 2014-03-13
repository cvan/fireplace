define('cache',
    ['log', 'rewriters', 'settings', 'storage', 'user', 'z'],
    function(log, rewriters, settings, storage, user, z) {

    var console = log('cache');

    var cache = {};
    var cache_key = 'request_cache';

    if (settings.offline_cache_enabled()) {
        cache = JSON.parse(storage.getItem(cache_key) || '{}');
        clear_expired();
    }
    window.cache=cache;

    // Persist the cache for whitelisted URLs.
    // window.addEventListener('beforeunload', save, false);
    // z.page.on('loaded', save);

    function get_ttl(url) {
        var ttl = null;
        Object.keys(settings.offline_cache_whitelist).some(function (pattern) {
            if ((new RegExp(pattern)).test(url)) {
                // Convert from seconds to microseconds.
                return ttl = settings.offline_cache_whitelist[pattern] * 1000;
            }
        });
        return ttl;
    }

    function save() {
        if (!settings.offline_cache_enabled()) {
            return;
        }

        var cacheToSave = {};
        Object.keys(cache).forEach(function (url) {
            // If there is a TTL assigned to this URL, then we can cache it.
            if (get_ttl(url) !== null) {
                cacheToSave[url] = cache[url];
            }
        });

        // Persist only if the data has changed.
        var cacheToSaveJSON = JSON.stringify(cacheToSave);
        if (storage.getItem(cache_key) !== cacheToSaveJSON) {
            storage.setItem(cache_key, cacheToSaveJSON);
            console.log('Persisting request cache');
        }
    }

    function clear_signed() {
        // This gets called when a user logs out, so we remove any requests
        // with user data in them.

        // First, we remove every signed URL from the request cache.
        Object.keys(cache).forEach(function (url) {
            if (url.indexOf('_user=' + user.get_token()) !== -1) {
                console.log('Removing signed URL', url);
                delete cache[url];
            }
        });

        // Then, we persist the cache.
        save();
    }

    function clear_expired() {
        // This gets called once when the page loads to purge any expired
        // persisted responses.

        var item;
        var now = +new Date();
        var ttl = null;

        Object.keys(cache).forEach(function (url) {
            // Get the TTL if this URL is allowed to be cached.
            ttl = get_ttl(url);

            item = cache[url];

            // If the item is expired, remove it from the cache.
            if (!item.__time || item.__time + ttl <= now) {
                console.log('Removing expired URL', url);
                return delete cache[url];
            }
            // delete cache[url];
        });

        save();
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
        clear_signed: clear_signed,
        has: has,
        get: get,
        save: save,
        set: set,
        bust: bust,
        purge: purge,

        attemptRewrite: rewrite,
        raw: cache,

        persist: persistent
    };
});
