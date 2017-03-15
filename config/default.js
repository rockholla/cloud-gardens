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
    defaultLocation: "aws",
    aws: {
        region: null,
        profile: "default",
        templatesDirectory: defer(function(config) {
            return process.env.APP_ROOT + '/aws/templates';
        }),
        stacks: {
            users: {
                enabled: true,
                parameters: {},
                capabilities: ["CAPABILITY_NAMED_IAM"]
            },
            vpc: {
                enabled: false,
                parameters: {}
            },
            integration: {
                enabled: false,
                parameters: {
                    MasterAdminPassword: "password",
                    KeyName: "",
                    GardenName: ""
                }
            },
            ecr: {
                enabled: false,
                parameters: {
                    GardenName: ""
                }
            },
            ecs: {
                enabled: false,
                parameters: {
                    KeyName: "",
                    GardenName: ""
                }
            }
        }
    }
}