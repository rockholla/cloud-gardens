#!/usr/bin/env node
'use strict';

var pkgjson = require('./package.json');
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
    filename: './logs/' + pkgjson.name + '.log',
    maxsize: 40000,
    maxFiles: 10,
    json: false
});

var argv = require('yargs')
    .usage('Usage: $0 <command> [options]')
    .commandDir('commands')
    .demandOption(['cloud'])
    .option('region', {
        alias: 'r',
        describe: 'AWS region',
        nargs: 1,
        default: (!config.aws.region ? undefined : config.aws.region)
    })
    .option('profile', {
        alias: 'p',
        describe: 'AWS named profile to use for credentials',
        nargs: 1,
        default: (!config.aws.profile ? undefined : config.aws.profile)
    })
    .option('cloud', {
        alias: 'c',
        describe: 'The cloud where the garden lives',
        nargs: 1,
        default: (!config.cloud ? undefined : config.cloud),
        choices: ['aws', 'digitalocean']
    })
    .option('dryrun', {
        alias: 'd',
        describe: 'If present and if the operation supports it, a dry run of the operation will be attempted',
        type: 'boolean'
    })
    .help('h')
    .alias('help', 'h')
    .demandCommand(1, 'you must include a command')

    .argv;
