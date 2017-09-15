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
var nodeSsh         = require('node-ssh');
var ssh             = new nodeSsh();
var config          = null;

exports.command = 'tend [garden]';
exports.desc = 'for starting or maintaining a garden. A garden is a collection of integration resources and application environments (dev, testing, etc), all in its own cloud ecosystem.';

function writeAnsibleVars(argv) {
  fs.writeFileSync(
    path.resolve(__dirname, '..', 'terraform', 'ansible', 'vars', 'overrides', 'main.yml'),
    yamljs.stringify({
      garden: argv.garden,
      domain: config.domain,
      bastion_services_username: config.bastion.services.username,
      bastion_services_password: config.bastion.services.password,
      aws_region: argv.region,
      traefik_ci_subdomain: config.bastion.subdomains.ci,
      traefik_status_subdomain: config.bastion.subdomains.status,
      traefik_ecs_region: argv.region,
      letsencrypt_enabled: config.ssl.letsencrypt.enabled,
      letsencrypt_ca: config.ssl.letsencrypt.ca,
      letsencrypt_registration_info_base64: config.ssl.letsencrypt.registration_info ? (new Buffer(JSON.stringify(config.ssl.letsencrypt.registration_info)).toString('base64')) : "",
      letsencrypt_account_key_base64: config.ssl.letsencrypt.account_key ? (new Buffer(config.ssl.letsencrypt.account_key).toString('base64')) : "",
      ssl_cert_key_base64: config.ssl.cert.key ? (new Buffer(config.ssl.cert.key).toString('base64')) : "",
      ssl_cert_bundle_base64: config.ssl.cert.bundle ? (new Buffer(config.ssl.cert.bundle).toString('base64')) : "",
      github_deployer_username: config.github.deployer.username,
      github_deployer_token: config.github.deployer.token,
      github_deployer_ssh_key_base64: config.github.deployer.ssh_key ? (new Buffer(config.github.deployer.ssh_key).toString('base64')) : "",
      jenkins_users: config.bastion.jenkins.users
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
    return gardener.terraform((argv.dryrun ? 'plan' : 'apply'),
                              result.stateBucket,
                              Gardens.Aws.getTerraformArgs(argv, config, keyName, result.hostedZoneId));
  }).then(function(result) {
    // see if we need to reboot our bastion instance after this tend
    var onSshError = function (error) {
      winston.error("Error determining if the bastion instance needs rebooting, you can do it manually if so. Here's the error:");
      winston.error(error);
    };
    ssh.connect({
      host: config.bastion.subdomains.ci + '.' + config.domain,
      username: 'ubuntu',
      privateKey: path.resolve(__dirname, '..', '.gardens', argv.profile, argv.garden, '.keys', keyName)
    }).then(function () {
      ssh.execCommand('sudo bash -c "([[ -e /var/run/reboot-required ]] && echo \'rebooting bastion instance\' && shutdown -r now) || echo \'no reboot required\'"').then(function (result) {
        if (result.stdout.indexOf('rebooting bastion instance') >= 0) {
          winston.warn("The bastion instance required a reboot, it may be another minute or so before it's back up");
        }
        ssh.dispose();
      }, onSshError);
    }).catch(onSshError);
    removeAnsibleVars();
    winston.info("Done tending the garden");
    winston.info("Name servers:");
    nameServers.forEach(function(nameServer) {
      winston.info(`    ${nameServer}`);
    });
    winston.info("You should make sure the registrar for the domain '" + config.domain + "' is updated to point to the name servers above.");
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
