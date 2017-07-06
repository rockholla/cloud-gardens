'use strict';

var path            = require('path');
var glob            = require('glob');
var fs              = require('fs');
var Gardens         = require(path.join('..', 'lib'));
var winston         = require('winston');
var afterCreateKey  = require(path.join(__dirname, 'create-key')).callback;
var yamljs          = require('yamljs');
var lnf             = require('lnf');
var baseConfig      = require('config');
var config          = null;

exports.command = 'tend [garden]';
exports.desc = 'for starting or maintaining a garden.  A garden is a collection of integration resources and application environments (dev, testing, etc), all in its own cloud ecosystem.';

function writeAnsibleVars(argv) {
  fs.writeFileSync(
    path.resolve(__dirname, '..', 'terraform', 'ansible', 'vars', 'overrides', 'main.yml'),
    yamljs.stringify({
      garden: argv.garden,
      domain: config.domain,
      bastion_services_username: config.bastion.services.username,
      bastion_services_password: config.bastion.services.password,
      aws_region: argv.region
    })
  );
};

function removeAnsibleVars() {
  try {
    fs.unlinkSync(path.resolve(__dirname, '..', 'terraform', 'ansible', 'vars', 'overrides', 'main.yml'));
  } catch (error) {}
}

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

  var gardener      = new Gardens.Aws.Gardener(argv.profile, argv.region);
  var keyName       = null;
  var nameServers   = [];
  lnf.sync(
    path.resolve(__dirname, '..', '.gardens', argv.profile, argv.garden, 'terraform', 'aws'),
    path.resolve(__dirname, '..', 'terraform', 'aws', '.custom')
  );
  lnf.sync(
    path.resolve(__dirname, '..', '.gardens', argv.profile, argv.garden, 'terraform', 'ansible'),
    path.resolve(__dirname, '..', 'terraform', 'ansible', '.custom')
  );

  try {
    Gardens.Aws.validateArgs(argv);
  } catch (error) {
    return winston.error(error);
  }

  winston.info('Tending all resources for the garden named "' + argv.garden + '"');
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
    nameServers = result.nameServers;
    writeAnsibleVars(argv);
    return gardener.terraform((argv.dryrun ? 'plan' : 'apply'), result.stateBucket, {
      'name': argv.garden,
      'domain': config.domain,
      'key_name': keyName,
      'letsencrypt_ca': config.letsencrypt.ca,
      'bastion_count': config.bastion.count,
      'bastion_instance_type': config.bastion.type,
      'bastion_disk_size': config.bastion.disk_size,
      'hosted_zone_id': result.hostedZoneId,
      'ci_subdomain': config.bastion.subdomains.ci,
      'status_subdomain': config.bastion.subdomains.status,
      'ansible_tags': argv.tags
    });
  }).then(function(result) {
    removeAnsibleVars();
    winston.info("Done tending the garden");
    winston.info("Name servers:");
    nameServers.forEach(function(nameServer) {
      winston.info(`    ${nameServer}`);
    });
    winston.info("You should make sure the registrar for the domain '" + config.domain + "' is updated to point to the name servers above.")
  }).catch(function(error) {
    winston.error(error);
    removeAnsibleVars();
    process.exit(1);
  });

}

exports.digitaloceanHandler = function(argv) {
  winston.error("Only AWS is supported right now");
  process.exit(1);
}