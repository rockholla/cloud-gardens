'use strict';

var defer = require('config/defer').deferConfig;

module.exports = {
    log: {
        level: "info",
        colors: {
            debug: "blue",
            verbose: "green",
            info: "white",
            warn: "yellow",
            error: "red"
        },
        file: true,
        console: true
    },
    cloud: "aws",
    aws: {
        region: null,
        profile: "default"
    }
}