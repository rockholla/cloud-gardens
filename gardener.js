'use strict';

var path    = require('path');
var pkgjson = require(path.join(__dirname, 'package.json'));
var aws     = require('aws-sdk');
var config  = require('config');
var winston = require('winston');
var mkdirp  = require('mkdirp');
var shell   = require('child_process');

winston.setLevels({
  error: 0, warn: 1, info: 2, verbose: 3, debug: 4
});
winston.addColors(config.log.colors);
winston.remove(winston.transports.Console);
if (config.log.console) {
  winston.add(winston.transports.Console, {
    level: config.log.level,
    prettyPrint: true,
    colorize: true,
    silent: false,
    timestamp: false
  });
}
if (config.log.file) {
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
}

var terraformVersion = shell.execSync('terraform --version').toString('utf8');
var nodeVersion = process.version.replace('v', '');
terraformVersion = terraformVersion.split(' v')[1].split("\n")[0];
if (nodeVersion.split('.')[0] < 8) {
  winston.error('Node version 8 or greater required');
  process.exit(1);
}
if (terraformVersion.split('.')[1] < 10) {
  winston.error('Terraform version 0.10 or greater required');
  process.exit(1);
}
var remoteHeadVersion = shell.execSync('git ls-remote https://github.com/rockholla/cloud-gardens.git').toString('utf8').split(/\s+/g)[0].trim();
var localVersion      = shell.execSync('git rev-parse HEAD').toString('utf8').trim();
var localBranch       = shell.execSync('git rev-parse --abbrev-ref HEAD').toString('utf8').trim();
if (localBranch == 'master' && localVersion != remoteHeadVersion) {
  winston.warn("There's a new version of Cloud Gardens available, you should 'git pull origin master' to update");
}

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
  .option('tags', {
    alias: 't',
    describe: 'comma-delimited list of ansible tags to run when tending',
    nargs: 1,
    default: 'all'
  })
  .option('extra-vars', {
    alias: 'e',
    describe: 'comma-delimited list of ansible extra vars, like: -e "myvar=value,anothervar=true"',
    nargs: 1,
    default: null
  })
  .help('h')
  .alias('help', 'h')
  .demandCommand(1, 'you must include a command')

  .argv;
