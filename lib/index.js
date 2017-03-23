'use strict';

module.exports = {
    Aws: require('./aws'),
    DigitalOcean: require('./digitalocean'),

    validateName: function(name) {
        if (!name || !name.match(/^[0-9a-zA-Z\-_]*$/)) {
            throw 'Please provide a valid garden name, following the pattern [0-9a-zA-Z\\-_]+';
        }
        return true;
    }
};