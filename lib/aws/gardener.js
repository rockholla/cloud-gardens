'use strict';

var aws     = require('aws-sdk');
var path    = require('path');
var Promise = require('bluebird');
var shell   = require('child_process');
var fs      = require('fs');

module.exports = function(profile, region) {

    this.stateBucketSuffix  = '-garden-states';

    this.profile            = profile;
    aws.config.credentials  = new aws.SharedIniFileCredentials({profile: profile});
    this.region             = region;
    aws.config.update({region: region});

    this.ec2                = new aws.EC2();
    this.s3                 = new aws.S3();
    this.sts                = new aws.STS();

    this.createKey = function(name) {
        var _this       = this;
        _this.keyName   = name;
        return new Promise(function(resolve, reject) {
            _this.ec2.createKeyPair({KeyName: name}, function(error, data) {
                if (error && error.message.includes('already exists')) resolve(error.message);
                if (error) return reject(error);
                resolve(data.KeyMaterial);
            });
        });
    };

    this.getAccountId = function() {
        var _this = this;
        return new Promise(function(resolve, reject) {
            _this.sts.getCallerIdentity({}, function(error, data) {
                if (error) return reject(error);
                resolve(data.Account);
            });
        });
    };

    this.createS3Bucket = function(name, acl) {
        if (!acl) acl = 'public-read-write';
        var _this = this;
        return new Promise(function(resolve, reject) {
            _this.s3.headBucket({ Bucket: name }, function(error, data) {
                if (error && error.statusCode == 404) {
                    _this.s3.createBucket({
                        Bucket: name,
                        ACL: acl
                    }, function(error, data) {
                        if (error) return reject(error);
                        resolve({ name: name, data: data });
                    });
                }
                else if (error) {
                    return reject(error);
                } else {
                    resolve({ name: name, data: data });
                }
            });
        });
    };

    this.terraform = function(garden, key, action, stateBucket) {
        var _this = this;
        return new Promise(function(resolve, reject) {
            try {
                try {
                    fs.unlinkSync('terraform/aws/.terraform/terraform.tfstate');
                } catch (error) {}
                shell.execSync('terraform init -get=true -backend=true -backend-config="bucket=' + stateBucket + '" -backend-config="key=' + garden + '" -backend-config="region=' + _this.region + '"', { cwd: 'terraform/aws', stdio: [0, 1, 2] });
                shell.execSync(
                    'terraform ' + action + ' \
                    -var profile="' + _this.profile + '" \
                    -var region="' + _this.region + '" \
                    -var name="' + garden + '" \
                    -var key="' + key + '"' + (action == 'destroy' ? ' -force' : ''),
                    { cwd: 'terraform/aws', stdio: [0, 1, 2] }
                );
                resolve(true);
            } catch(error) {
                reject(error);
            }
        });
    }

}