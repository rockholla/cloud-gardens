'use strict';

var fs      = require('fs');
var path    = require('path');
var winston = require('winston');
var Gardens = require(path.join('..', 'lib'));
var config  = require('config');
var glob    = require('glob');
var path    = require('path');

exports.command = 'use [name]';
exports.desc = 'use a named configuration for gardening tasks';

function deleteExisting() {
  try {
    fs.unlinkSync(path.join(__dirname, '..', 'config', 'local.js'))
  } catch (error) {}
  try {
    fs.unlinkSync(path.join(__dirname, '..', 'config', 'local.json'))
  } catch (error) {}
}

exports.handler = function(argv) {
  if (!argv.name) return winston.error('Please enter a name for the new configuration');

  if (fs.existsSync(path.join(__dirname, '..', 'config', argv.name + '.js'))) {
    deleteExisting();
    fs.symlinkSync(
      path.join(__dirname, '..', 'config', argv.name + '.js'),
      path.join(__dirname, '..', 'config', 'local.js')
    );
    winston.info(`Now using config "${argv.name}"`);
  } else if (fs.existsSync(path.join(__dirname, '..', 'config', argv.name + '.json'))) {
    deleteExisting();
    fs.symlinkSync(
      path.join(__dirname, '..', 'config', argv.name + '.json'),
      path.join(__dirname, '..', 'config', 'local.json')
    );
    winston.info(`Now using config "${argv.name}"`);
  } else {
    return winston.error(`Unable to find config file with the name "${argv.name}"`);
  }

};