'use strict';

var fs          = require('fs');
var path        = require('path');
var winston     = require('winston');
var Gardens     = require('../lib');
var config      = require('config');
var glob        = require('glob');
var path        = require('path');

exports.command = 'use [name]';
exports.desc = 'use a named configuration for gardening tasks';
exports.handler = function(argv) {
    if (!argv.name) return winston.error('Please enter a name for the new configuration');
    glob(path.join(__dirname, '..', 'config', 'local.*'), function(error, files) {
        files.forEach(function(file) {
            try {
                fs.unlinkSync(file);
            } catch (error) {}
            glob(path.join(__dirname, '..', 'config', argv.name + '.*'), function(error, files) {
                fs.symlinkSync(files[0], path.join(__dirname, '..', 'config', 'local' + path.extname(files[0])));
            });
        });
    });
};