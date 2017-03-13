'use strict';

var Groundskeeper   = require('../lib/groundskeeper');
var winston         = require('winston');

exports.command = 'provision [garden]';
exports.desc = 'for starting or maintaining a garden.  A garden is a collection of integration resources and docker swarms for each environment (dev, testing, etc), all in its own ecosystem (VPC).';
exports.handler = function(argv) {
    var gk = new Groundskeeper(require('config'));
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
    winston.info('Provisioning all resources for the garden named "' + argv.garden + '"');
    gk.provisionUsers(argv.garden)
        .then(function(result) {
            winston.info('Finished provisioning users');
            return gk.provisionVpc(result);
        })
        .then(function(result) {
            winston.info('Finished provisioning VPC');
            return gk.provisionEcr(result)
        })
        .then(function(result) {
            winston.info('Finished provisioning ECR');
            return Promise.all([
                gk.provisionIntegrationResources(result),
                gk.provisionEcs(result)
            ]);
        })
        .then(function(result) {
            winston.info('Finished provisioning integration resources and ECS');
            winston.warn('If you need to remove CloudFormation stacks and the AWS resources created with this project, please do so via the AWS console at https://console.aws.amazon.com/cloudformation/home')
        })
        .catch(function(error) {
            winston.error(error);
            process.exit(1);
        });

}