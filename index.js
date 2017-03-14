#!/usr/bin/env node
'use strict';

var def     = require('./package.json');
var aws     = require('aws-sdk');
var config  = require('config');
var winston = require('winston');

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
    filename: './logs/' + def.name + '.log',
    maxsize: 40000,
    maxFiles: 10,
    json: false
});

var argv = require('yargs')
    .usage('Usage: $0 <command> [options]')
    .commandDir('commands')
    .alias('r', 'region')
    .nargs('r', 1)
    .describe('r', 'AWS region')
    .default('r', (!config.aws.region ? undefined : config.aws.region))
    .coerce('r', function(arg) {
        aws.config.update({region: arg});
        return arg;
    })
    .alias('p', 'profile')
    .nargs('p', 1)
    .describe('p', 'AWS named profile')
    .demandOption(['p', 'r'])
    .default('p', (!config.aws.profile ? undefined : config.aws.profile))
    .coerce('p', function(arg) {
        aws.config.credentials = new aws.SharedIniFileCredentials({profile: arg});
        return arg;
    })
    .help('h')
    .alias('h', 'help')

    .example('$0 create-key mykey', 'creates a new ssh key named "mykey"')
    .example('$0 --region=us-east-1 plant main-east', 'starts or maintains a garden named "main-east" in the us-east-1 region')

    .argv;
