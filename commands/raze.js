'use strict';

var Gardens = require('../lib');
var winston = require('winston');
var aws     = require('aws-sdk');

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

    var gardener = new Gardens.Aws.Gardener(aws.config.credentials.profile, aws.config.region);

    winston.info('Razing the garden named "' + argv.garden + '"');
    gardener.terraform(argv.garden, 'na', 'destroy')
        .then(function(result) {
            winston.info("DONE razing the garden");
        })
        .catch(function(error) {
            winston.error(error);
            process.exit(1);
        });
}