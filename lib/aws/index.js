'use strict';

module.exports = {
  Gardener: require('./gardener'),

  validateArgs: function(args) {
    if (args && (!args.region || !args.profile)) throw 'a region and profile are required for gardening in AWS';
    return true;
  }
};