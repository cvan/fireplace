var cp = require('child_process');
var fs = require('fs');

var Promise = require('es6-promise').Promise;


const repoDir = 'fireplace-repo';

if (!fs.existsSync('build')) {
    fs.mkdir('build');
}


function build(rev) {
    return new Promise(function (resolve, reject) {
        rev = rev || 'master';

        function cpe(command, options, msg) {
            if (msg) {
                console.log(msg);
            }
            //console.log('> ' + command + '\n');
            return new Promise(function (resolve, reject) {
                function cb(error, stdout, stderr) {
                    if (error) {
                        console.error(error);
                        console.error(stderr);
                        reject(error);
                    } else {
                        //console.log('output', stdout);
                        resolve(stdout);
                    }
                }
                var proc = cp.exec(command, options, cb);
                proc.on('error', function() {
                    console.error(arguments);
                    reject(arguments);
                });
                proc.on('exit', function(code) {
                    if (code !== 0) {
                        console.error('Bad error code:', code);
                        reject(code);
                    }
                });
            });
        }

        function zip() {
            return new Promise(function (resolve, reject) {
                console.log('Removing old package.zip');
                try {
                    fs.unlinkSync('build/package.zip');
                } catch(e) {
                    console.log('No package.zip to remove');
                }
                cpe('cd hearth/ && zip -r ../../package.zip *', optsRepo).then(function (data) {
                    resolve(data);
                }).catch(function (err) {
                    reject(err);
                });
            });
        }

        var optsBuild = {cwd: 'build/'};
        var optsRepo = {cwd: 'build/' + repoDir + '/'};

        var commands = [
            cpe('rm -rf ' + repoDir, optsBuild),
            cpe('git clone git://github.com/mozilla/fireplace.git ' + repoDir, optsBuild,
                'Cloning git repo'),
            // cpe('pushd ' + repoDir + ' && git checkout ' + rev + ' && popd', optsBuild,
            //     'Checking out revision ' + rev),
cpe('echo $(pwd) > pwd', optsRepo),
cpe('npm install', optsRepo),
            // cpe('mv hearth/media/js/settings_inferno.js hearth/media/js/settings_local.js', optsRepo,
            //     'Swapping in inferno settings'),
            // cpe('commonplace includes', optsRepo,
            //     'Running commonplace includes'),
            // cpe('commonplace langpacks', optsRepo,
            //     'Running commonplace langpacks'),
            // cpe('mv hearth/server.html hearth/index.html', optsRepo,
            //     'Renaming server.html to index.html'),
            // cpe('rm -f hearth/media/fonts/', optsRepo,
            //     'Removing unnecessary fonts'),
            // cpe('rm -f hearth/media/css/*.styl', optsRepo,
            //     'Removing unnecessary stylus files'),
            // cpe('rm -f hearth/templates hearth/tests', optsRepo,
            //     'Removing raw templates and tests'),
            // zip(),

            // TODO: Remove every CSS file except `splash.css` and `include.css`.
            // TODO: Remove every JS file except `include.js`.
            // TODO: Remove every image that's not in `imgurls.txt`.
            // Remove `build_id.txt`.
            // Remove `imgurls.txt`.
        ];

        Promise.all(commands).then(function (data) {
            console.log('Done');
            resolve(data);
            //client.say('#amo-bots', "Fireplace was updated on inferno");
            //client.say('#amo-bots', "https://inferno.paas.allizom.org/");
        }).catch(function (err) {
            console.error('Error:', err);
            reject(err);
            //client.say('#amo-bots', "Fireplace update failed on inferno");
            //client.say('#amo-bots', "https://inferno.paas.allizom.org/");
        });
    });
}

module.exports.build = build;
module.exports.repoDir = repoDir;
