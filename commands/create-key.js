'use strict';

var fs              = require('fs');
var path            = require('path');
var winston         = require('winston');
var Groundskeeper   = require('../lib');

exports.command = 'create-key [name]';
exports.desc = 'creates a new ssh key, pushes it to AWS, and outputs the resulting private key value';
exports.callback = function(name, key) {
    var keyPath = path.resolve(path.join(__dirname, '..', '.keys', name + '.pem'));
    fs.writeFile(keyPath, key, function(err) {
        if (err) return winston.error(err);
        fs.chmod(keyPath, '0600');
        winston.warn("IMPORTANT: new key has been saved to " + keyPath + ", make sure you put it in a safe place.  You won't be able to recover it.");
    });
};
exports.handler = function(argv) {
    (new Groundskeeper.Aws.Gardener(require('config'))).createKey(argv.name)
        .then(function(result) {
            exports.callback(argv.name, result)
        })
        .catch(function(result) {
            winston.error(result);
        });
};