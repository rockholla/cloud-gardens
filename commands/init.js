'use strict';

var fs          = require('fs');
var path        = require('path');
var winston     = require('winston');
var Gardens     = require(path.join('..', 'lib'));
var config      = require('config');
var inquirer    = require('inquirer');
var newConfig   = {
    cloud: null,
    domain: null,
    aws: {
        region: null,
        profile: null
    }
};

exports.command = 'init [name]';
exports.desc = 'initializes a new named configuration, which tells where in the cloud your gardens live, how they\'re accessed, tended, etc.  Configuration files are saved to \'/config/[name].json\'.';
exports.handler = function(argv) {
    if (!argv.name) return winston.error('Please enter a name for the new configuration');
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
            message: 'And finally, what domain name to use?'
        });
    }).then(function(answer) {
        Object.assign(newConfig, answer);
        var file = path.join(__dirname, '..', 'config', argv.name + '.json');
        fs.writeFileSync(file, JSON.stringify(newConfig, null, 4));
        winston.info('Successfully wrote new configuration to ' + file);
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
    });
}

exports.digitaloceanHandler = function(argv) {
    winston.error('Only AWS is supported right now');
    process.exit(1);
}