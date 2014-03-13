define('requests',
    ['cache', 'defer', 'log', 'settings', 'utils'],
    function(cache, defer, log, settings, utils) {

    var console = log('req');

    var hooks = {};
    function callHooks(event, data) {
        if (!(event in hooks)) {
            return;
        }
        for (var i = 0, e; e = hooks[event][i++];) {
            e.apply(e, data);
        }
    }

    function _is_obj(obj) {
        return obj && obj.constructor === Object;
    }

    function _has_object_props(obj) {
        for (var i in obj) {
            if (obj.hasOwnProperty(i) && _is_obj(obj[i])) {
                return true;
            }
        }
    }

    function response(xhr, data) {
        var data = xhr.responseText;
        if ((xhr.getResponseHeader('Content-Type') || '').split(';', 1)[0] === 'application/json') {
            try {
                return JSON.parse(data);
            } catch(e) {
                // Oh well.
                return {};
            }
        }
        return data || null;
    }

    function _ajax(type, url, data) {
        var xhr = new XMLHttpRequest();
        var def = defer.Deferred();

        function error() {
            def.reject(xhr, xhr.statusText, xhr.status, response(xhr));
        }

        xhr.addEventListener('load', function() {
            try {
                if (xhr.getResponseHeader('API-Status') === 'Deprecated') {
                    callHooks('deprecated', [xhr]);
                }
            } catch(e) {}

            var statusCode = xhr.status / 100 | 0;
            if (statusCode < 2 || statusCode > 3) {
                return error();
            }

            def.resolve(response(xhr, data), xhr);
        }, false);

        xhr.addEventListener('error', error, false);

        xhr.open(type, url, true);

        var content_type = 'application/x-www-form-urlencoded';
        if (data) {
            if (_is_obj(data) && !_has_object_props(data)) {
                data = utils.urlencode(data);
            } else if (!(data instanceof RawData)) {
                data = JSON.stringify(data);
                content_type = 'application/json';
            } else {
                data = data.toString();
                content_type = 'text/plain';
            }
            xhr.setRequestHeader('Content-Type', content_type);
        }
        xhr.send(data || undefined);

        return def.promise(xhr);
    }

    function ajax(type, url, data) {
        var def = _ajax(type, url, data);
        // then() returns a new promise, so don't return that.
        def.then(function(resp, xhr) {
            callHooks('success', [resp, xhr, type, url, data]);
        }, function(xhr, error, status, resp) {
            callHooks('failure', [xhr, error, status, resp, type, url, data]);
            handle_errors(xhr, type, status);
        });
        return def;
    }

    function get(url, nocache, persistent) {
        var cached;
        if (!nocache) {
            if (settings.offline_cache_enabled) {
                persistent = true;
            }
            if (cache.has(url)) {
                // When we can, we always fetch from local, in-memory cache.
                console.log('GETing from cache', url);
                cached = cache.get(url);
            } else if (cache.persist.has(url) && persistent && !nocache) {
                // If there's a local cache miss, try the persistent cache.
                console.log('GETing from persistent cache', url);
                cached = cache.persist.get(url);
            }
        }

        var def;

        if (cached) {
            //console.error('-',cache.persist.get(url))
            def = defer.Deferred()
                       .resolve(cached)
                       .promise({__cached: true});
            if (!settings.offline_cache_enabled) {
                // If we're doing offline persistent cache, we still want to
                // make the request so the cache gets updated. Otherwise,
                // we have what we need from the local cache, so let's stop.
                return def;
            }

        }

        ajax('GET', url).done(function(data, xhr) {
            console.log('GOT', url);
            if (!nocache) {
                cache.set(url, data);
                if (persistent) cache.persist.set(url, data);
            }
        });

        if (settings.offline_cache_enabled) {
            return def;
        }
    }

    function handle_errors(xhr, type, status) {
        console.log('Request failed:', type, status);
        if (xhr.responseText) {
            try {
                var data = JSON.parse(xhr.responseText);
                if ('error_message' in data) {
                    console.log('Error message: ', data.error_message);
                } else {
                    console.log('Response data: ', xhr.responseText);
                }
            } catch(e) {}
        }
    }

    function del(url) {
        console.log('DELETing', url);
        return ajax('DELETE', url).done(function() {
            console.log('DELETEd', url);
        });
    }

    function patch(url, data) {
        console.log('PATCHing', url);
        return ajax('PATCH', url, data).done(function() {
            console.log('PATCHed', url);
        });
    }

    function post(url, data) {
        console.log('POSTing', url);
        return ajax('POST', url, data).done(function() {
            console.log('POSTed', url);
        });
    }

    function put(url, data) {
        console.log('PUTing', url);
        return ajax('PUT', url, data).done(function() {
            console.log('PUT', url);
        });
    }

    function Pool() {
        console.log('Opening pool');
        var requests = [];
        var req_map = {};

        var def = defer.Deferred();
        var initiated = 0;
        var marked_to_finish = false;
        var closed = false;
        var failed = false;

        function finish() {
            if (closed) {
                return;
            }
            if (!initiated && marked_to_finish) {
                console.log('Closing pool');
                closed = true;

                // Resolve the deferred whenevs.
                setTimeout(failed ? def.reject : def.resolve, 0);
            }
        }

        this.finish = function() {
            marked_to_finish = true;
            finish();
        };

        function make(func, args) {
            var req = func.apply(this, args);
            initiated++;
            requests.push(req);
            req.fail(function() {
                failed = true;
            });
            req.always(function() {
                initiated--;
                finish();
            });
            return req;
        }

        this.get = function(url) {
            if (url in req_map) {
                return req_map[url];
            }
            var req = make(get, arguments);
            req_map[url] = req;
            return req;
        };
        this.del = function() {return make(del, arguments);};
        this.patch = function() {return make(patch, arguments);};
        this.post = function() {return make(post, arguments);};
        this.put = function() {return make(put, arguments);};

        this.abort = function() {
            for (var i = 0, request; request = requests[i++];) {
                if (request.abort === undefined || request.readyState === 4) {
                    continue;
                }
                request.abort();
            }
            def.reject();
        };

        def.promise(this);
    }

    function on(event, callback) {
        (hooks[event] = hooks[event] || []).push(callback);
        return {'on': on};  // For great chaining.
    }

    function RawData(data) {
        this.data = data;
        this.toString = function() {
            return this.data;
        };
    }

    return {
        get: get,
        post: post,
        del: del,
        put: put,
        patch: patch,
        pool: function() {return new Pool();},
        on: on,
        RawData: RawData,
        // This is for testing purposes.
        _set_xhr: function(func) {_ajax = func;}
    };
});
