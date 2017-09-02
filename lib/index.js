'use strict';

module.exports = {
  Aws: require('./aws'),
  DigitalOcean: require('./digitalocean'),

  validateName: function(name) {
    if (!name || !name.match(/^[0-9a-zA-Z\-_]*$/)) {
      throw 'Please provide a valid garden name, following the pattern [0-9a-zA-Z\\-_]+';
    }
    return true;
  },

  applyInquirerAnswers: function(answers, to) {
    for (var key in answers) {
      var split = key.split('.'), count = 0;
      split.reduce(function(object, i) {
        if (!(i in object)) object[i] = {};
        if (count == (split.length - 1)) object[i] = answers[key];
        count++;
        return object[i];
      }, to);
    }
    return to;
  },

};