'use strict';

var path        = require('path');
var Gardens     = require(path.join('..', 'lib'));
var winston     = require('winston');
var config      = require('config');
var inquirer    = require('inquirer');

exports.command = 'view [garden]';
exports.desc = 'for getting a quick look at the state of a garden';

exports.handler = function(argv) {
    try {
        Gardens.validateName(argv.garden);
    } catch (error) {
        return winston.error(error);
    }
    if (argv.cloud == 'aws') exports.awsHandler(argv);
    else if (argv.cloud == 'digitalocean') exports.digitaloceanHandler(argv);
}

exports.awsHandler = function(argv) {

    var gardener    = new Gardens.Aws.Gardener(argv.profile, argv.region);
    var stateBucket = null;
    var graphLoc    = null;

    try {
        Gardens.Aws.validateArgs(argv);
    } catch (error) {
        return winston.error(error);
    }

    winston.info('About to get a look at the garden named "' + argv.garden + '"');
    gardener.terraformPrep(config.domain).then(function(result) {
            stateBucket = result.stateBucket;
            return gardener.terraform('output', stateBucket, { name: argv.garden });
        }).then(function(result) {
            graphLoc = path.resolve(__dirname, '..', '.graphs', argv.garden + '.png');
            return gardener.terraform('graph | dot -Tpng > ' + graphLoc, stateBucket, { name: argv.garden });
        }).then(function(result) {
            winston.info('A graph of resources has been saved to ' + graphLoc);
        }).catch(function(error) {
            winston.error(error);
            process.exit(1);
        });
}

exports.digitaloceanHandler = function(argv) {
    winston.error("Only AWS is supported right now");
    process.exit(1);
}