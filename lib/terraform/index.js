'use strict';

var shell   = require('child_process');

module.exports = function(directory) {
    this.directory = directory;

    this.init = function(stateBucket, stateKey, region, stdio = ['pipe', 'pipe', process.stderr]) {
        var _this = this;
        try {
            fs.unlinkSync(path.join(_this.directory, '.terraform', 'terraform.tfstate'));
        } catch (error) {}
        return shell.execSync(
            `terraform init -get=true -backend=true -backend-config="bucket=${stateBucket}" -backend-config="key=${stateKey}" -backend-config="region=${region}"`,
            { cwd: _this.directory, stdio: stdio }
        );
    };

    this.execute = function(action, variables, extraArguments = '', stdio = [0, 1, 2]) {
        var _this = this;
        var cmd = `terraform ${action}`;
        for (var item in variables) {
            cmd += ` -var ${item}="${variables[item]}"`
        }
        cmd += ` ${extraArguments}`;
        return shell.execSync(cmd, { cwd: _this.directory, stdio: stdio });
    };
}