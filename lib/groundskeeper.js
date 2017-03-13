'use strict';

var aws     = require('aws-sdk');
var fs      = require('fs');
var path    = require('path');
var winston = require('winston');

function Groundskeeper(config) {

    this.config         = config;
    this.ec2            = new aws.EC2();
    this.cloudFormation = new aws.CloudFormation();
    this.keyPairName    = null;

    this.createKeyPair = function(name) {
        var _this           = this;
        _this.keyPairName   = name;
        return new Promise(function(resolve, reject) {
            _this.ec2.createKeyPair({KeyName: name}, function(err, data) {
                if (err) return reject(err);
                var keyPath = path.resolve(path.join(__dirname, '..', '.keys', name + '.pem'));
                fs.writeFile(keyPath, data.KeyMaterial, function(err) {
                    if (err) return reject(err);
                    fs.chmod(keyPath, '0600');
                    winston.warn("IMPORTANT: new key has been saved to " + keyPath + ", make sure you put it in a safe place.  You won't be able to recover it.");
                    resolve(name);
                });
            });
        });
    };

    this.provisionUsers = function(gardenName) {
        return this.provisionCloudFormationStack(gardenName, 'users', this.config.stacks.users);
    };

    this.provisionVpc = function(previousResult) {
        return this.provisionCloudFormationStack(previousResult.garden, 'vpc', this.config.stacks.vpc);
    };

    this.provisionIntegrationResources = function(previousResult) {
        this.config.stacks.integration.parameters['KeyName']    = this.keyPairName;
        this.config.stacks.integration.parameters['GardenName'] = previousResult.garden;
        return this.provisionCloudFormationStack(previousResult.garden, 'integration', this.config.stacks.integration);
    };

    this.provisionEcr = function(previousResult) {
        this.config.stacks.ecr.parameters['GardenName'] = previousResult.garden;
        return this.provisionCloudFormationStack(previousResult.garden, 'ecr', this.config.stacks.ecr);
    };

    this.provisionEcs = function(previousResult) {
        this.config.stacks.ecs.parameters['KeyName']    = this.keyPairName;
        this.config.stacks.ecs.parameters['GardenName'] = previousResult.garden;
        return this.provisionCloudFormationStack(previousResult.garden, 'ecs', this.config.stacks.ecs);
    };

    this.convertCloudFormationParameters = function(parameters) {
        var converted = [];
        for (var key in parameters) {
            converted.push({
                'ParameterKey': key,
                'ParameterValue': parameters[key]
            });
        }
        return converted;
    };

    this.provisionCloudFormationStack = function(garden, type, config) {
        var _this    = this;
        var _resolve = {
            'garden': garden,
            'type': type,
            'config': config
        }
        if (!config.enabled) {
            return new Promise(function(resolve, reject) { resolve(_resolve); });
        }
        return new Promise(function(resolve, reject) {
            var methodName  = 'createStack';
            var waitFor     = 'stackCreateComplete';
            var params      = {
                Parameters: _this.convertCloudFormationParameters(config.parameters),
                StackName: garden + '-' + type,
                TemplateBody: !config.template.startsWith('http') ? fs.readFileSync(path.resolve(path.join(__dirname, '..', config.template)), 'utf8') : null,
                TemplateURL: config.template.startsWith('http') ? config.template : null,
                Capabilities: config.capabilities ? config.capabilities : ['CAPABILITY_IAM'],
                OnFailure: config.onFailure ? config.onFailure : 'ROLLBACK'
            };
            _this.cloudFormation.describeStacks({StackName: garden + '-' + type}, function(err, data) {
                if (data && data.Stacks && data.Stacks.length > 0) {
                    methodName                  = 'updateStack';
                    waitFor                     = 'stackUpdateComplete';
                    params.UsePreviousTemplate  = false;
                    delete params.OnFailure;
                }
                _this.cloudFormation[methodName](params, function(err, data) {
                    if (err && err.message == 'No updates are to be performed.') {
                        _resolve['result'] == 'Nothing updated';
                        return resolve(_resolve);
                    }
                    if (err) return reject(err);
                    _this.cloudFormation.waitFor(waitFor, {StackName: garden + '-' + type}, function(err, data) {
                        if (err) reject(err);
                        _resolve['result'] = data;
                        resolve(_resolve);
                    });
                });
            });
        });
    };

}

module.exports = Groundskeeper;