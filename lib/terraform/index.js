'use strict';

var fs      = require('fs');
var path    = require('path');
var shell   = require('child_process');
var winston = require('winston');

module.exports = function(directory) {
  this.directory = directory;

  this.init = function(stateBucket, stateKey, profile, region, stdio = ['pipe', 'pipe', process.stderr]) {
    var _this = this;
    try {
      fs.unlinkSync(path.join(_this.directory, '.terraform', 'terraform.tfstate'));
    } catch (error) {}
    var cmd = `terraform init -get=true -backend=true -backend-config="bucket=${stateBucket}" -backend-config="key=${stateKey}" -backend-config="region=${region}" -backend-config="profile=${profile}"`;
    winston.debug(`Executing terraform command: ${cmd}`);
    return shell.execSync(cmd.trim(), { cwd: _this.directory, stdio: stdio });
  };

  this.execute = function(action, variables, extraArguments = '', stdio = [0, 1, 2]) {
    var _this = this;
    var cmd = `terraform ${action}`;
    for (var item in variables) {
      cmd += variables[item] == null ? '' : ` -var '${item}=${variables[item]}'`
    }
    cmd += ` ${extraArguments}`;
    winston.debug(`Executing terraform command: ${cmd}`);
    return shell.execSync(cmd.trim(), { cwd: _this.directory, stdio: stdio });
  };
}
