'use strict';

var chai    = require('chai');
var expect  = chai.expect; // we are using the "expect" style of Chai
var Gardens = require('../../lib');

describe('Aws.Gardener', function() {

    // TODO: mock aws sdk and terraform to appropriately unit test this
    /*it('terraform() plan should return true', function() {
        this.timeout(15000);
        var gardener = new Gardens.Aws.Gardener('default', 'us-east-1', '__cloud-gardens-tests');
        return gardener.terraform('__tests', '__tests-key', 'plan').then(function(result) {
            expect(result).to.equal(true);
        });
    });*/

});