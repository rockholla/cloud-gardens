'use strict';

var path    = require('path');
var chai    = require('chai');
var expect  = chai.expect; // we are using the "expect" style of Chai
var mockery = require('mockery');
var awsMock = {};

describe('Aws.Gardener', function() {

    beforeEach(function() {
        mockery.enable({
            warnOnReplace: false,
            warnOnUnregistered: false,
            useCleanCache: true
        });
        awsMock = {
            SharedIniFileCredentials: function() {},
            config: {
                credentials: null,
                update: function() {}
            },
            EC2: function() {},
            S3: function() {},
            STS: function() {},
            Route53: function() {}
        };
    });

    it('createKey should tell us that the key already exists if it does w/o an error', function() {
        awsMock.EC2 = function() {
            this.createKeyPair = function(obj, callback) {
                callback({message: 'already exists'}, null);
            };
        };
        mockery.registerMock('aws-sdk', awsMock);
        var Gardens = require(path.join('..', '..', 'lib'));
        var gardener = new Gardens.Aws.Gardener('__tests-profile', 'us-east-1');
        gardener.createKey('__tests').then(function(result) {
            expect(result).to.include('already exists');
        });
    });

    // TODO: mock aws sdk and terraform to appropriately test this
    /*it('terraform() plan should return true', function() {
        this.timeout(15000);
        var gardener = new Gardens.Aws.Gardener('default', 'us-east-1', '__cloud-gardens-tests');
        return gardener.terraform('__tests', '__tests-key', 'plan').then(function(result) {
            expect(result).to.equal(true);
        });
    });*/

});