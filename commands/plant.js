'use strict';

var Groundskeeper   = require('../lib');
var winston         = require('winston');
var config          = require('config');
var afterCreateKey  = require('./create-key').callback;
var Promise         = require('bluebird');

exports.command = 'plant [garden]';
exports.desc = 'for starting or maintaining a garden.  A garden is a collection of integration resources and application environments (dev, testing, etc), all in its own ecosystem.';

exports.handler = function(argv) {
    if (argv.location != 'aws') {
        return winston.error("Only AWS is supported right now");
    }
    if (argv.location == 'aws') exports.awsHandler(argv);
}

exports.awsHandler = function(argv) {

    var gardener = new Groundskeeper.Aws.Gardener(config);
    var keyName  = argv.garden + '-key';

    var parseResult = function(result) {
        if (result[0] instanceof Array) {
            return result.forEach(function(value) {
                parseResult(value);
            });
        }
        if (result[2] == gardener.disabledStackMessage) {
            winston.warn('Planting/maintaining ' + result[1] + ' is disabled');
        } else {
            winston.info('Finished planting/maintaining ' + result[1]);
        }
    };

    winston.info('Planting/maintaining all resources for the garden named "' + argv.garden + '"');
    gardener.createKey(keyName)
        .then(function(result) {
            if (result.includes('already exists')) {
                winston.warn(result);
            } else {
                afterCreateKey(keyName, result);
            }
            return gardener.plant(argv.garden, 'users', keyName);
        })
        .then(function(result) {
            parseResult(result);
            return gardener.plant(argv.garden, 'vpc');
        })
        .then(function(result) {
            parseResult(result);
            return Promise.all([
                gardener.plant(argv.garden, 'integration'),
                gardener.plant(argv.garden, 'ecr'),
                gardener.plant(argv.garden, 'ecs')
            ])
        })
        .then(function(result) {
            parseResult(result);
            winston.warn('If you need to remove CloudFormation stacks and the AWS resources created with this project, please do so via the following AWS console locations:')
            winston.warn('    https://' + config.aws.region + '.console.aws.amazon.com/cloudformation/home?region=' + config.aws.region);
            winston.warn('    https://' + config.aws.region + '.console.aws.amazon.com/ec2/v2/home?region=' + config.aws.region + '#KeyPairs:sort=keyName');
        })
        .catch(function(error) {
            winston.error(error);
            process.exit(1);
        });

}