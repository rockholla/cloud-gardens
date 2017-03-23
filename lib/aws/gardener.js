'use strict';

var aws     = require('aws-sdk');
var path    = require('path');
var Promise = require('bluebird');
var shell   = require('child_process');

module.exports = function(profile, region) {

    this.profile    = profile;
    this.region     = region;
    this.ec2        = new aws.EC2();

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

    this.terraform = function(garden, key, action) {
        var _this = this;
        return new Promise(function(resolve, reject) {
            try {
                shell.execSync('terraform get', { cwd: 'terraform/aws', stdio: [0, 1, 2] });
                shell.execSync(
                    'terraform ' + action + ' \
                    -state="' + garden + '.tfstate" \
                    -var profile="' + _this.profile.replace(/"/, '') + '" \
                    -var region="' + _this.region.replace(/"/, '') + '" \
                    -var name="' + garden.replace(/"/, '') + '" \
                    -var key="' + key.replace(/"/, '') + '"' + (action == 'destroy' ? ' -force' : ''),
                    { cwd: 'terraform/aws', stdio: [0, 1, 2] }
                );
                resolve(true);
            } catch(error) {
                reject(error);
            }

        });
    }

}