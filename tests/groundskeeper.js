'use strict';

var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var Groundskeeper = require('./../lib/groundskeeper');

describe('Groundskeeper', function() {
  it('convertCloudFormationParameters() should return an expected structure', function() {
    var gk = new Groundskeeper({});
    expect(gk.convertCloudFormationParameters({
        "one": 1, "two": 2
    })).to.deep.equal([
        { "ParameterKey": "one", "ParameterValue": 1 },
        { "ParameterKey": "two", "ParameterValue": 2 }
    ]);
  });
});