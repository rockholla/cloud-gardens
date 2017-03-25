'use strict';

var Gardens     = require('../lib');
var winston     = require('winston');
var config      = require('config');
var inquirer    = require('inquirer');

exports.command = 'raze [garden]';
exports.desc = 'for completely destroying an existing garden.';

exports.handler = function(argv) {
    try {
        Gardens.validateName(argv.garden);
    } catch (error) {
        return winston.error(error);
    }
    inquirer.prompt([{
        name: "confirmed",
        message: "Are you sure you want to completely destroy the garden named '" + argv.garden + "'?",
        type: "confirm"
    }]).then(function(answer) {
        if (answer.confirmed) {
            if (argv.cloud == 'aws') exports.awsHandler(argv);
            else if (argv.cloud == 'digitalocean') exports.digitaloceanHandler(argv);
        }
    });
}

exports.awsHandler = function(argv) {

    var gardener    = new Gardens.Aws.Gardener(argv.profile, argv.region);
    var keyName     = argv.garden + gardener.keyNameSuffix;
    var stateBucket  = null;

    try {
        Gardens.Aws.validateArgs(argv);
    } catch (error) {
        return winston.error(error);
    }

    winston.info('Razing the garden named "' + argv.garden + '"');
    winston.info('Getting AWS account ID');
    gardener.getAccountId()
        .then(function(result) {
            winston.info('Ensuring that the state storage bucket exists');
            stateBucket = result + gardener.stateBucketSuffix
            return gardener.createS3Bucket(stateBucket);
        })
        .then(function(result) {
            return gardener.terraform('destroy', stateBucket, {
                'name': argv.garden,
                'domain': config.domain,
                'key_name': keyName
            });
        })
        .then(function(result) {
            winston.info("Done razing the garden");
            winston.warn("Some resources created during gardening are left intact after a raze:");
            winston.warn("    S3 Bucket: " + stateBucket);
            winston.warn("    EC2 Key Pairs");
            winston.warn("    Route53 Zones");
            winston.warn("You'll need to delete those manually through the AWS console if necessary");
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