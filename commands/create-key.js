'use strict';

var fs          = require('fs');
var path        = require('path');
var winston     = require('winston');
var Gardens     = require(path.join('..', 'lib'));
var config      = require('config');
var mkdirp      = require('mkdirp');

exports.command = 'create-key [garden] [name]';
exports.desc = 'creates a new ssh key, pushes it to the cloud provider as an accepted key, and saves the private key locally';
exports.callback = function(profile, garden, name, content) {
  var keyPath = path.resolve(path.join(__dirname, '..', '.gardens', profile, garden, '.keys'));
  mkdirp.sync(keyPath);
  keyPath = path.join(keyPath, name);
  fs.writeFile(keyPath, content, function(err) {
    if (err) return winston.error(err);
    fs.chmodSync(keyPath, '0600');
    winston.warn("IMPORTANT: new key has been saved to " + keyPath + ", make sure you put it in a safe place.  You won't be able to recover it.");
  });
};
exports.handler = function(argv) {
  if (!argv.garden || !argv.name) {
    winston.error('you have to provide both a garden argument where the key will live, and the name of the key');
    process.exit(1);
  }
  if (argv.cloud == 'aws') exports.awsHandler(argv);
  else if (argv.cloud == 'digitalocean') exports.digitaloceanHandler(argv);
};
exports.awsHandler = function(argv) {
  (new Gardens.Aws.Gardener(argv.profile, argv.region)).createKey(argv.name).then(function(result) {
    if (result.warning) {
      winston.warn(result.warning);
    } else {
      exports.callback(argv.profile, argv.garden, result.name, result.content);
    }
  }).catch(function(error) {
    winston.error(error);
  });
};
exports.digitaloceanHandler = function(argv) {
  winston.error("Only AWS is supported right now");
  process.exit(1);
}