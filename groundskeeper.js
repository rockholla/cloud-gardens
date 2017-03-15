#!/usr/bin/env node
'use strict';

var pkgjson = require('./package.json');
var aws     = require('aws-sdk');
var config  = require('config');
var winston = require('winston');

process.env.APP_ROOT = __dirname;

winston.setLevels({
    error: 0, warn: 1, info: 2, verbose: 3, debug: 4
});
winston.addColors({
    error: 'red', warn: 'yellow', info: 'green', verbose: 'cyan', debug: 'blue'
});
winston.remove(winston.transports.Console)
winston.add(winston.transports.Console, {
    level: config.log.level,
    prettyPrint: true,
    colorize: true,
    silent: false,
    timestamp: false
});
winston.add(winston.transports.File, {
    prettyPrint: false,
    level: config.log.level,
    silent: false,
    colorize: false,
    timestamp: true,
    filename: './logs/' + pkgjson.name + '.log',
    maxsize: 40000,
    maxFiles: 10,
    json: false
});

var argv = require('yargs')
    .usage('Usage: $0 <command> [options]')
    .commandDir('commands')
    .demandOption(['profile', 'region', 'location'])
    .alias('region', 'r')
    .nargs('region', 1)
    .describe('region', 'AWS region')
    .default('region', (!config.aws.region ? undefined : config.aws.region))
    .coerce('region', function(arg) {
        aws.config.update({region: arg});
        return arg;
    })
    .alias('profile', 'p')
    .nargs('profile', 1)
    .describe('profile', 'AWS named profile to use for credentials')
    .default('profile', (!config.aws.profile ? undefined : config.aws.profile))
    .coerce('profile', function(arg) {
        aws.config.credentials = new aws.SharedIniFileCredentials({profile: arg});
        return arg;
    })
    .alias('location', 'l')
    .nargs('location', 1)
    .describe('location', 'Where to plant the garden')
    .choices('location', ['aws', 'digitalocean'])
    .default('location', config.defaultLocation)
    .help('h')
    .alias('help', 'h')

    .example('$0 --region=us-west-2 create-key mykey', 'creates a new ssh key named "mykey" in the us-west-2 region')
    .example('$0 --region=us-east-1 plant main-east', 'starts or maintains a garden named "main-east" in the us-east-1 region')

    .argv;
