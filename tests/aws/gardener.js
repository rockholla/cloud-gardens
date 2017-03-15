'use strict';

var chai            = require('chai');
var expect          = chai.expect; // we are using the "expect" style of Chai
var Groundskeeper   = require('../../lib');
var Promise         = require('bluebird');

describe('Aws.Gardener', function() {

  it('makeCloudFormParameters() should return an expected structure', function() {
    var gardener = new Groundskeeper.Aws.Gardener({});
    expect(gardener.makeCloudFormParameters({
        "one": 1, "two": 2
    })).to.deep.equal([
        { "ParameterKey": "one", "ParameterValue": 1 },
        { "ParameterKey": "two", "ParameterValue": 2 }
    ]);
  });

  it('cloudForm should return to us a promise telling us that the stack is disabled', function() {
    var gardener = new Groundskeeper.Aws.Gardener({});
    return gardener.cloudForm('__gardentests', 'users', { enabled: false }).then(function(result) {
        expect(result).to.deep.equal(['__gardentests', 'users', gardener.disabledStackMessage]);
    });
  });

});