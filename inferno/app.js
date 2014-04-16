var crypto = require('crypto');
var fs = require('fs');

var express = require('express');
var irc = require('irc');

var utils = require('./utils');


var app = express();

//var client = new irc.Client('irc.mozilla.org', 'infernobot', {channels: ['#amo-bots']});

app.configure(function () {
    app.set('port', process.env.VCAP_APP_PORT || process.env.PORT || 3000);
    app.use(express.logger());
    app.use(express.compress());
    app.use(express.json());
    app.use(express.urlencoded());
});

app.get('/', function(req, res){
    res.send(fs.readFileSync('templates/index.html') + '');
});

function getMinifest(type, res) {
    var manifest = JSON.parse(fs.readFileSync('build/' + utils.repoDir + '/hearth/manifest.webapp'));
    manifest['package_path'] = 'https://inferno.paas.allizom.org/package.zip?type=' + type;

    res.set('Content-Type', 'application/x-web-app-manifest+json');
    res.set('ETag', '"' + getETag(type, null, 'build/package.zip') + '"');
    res.send(JSON.stringify(manifest));
}

app.get('/minifest', function(req, res){
    getMinifest('daily', res);
});
app.get('/minifest/:type', function(req, res){
    getMinifest(req.params.type, res);
});


function getETag(type, data, path) {
    var output = '';
    var now = new Date();
    switch (type) {
        case 'latest':
            var hash = crypto.createHash('md5');
            if (!data) {
                data = fs.readFileSync(path);
            }
            hash.update(data);
            return hash.digest('hex');
        case 'bidaily':
            output += Math.floor(now.getHours() / 12) + '_';
        case 'daily':
            output += now.getDay() + '_';
        case 'weekly':
            output += '_' + Math.floor(now.getDay() / 7);
            break;
    }
    return output + now.getMonth() + '_' + now.getFullYear();
}

app.get('/package.zip', function(req, res){
    var type = req.query.type || 'daily';
    fs.readFile('build/package.zip', function(err, data) {
        res.set('Content-Type', 'application/zip');
        res.set('ETag', '"' + getETag(type, data) + '"');
        res.send(data);
    });
});

app.all('/ping', function(req, res) {
    var rev = 'master';
    var payload = req.body;

    if (payload) {
        try {
            payload = JSON.parse(payload);
        } catch(e) {
        }
        if (payload && payload.after) {
            rev = payload.after;
        }
    }

    console.log('Packaging', rev);

    utils.build(rev).then(function () {
        res.json({
            success: true,
            rev: rev
        });
    }).catch(function (err) {
        res.json({
            error: true,
            rev: rev
        });
    });
});

app.listen(app.get('port'), function () {
    var address = this.address();
    console.log('Starting server at http://' +
                address.address + ':' + address.port);
});

// utils.build();
