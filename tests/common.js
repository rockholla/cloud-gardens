'use strict';

var path = require('path');

before(function() {
    process.env.APP_ROOT = path.resolve(path.join(__dirname, '..'));
});