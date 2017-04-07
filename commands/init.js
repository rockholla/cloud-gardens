'use strict';

var fs          = require('fs');
var path        = require('path');
var winston     = require('winston');
var Gardens     = require(path.join('..', 'lib'));
var inquirer    = require('inquirer');

exports.command = 'init [name]';
exports.desc = 'initializes a new named configuration, which tells where in the cloud your gardens live, how they\'re accessed, tended, etc.  Configuration files are saved to \'/config/[name].json\'.';

exports.handler = function(argv) {
    if (!argv.name) return winston.error('Please enter a name for the new configuration');

    var config = {
        config_name: argv.name
    };
    inquirer.prompt(
        {
            name: 'cloud',
            type: 'list',
            message: 'Which cloud provider would you like to use for this new configuration?',
            choices: ['aws', 'digitalocean'],
            default: 'aws'
        }
    ).then(function(answers) {
        config = Gardens.applyInquirerAnswers(answers, config);
        if (answers.cloud == 'aws') return exports.awsHandler(argv);
        else if (answers.cloud == 'digitalocean') return exports.digitaloceanHandler(argv);
    }).then(function(answers) {
        config = Gardens.applyInquirerAnswers(answers, config);
        return inquirer.prompt([
            {
                name: 'domain',
                type: 'input',
                message: 'And, what domain name to use?'
            },
            {
                name: 'bastion.count',
                type: 'input',
                message: 'How many bastion servers would you like to run? (bastions are entry points to your infrastructure, the load balancer, jenkins instances, etc.)'
            },
            {
                name: 'bastion.type',
                type: 'input',
                message: 'And what type of server for the bastion(s)? (e.g. t2.micro on AWS)'
            },
            {
                name: 'bastion.services.username',
                type: 'input',
                message: 'What username would you like to use for the services on your bastion server?'
            },
            {
                name: 'bastion.services.password',
                type: 'password',
                message: 'And what password for this user?'
            }
        ]);
    }).then(function(answers) {
        config = Gardens.applyInquirerAnswers(answers, config);
        var file = path.join(__dirname, '..', 'config', argv.name + '.json');
        fs.writeFileSync(file, JSON.stringify(config, null, 4));
        winston.info('Successfully wrote new configuration to ' + file);
    }).catch(function(error) {
        winston.error(error);
        process.exit(1);
    });
};

exports.awsHandler = function(argv) {
    return inquirer.prompt([
        {
            name: 'aws.region',
            type: 'input',
            message: 'What AWS region would you like to use?'
        },
        {
            name: 'aws.profile',
            type: 'input',
            message: 'And then the AWS named profile to use?'
        }
    ]);
}

exports.digitaloceanHandler = function(argv) {
    winston.error('Only AWS is supported right now');
    process.exit(1);
}