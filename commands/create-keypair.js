'use strict';

var fs              = require('fs');
var path            = require('path');
var winston         = require('winston');
var Groundskeeper   = require('../lib/groundskeeper');

exports.command = 'create-keypair [name]';
exports.desc = 'creates a new ssh key, pushes it to AWS, and outputs the resulting private key value';
exports.handler = function(argv) {
    (new Groundskeeper(require('config'))).createKeyPair(argv.name)
        .catch(function(result) {
            winston.error(result);
        });
}