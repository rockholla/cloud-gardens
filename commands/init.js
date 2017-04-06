'use strict';

var fs          = require('fs');
var path        = require('path');
var winston     = require('winston');
var Gardens     = require(path.join('..', 'lib'));
var config      = require('config');
var inquirer    = require('inquirer');
var newConfig   = {
    config_name: null,
    cloud: null,
    domain: null,
    aws: {
        region: null,
        profile: null
    },
    bastion: {
        count: null,
        type: null,
        services: {
            username: null,
            password: null
        }
    }
};

exports.command = 'init [name]';
exports.desc = 'initializes a new named configuration, which tells where in the cloud your gardens live, how they\'re accessed, tended, etc.  Configuration files are saved to \'/config/[name].json\'.';
exports.handler = function(argv) {
    if (!argv.name) return winston.error('Please enter a name for the new configuration');
    newConfig.config_name = argv.name;
    inquirer.prompt({
        name: 'cloud',
        type: 'list',
        message: 'Which cloud provider would you like to use for this new configuration?',
        choices: ['aws', 'digitalocean'],
        default: 'aws'
    }).then(function(answer) {
        Object.assign(newConfig, answer);
        if (answer.cloud == 'aws') return exports.awsHandler(argv);
        else if (answer.cloud == 'digitalocean') return exports.digitaloceanHandler(argv);
    }).then(function(answer) {
        Object.assign(newConfig, answer);
        return inquirer.prompt({
            name: 'domain',
            type: 'input',
            message: 'And, what domain name to use?'
        });
    }).then(function(answer) {
        Object.assign(newConfig, answer);
        return inquirer.prompt({
            name: 'count',
            type: 'input',
            message: 'How many bastion servers would you like to run? (bastions are entry points to your infrastructure, the load balancer, jenkins instances, etc.)'
        });
    }).then(function(answer) {
        Object.assign(newConfig.bastion, answer);
        return inquirer.prompt({
            name: 'type',
            type: 'input',
            message: 'And what size for the bastion server(s)? (e.g. t2.micro on AWS)'
        });
    }).then(function(answer) {
        Object.assign(newConfig.bastion, answer);
        return inquirer.prompt({
            name: 'username',
            type: 'input',
            message: 'What username would you like to use for the services on your bastion server?'
        });
    }).then(function(answer) {
        Object.assign(newConfig.bastion.services, answer);
        return inquirer.prompt({
            name: 'password',
            type: 'password',
            message: 'And what password for this user?'
        });
    }).then(function(answer) {
        Object.assign(newConfig.bastion.services, answer);
        var file = path.join(__dirname, '..', 'config', argv.name + '.json');
        fs.writeFileSync(file, JSON.stringify(newConfig, null, 4));
        winston.info('Successfully wrote new configuration to ' + file);
    }).catch(function(error) {
        winston.error(error);
        process.exit(1);
    });
};

exports.awsHandler = function(argv) {
    return inquirer.prompt({
        name: 'region',
        type: 'input',
        message: 'What AWS region would you like to use?'
    }).then(function(answer) {
        Object.assign(newConfig.aws, answer);
        return inquirer.prompt({
            name: 'profile',
            type: 'input',
            message: 'And then the AWS named profile to use?'
        });
    }).then(function(answer) {
        Object.assign(newConfig.aws, answer);
    }).catch(function(error) {
        winston.error(error);
        process.exit(1);
    });
}

exports.digitaloceanHandler = function(argv) {
    winston.error('Only AWS is supported right now');
    process.exit(1);
}