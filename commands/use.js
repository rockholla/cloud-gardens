'use strict';

var fs      = require('fs');
var path    = require('path');
var winston = require('winston');
var Gardens = require(path.join('..', 'lib'));
var glob    = require('glob');
var path    = require('path');

exports.command = 'use [name]';
exports.desc = 'use a named configuration for gardening tasks';

function deleteExisting() {
  try {
    fs.unlinkSync(path.join(__dirname, '..', 'config', 'local.json'))
  } catch (error) {}
}

exports.handler = function(argv) {
  if (!argv.name) return winston.error('Please enter a name for the new configuration');

  if (fs.existsSync(path.join(__dirname, '..', '.gardens', argv.name, 'config.json'))) {
    deleteExisting();
    fs.symlinkSync(
      path.join(__dirname, '..', '.gardens', argv.name, 'config.json'),
      path.join(__dirname, '..', 'config', 'local.json')
    );
    winston.info(`Now using config .gardens/${argv.name}/config.json as the base config`);
  } else {
    return winston.error(`Unable to find config file in .gardens/${argv.name}`);
  }

};