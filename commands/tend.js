'use strict';

var Gardens         = require('../lib');
var winston         = require('winston');
var config          = require('config');
var afterCreateKey  = require('./create-key').callback;
var Promise         = require('bluebird');

exports.command = 'tend [garden]';
exports.desc = 'for starting or maintaining a garden.  A garden is a collection of integration resources and application environments (dev, testing, etc), all in its own cloud ecosystem.';

exports.handler = function(argv) {
    if (!argv.garden || !argv.garden.match(/[a-zA-Z\-_]+/)) return winston.error('Please provide a valid garden name, with allowed pattern [a-zA-Z\\-_]+');
    if (argv.cloud != 'aws') {
        return winston.error("Only AWS is supported right now");
    }
    if (argv.cloud == 'aws') exports.awsHandler(argv);
}

exports.awsHandler = function(argv) {

    var gardener = new Gardens.Aws.Gardener(config);
    var key      = argv.garden + '-key';

    winston.info('Tending all resources for the garden named "' + argv.garden + '"');
    gardener.createKey(key)
        .then(function(result) {
            if (result.includes('already exists')) {
                winston.warn(result);
            } else {
                afterCreateKey(key, result);
            }
            return gardener.terraform(argv.garden, key, (argv.dryrun ? 'plan' : 'apply'));
        })
        .then(function(result) {
            winston.info("DONE tending the garden");
        })
        .catch(function(error) {
            winston.error(error);
            process.exit(1);
        });

}