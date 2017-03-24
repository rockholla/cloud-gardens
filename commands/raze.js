'use strict';

var Gardens = require('../lib');
var winston = require('winston');
var config  = require('config');

exports.command = 'raze [garden]';
exports.desc = 'for completely destroying an existing garden.';

exports.handler = function(argv) {
    if (!argv.garden || !argv.garden.match(/[a-zA-Z\-_]+/)) return winston.error('Please provide a valid garden name, with allowed pattern [a-zA-Z\\-_]+');
    require('inquirer').prompt([{
        name: "confirmed",
        message: "Are you sure you want to completely destroy the garden named '" + argv.garden + "'?",
        type: "confirm"
    }]).then(function(answers) {
        if (answers.confirmed) {
            if (argv.cloud != 'aws') {
                return winston.error("Only AWS is supported right now");
            }
            if (argv.cloud == 'aws') exports.awsHandler(argv);
        }
    });
}

exports.awsHandler = function(argv) {

    var gardener = new Gardens.Aws.Gardener(argv.profile, argv.region);

    winston.info('Razing the garden named "' + argv.garden + '"');
    winston.info('Getting AWS account ID');
    gardener.getAccountId()
        .then(function(result) {
            winston.info('Ensuring that the state storage bucket exists');
            return gardener.createS3Bucket(result + gardener.stateBucketSuffix);
        })
        .then(function(result) {
            gardener.terraform(argv.garden, 'na', 'destroy', result.name);
        })
        .then(function(result) {
            winston.info("DONE razing the garden");
        })
        .catch(function(error) {
            winston.error(error);
            process.exit(1);
        });
}