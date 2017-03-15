'use strict';

var aws     = require('aws-sdk');
var path    = require('path');
var Promise = require('bluebird');

module.exports = function(config) {

    this.config                 = config;
    this.ec2                    = new aws.EC2();
    this.cloudFormation         = new aws.CloudFormation();
    this.disabledStackMessage   = 'stack provisioning disabled';

    this.createKey = function(name) {
        var _this       = this;
        _this.keyName   = name;
        return new Promise(function(resolve, reject) {
            _this.ec2.createKeyPair({KeyName: name}, function(err, data) {
                if (err && err.message.includes('already exists')) resolve(err.message);
                if (err) return reject(err);
                resolve(data.KeyMaterial);
            });
        });
    };

    this.plant = function(garden, item, keyName) {
        if ("KeyName" in this.config.aws.stacks[item].parameters) this.config.aws.stacks[item].parameters.KeyName = keyName;
        if ("GardenName" in this.config.aws.stacks[item].parameters) this.config.aws.stacks[item].parameters.GardenName = garden;
        return this.cloudForm(garden, item, this.config.aws.stacks[item]);
    }

    this.makeCloudFormParameters = function(parameters) {
        var converted = [];
        for (var key in parameters) {
            converted.push({
                'ParameterKey': key,
                'ParameterValue': parameters[key]
            });
        }
        return converted;
    };

    /**
     * Runs a cloudformation template to stand up or modify a stack of AWS resources
     * @param  {String} garden the name of the containing garden where this cloud formation template will run
     * @param  {string} type   the type of cloud formation template to run, e.g. "users", "vpc", etc
     * @param  {Object} config the configuration for the cloudformation stack
     * @return {Promise}       A promise, if successful, resolves returns [garden, type, data] where data can be a string or object depending on the request/response
     */
    this.cloudForm = function(garden, type, config) {
        var _this = this;
        return new Promise(function(resolve, reject) {
            if (!config.enabled) {
                return resolve([garden, type, _this.disabledStackMessage]);
            }
            var methodName  = 'createStack';
            var waitFor     = 'stackCreateComplete';
            var params      = {
                Parameters: _this.makeCloudFormParameters(config.parameters),
                StackName: garden + '-' + type,
                TemplateBody: !config.template ? path.join(this.config.aws.templatesDirectory, type + '.yml') : null,
                TemplateURL: (config.template && config.template.startsWith('http')) ? config.template : null,
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
                        return resolve([garden, type, 'Nothing updated']);
                    }
                    if (err) return reject(err);
                    _this.cloudFormation.waitFor(waitFor, {StackName: garden + '-' + type}, function(err, data) {
                        if (err) reject(err);
                        resolve([garden, type, data]);
                    });
                });
            });
        });
    };

}