'use strict';

var Gardens         = require('../lib');
var winston         = require('winston');
var afterCreateKey  = require('./create-key').callback;
var config          = require('config');

exports.command = 'tend [garden]';
exports.desc = 'for starting or maintaining a garden.  A garden is a collection of integration resources and application environments (dev, testing, etc), all in its own cloud ecosystem.';

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
    var keyName     = argv.profile + '-' + argv.garden + gardener.keyNameSuffix;
    var stateBucket = null;
    var nameServers = null;

    try {
        Gardens.Aws.validateArgs(argv);
    } catch (error) {
        return winston.error(error);
    }

    winston.info('Tending all resources for the garden named "' + argv.garden + '"');
    gardener.createKey(keyName)
        .then(function(result) {
            if (result.includes('already exists')) {
                winston.warn(result);
            } else {
                afterCreateKey(keyName, result);
            }
            winston.info('Getting AWS account ID');
            return gardener.getAccountId();
        })
        .then(function(result) {
            winston.info('Ensuring that the state storage bucket exists');
            stateBucket = result + gardener.stateBucketSuffix;
            return gardener.createS3Bucket(stateBucket);
        })
        .then(function(result) {
            winston.info('Ensuring that our hosted zone exists for the domain');
            return gardener.createHostedZone(config.domain);
        })
        .then(function(result) {
            nameServers = result.DelegationSet.NameServers;
            return gardener.terraform((argv.dryrun ? 'plan' : 'apply'), stateBucket, {
                'name': argv.garden,
                'domain': config.domain,
                'key_name': keyName
            });
        })
        .then(function(result) {
            winston.info("Done tending the garden");
            winston.info("Name servers:");
            nameServers.forEach(function(nameServer) {
                winston.info(`    ${nameServer}`);
            });
            winston.info("You should make sure the registrar for your domain is updated to point to the name servers above.")
        })
        .catch(function(error) {
            winston.error(error);
            process.exit(1);
        });

}

exports.digitaloceanHandler = function(argv) {
    winston.error("Only AWS is supported right now");
    process.exit(1);
}