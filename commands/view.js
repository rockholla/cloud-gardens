'use strict';

var fs          = require('fs');
var path        = require('path');
var Gardens     = require(path.join('..', 'lib'));
var winston     = require('winston');
var baseConfig  = require('config');
var inquirer    = require('inquirer');
var mkdirp      = require('mkdirp');
var lnf         = require('lnf');
var config      = null;

exports.command = 'view [garden]';
exports.desc = 'for getting a quick look at the state of a garden';

exports.handler = function(argv) {
  var gardenConfigPath = path.resolve(__dirname, '..', '.gardens', argv.profile, argv.garden, 'config.json');
  if (fs.existsSync(gardenConfigPath)) {
    config = baseConfig.util.extendDeep(baseConfig, JSON.parse(fs.readFileSync(gardenConfigPath)));
  } else {
    config = baseConfig;
  }
  try {
    Gardens.validateName(argv.garden);
  } catch (error) {
    return winston.error(error);
  }
  if (argv.cloud == 'aws') exports.awsHandler(argv);
  else if (argv.cloud == 'digitalocean') exports.digitaloceanHandler(argv);
}

exports.awsHandler = function(argv) {

  var gardener    = new Gardens.Aws.Gardener(argv.profile, argv.region);
  var stateBucket = null;
  var graphPath   = null;
  var keyName     = null;
  lnf.sync(
    path.resolve(__dirname, '..', '.gardens', argv.profile, argv.garden, 'terraform', 'aws'),
    path.resolve(__dirname, '..', 'terraform', 'aws', '.custom')
  );

  try {
    Gardens.Aws.validateArgs(argv);
  } catch (error) {
    return winston.error(error);
  }

  winston.info('About to get a look at the garden named "' + argv.garden + '"');
  gardener.createKey(argv.garden + '.key').then(function(result) {
    keyName = result.name;
    if (result.warning) {
      winston.warn(result.warning);
    } else {
      afterCreateKey(argv.profile, argv.garden, result.name, result.content);
    }
    winston.info('Prepping prior to terraforming');
    return gardener.terraformPrep(config.domain);
  }).then(function(result) {
    stateBucket = result.stateBucket;
    return gardener.terraform('output', stateBucket, {
    'name': argv.garden,
    'domain': config.domain,
    'key_name': keyName,
    'letsencrypt_enabled': config.letsencrypt.enabled,
    'letsencrypt_ca': config.letsencrypt.ca,
    'letsencrypt_registration_info_base64': config.letsencrypt.registration_info ? (new Buffer(JSON.stringify(config.letsencrypt.registration_info)).toString('base64')) : null,
    'letsencrypt_account_key_base64': config.letsencrypt.account_key ? (new Buffer(config.letsencrypt.account_key).toString('base64')) : null,
    'bastion_ami': config.bastion.ami,
    'bastion_count': config.bastion.count,
    'bastion_instance_type': config.bastion.type,
    'hosted_zone_id': result.hostedZoneId,
    'ci_subdomain': config.bastion.subdomains.ci,
    'status_subdomain': config.bastion.subdomains.status
  });
  }).then(function(result) {
    graphPath = path.resolve(__dirname, '..', '.gardens', argv.profile, argv.garden, '.graphs');
    mkdirp.sync(graphPath);
    graphPath = path.join(graphPath, 'all.png');
    return gardener.terraform('graph | dot -Tpng > ' + graphPath, stateBucket, { name: argv.garden });
  }).then(function(result) {
    winston.info('A graph of resources has been saved to ' + graphPath);
  }).catch(function(error) {
    winston.error(error);
    process.exit(1);
  });
}

exports.digitaloceanHandler = function(argv) {
  winston.error("Only AWS is supported right now");
  process.exit(1);
}