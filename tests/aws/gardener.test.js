'use strict';

var path    = require('path');
var chai    = require('chai');
var expect  = chai.expect; // we are using the "expect" style of Chai
var mockery = require('mockery');
var awsMock = {};

function getAwsGardner(awsMock) {
    mockery.registerMock('aws-sdk', awsMock);
    var Gardens = require(path.join('..', '..', 'lib'));
    return new Gardens.Aws.Gardener('__tests-profile', 'us-east-1');
}

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
        var gardener = getAwsGardner(awsMock);
        gardener.createKey('__tests').then(function(result) {
            expect(result).to.include('already exists');
        }).catch(function(error) {
            expect(error).to.equal(null);
        });
    });

    it('createKey should succeeed in creating key', function() {
        awsMock.EC2 = function() {
            this.createKeyPair = function(obj, callback) {
                callback(null, { KeyMaterial: '__test-key-material' });
            };
        };
        var gardener = getAwsGardner(awsMock);
        gardener.createKey('__tests').then(function(result) {
            expect(result).to.equal('__test-key-material');
        }).catch(function(error) {
            expect(error).to.equal(null);
        });
    });

    it('createKey should handle error appropriately', function() {
        awsMock.EC2 = function() {
            this.createKeyPair = function(obj, callback) {
                callback({ message: 'some random error' }, null);
            };
        };
        var gardener = getAwsGardner(awsMock);
        gardener.createKey('__tests').then(function(result) {
            expect(result).to.equal(null);
        }).catch(function(error) {
            expect(error.message).to.equal('some random error');
        });
    });

    it('getAccountId should succeeed in getting account id', function() {
        awsMock.STS = function() {
            this.getCallerIdentity = function(obj, callback) {
                callback(null, { Account: '__test-account-data' });
            };
        };
        var gardener = getAwsGardner(awsMock);
        gardener.getAccountId().then(function(result) {
            expect(result).to.equal('__test-account-data');
        }).catch(function(error) {
            expect(error).to.equal(null);
        });
    });

    it('getAccountId should error appropriately', function() {
        awsMock.STS = function() {
            this.getCallerIdentity = function(obj, callback) {
                callback({ message: 'random error message' }, null);
            };
        };
        var gardener = getAwsGardner(awsMock);
        gardener.getAccountId().then(function(result) {
            expect(result).to.equal(null);
        }).catch(function(error) {
            expect(error.message).to.equal('random error message');
        });
    });

    it('createHostedZone should succeed in creating a hosted zone', function() {
        awsMock.Route53 = function() {
            this.listHostedZonesByName = function(obj, callback) {
                callback(null, { HostedZones: []});
            };
            this.createHostedZone = function(obj, callback) {
                callback(null, 'created hosted zone');
            };
        };
        var gardener = getAwsGardner(awsMock);
        gardener.createHostedZone('__tests-hosted-zone').then(function(result) {
            expect(result).to.equal('created hosted zone');
        }).catch(function(error) {
            expect(error).to.equal(null);
        });
    });

    it('createHostedZone should return hosted zone data for zone that already exists', function() {
        awsMock.Route53 = function() {
            this.listHostedZonesByName = function(obj, callback) {
                callback(null, { HostedZones: [{ Id: '000000000' }]});
            };
            this.getHostedZone = function(obj, callback) {
                callback(null, '__tests-existing-hosted-zone')
            };
        };
        var gardener = getAwsGardner(awsMock);
        gardener.createHostedZone('__tests-hosted-zone').then(function(result) {
            expect(result).to.equal('__tests-existing-hosted-zone');
        }).catch(function(error) {
            expect(error).to.equal(null);
        });
    });

    it('createHostedZone should error appropriately from getting existing list', function() {
        awsMock.Route53 = function() {
            this.listHostedZonesByName = function(obj, callback) {
                callback({ message: 'random error message' }, null);
            };
        };
        var gardener = getAwsGardner(awsMock);
        gardener.createHostedZone('__tests-hosted-zone').then(function(result) {
            expect(result).to.equal(null);
        }).catch(function(error) {
            expect(error.message).to.equal('random error message');
        });
    });

    it('createHostedZone should error appropriately from creating new hosted zone', function() {
        awsMock.Route53 = function() {
            this.listHostedZonesByName = function(obj, callback) {
                callback(null, { HostedZones: []});
            };
            this.createHostedZone = function(obj, callback) {
                callback({ message: 'random error message' }, null);
            };
        };
        var gardener = getAwsGardner(awsMock);
        gardener.createHostedZone('__tests-hosted-zone').then(function(result) {
            expect(result).to.equal(null);
        }).catch(function(error) {
            expect(error.message).to.equal('random error message');
        });
    });

    it('createHostedZone should error appropriately from getting existing hosted zone', function() {
        awsMock.Route53 = function() {
            this.listHostedZonesByName = function(obj, callback) {
                callback(null, { HostedZones: [{ Id: '000000000' }]});
            };
            this.getHostedZone = function(obj, callback) {
                callback({ message: 'random error message'}, null)
            };
        };
        var gardener = getAwsGardner(awsMock);
        gardener.createHostedZone('__tests-hosted-zone').then(function(result) {
            expect(result).to.equal(null);
        }).catch(function(error) {
            expect(error.message).to.equal('random error message');
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