'use strict';

var path        = require('path');
var Gardens     = require(path.join('..', 'lib'));
var winston     = require('winston');
var config      = require('config');
var inquirer    = require('inquirer');

exports.command = 'raze [garden]';
exports.desc = 'for completely destroying an existing garden.';

exports.handler = function(argv) {
  try {
    Gardens.validateName(argv.garden);
  } catch (error) {
    return winston.error(error);
  }
  inquirer.prompt([{
    name: "confirmation",
    message: "DANGER!!! you are about to completely destroy the '" + argv.garden + "' garden.  Please type in the name of the garden to confirm that this is what you actually want to do.",
    type: "input"
  }]).then(function(answer) {
    if (answer.confirmation == argv.garden) {
      if (argv.cloud == 'aws') exports.awsHandler(argv);
      else if (argv.cloud == 'digitalocean') exports.digitaloceanHandler(argv);
    } else {
      winston.info("OK, not razing the garden");
    }
  });
}

exports.awsHandler = function(argv) {

  var gardener    = new Gardens.Aws.Gardener(argv.profile, argv.region);
  var stateBucket = null;

  try {
    Gardens.Aws.validateArgs(argv);
  } catch (error) {
    return winston.error(error);
  }

  winston.info('Razing the garden named "' + argv.garden + '"');
  winston.info('Prepping prior to terraforming');
  gardener.terraformPrep(config.domain).then(function(result) {
      stateBucket = result.stateBucket;
      return gardener.terraform('destroy', result.stateBucket, {
        'name': argv.garden,
        'domain': config.domain,
        'key_name': argv.garden + gardener.keyNameSuffix,
        'hosted_zone_id': result.hostedZoneId,
        'ci_subdomain': config.bastion.subdomains.ci,
        'status_subdomain': config.bastion.subdomains.status
      });
    }).then(function(result) {
      winston.info("Done razing the garden");
      winston.warn("Some resources created during gardening are left intact after a raze:");
      winston.warn("    S3 terraform state location: " + stateBucket + '/' + argv.garden);
      winston.warn("    EC2 Key Pairs");
      winston.warn("    Route53 Zones");
      winston.warn("You'll need to delete those manually through the AWS console if necessary");
    }).catch(function(error) {
      winston.error(error);
      process.exit(1);
    });
}

exports.digitaloceanHandler = function(argv) {
  winston.error("Only AWS is supported right now");
  process.exit(1);
}