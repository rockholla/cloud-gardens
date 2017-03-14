'use strict';

var Groundskeeper   = require('../lib/groundskeeper');
var winston         = require('winston');
var config          = require('config');

exports.command = 'provision [garden]';
exports.desc = 'for starting or maintaining a garden.  A garden is a collection of integration resources and docker swarms for each environment (dev, testing, etc), all in its own ecosystem (VPC).';
exports.handler = function(argv) {
    var gk = new Groundskeeper(config);
    gk.config.sshkey = argv.garden + '-key';
    gk.createKeyPair(gk.config.sshkey)
        .catch(function(error) {
            if (error.message && error.message.includes('already exists')) {
                winston.warn(error.message);
            } else {
                winston.error(error);
                process.exit(1);
            }
        });
    var parseResult = function(result) {
        if (result instanceof Array) {
            return result.forEach(function(value) {
                parseResult(value);
            });
        }
        if (result['data'] == gk.disabledStackMessage) {
            winston.warn('Provisioning of the ' + result.type + ' stack is disabled');
        } else {
            winston.info('Finished provisioning the ' + result.type + ' stack');
        }
    };
    winston.info('Provisioning all resources for the garden named "' + argv.garden + '"');
    gk.provisionUsers(argv.garden)
        .then(function(result) {
            parseResult(result);
            return gk.provisionVpc(result);
        })
        .then(function(result) {
            parseResult(result);
            return gk.provisionEcr(result)
        })
        .then(function(result) {
            parseResult(result);
            return Promise.all([
                gk.provisionIntegrationResources(result),
                gk.provisionEcs(result)
            ]);
        })
        .then(function(result) {
            parseResult(result);
        })
        .then(function() {
            winston.warn('If you need to remove CloudFormation stacks and the AWS resources created with this project, please do so via the following AWS console locations:')
            winston.warn('    https://' + config.aws.region + '.console.aws.amazon.com/cloudformation/home?region=' + config.aws.region);
            winston.warn('    https://' + config.aws.region + '.console.aws.amazon.com/ec2/v2/home?region=' + config.aws.region + '#KeyPairs:sort=keyName');
        })
        .catch(function(error) {
            winston.error(error);
            process.exit(1);
        });

}