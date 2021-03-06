'use strict';

var path        = require('path');
var Promise     = require('bluebird');
var fs          = require('fs');
var path        = require('path');
var Terraform   = require(path.join('..', 'terraform'));
var winston     = require('winston');

module.exports = function(profile, region) {

  var aws                 = require('aws-sdk');

  this.keyNameSuffix      = '';
  this.stateBucketSuffix  = '-garden-states';

  this.profile            = profile;
  aws.config.credentials  = new aws.SharedIniFileCredentials({profile: profile});
  this.region             = region;
  aws.config.update({region: region});

  this.ec2                = new aws.EC2();
  this.s3                 = new aws.S3();
  this.sts                = new aws.STS();
  this.route53            = new aws.Route53();

  this.createKey = function(name) {
    var _this       = this;
    _this.keyName   = name + _this.keyNameSuffix;
    return new Promise(function(resolve, reject) {
      _this.ec2.createKeyPair({ KeyName: _this.keyName }, function(error, data) {
        if (error && error.message.includes('already exists')) return resolve({ name: _this.keyName, warning: error.message + ' If you no longer have access to this key you should delete it in AWS and start over here.' });
        if (error) return reject(error);
        resolve({ name: _this.keyName, content: data.KeyMaterial });
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
    if (!acl) acl = 'public-read-write'; // TODO: need a bucket policy that makes sense here, public read/write too open, and default value of objects not open enough for cross-team permissions
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

  this.createHostedZone = function(domain) {
    var _this = this;
    return new Promise(function(resolve, reject) {
      _this.route53.listHostedZonesByName({ DNSName: domain }, function(error, data) {
        if (error) return reject(error);
        if (data.HostedZones.length == 0) {
          _this.route53.createHostedZone({
            CallerReference: (+ new Date()).toString(),
            Name: domain
          }, function(error, data) {
            if (error) return reject(error);
            resolve({ data: data, created: true });
          });
        } else {
          _this.route53.getHostedZone({ Id: data.HostedZones[0].Id }, function(error, data) {
            if (error) return reject(error);
            resolve({ data: data, created: false });
          });
        }
      });
    });
  };

  this.terraformPrep = function(domain) {
    var _this = this;
    var variables = {};
    return _this.getAccountId()
      .then(function(result){
        variables.stateBucket = result + _this.stateBucketSuffix;
        winston.debug(`State bucket is ${variables.stateBucket}`);
        return _this.createS3Bucket(variables.stateBucket);
      }).then(function(result) {
        return _this.createHostedZone(domain);
      }).then(function(result) {
        variables.nameServers  = result.data.DelegationSet.NameServers;
        variables.hostedZoneId = result.data.HostedZone.Id;
        variables.created      = result.created;
        return new Promise(function(resolve, reject) {
          resolve(variables);
        });
      });
  };

  this.terraform = function(action, stateBucket, variables, directory = '', module = '') {
    var _this = this;
    var stateKey = variables.name + (module != '' ? '-' + module : '');
    directory = directory == '' ? path.join('terraform', 'aws') : directory;
    var tf = new Terraform(path.join(directory, module));
    return new Promise(function(resolve, reject) {
      try {
        var force = (action == 'destroy' ? ' -force' : '');
        tf.init(stateBucket, stateKey, _this.profile, _this.region);
        _this.getAccountId().then(function(result) {
          if (action == 'destroy' || action == 'plan' || action == 'apply' || action == 'refresh') {
            variables = Object.assign(variables, { profile: _this.profile, region: _this.region, account_id: result });
          } else {
            variables = {};
          }
          var extraArguments = (action == 'destroy' ? ' -force' : '');
          if (action == 'refresh') {
            extraArguments += '-backup=' + path.resolve(__dirname, '..', '..', 'terraform', 'aws', 'terraform.tfstate.backup');
          }
          tf.execute(action, variables, extraArguments);
          resolve(true);
        });
      } catch(error) {
        reject(error);
      }
    });
  };

}
