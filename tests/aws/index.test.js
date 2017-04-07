'use strict';

var path    = require('path');
var chai    = require('chai');
var expect  = chai.expect;
var Gardens = require(path.join('..', '..', 'lib'));

describe('Gardens.Aws', function() {

  it('validateArgs() should require both region and profile', function() {
    expect(Gardens.Aws.validateArgs.bind(Gardens.Aws, {})).to.throw('a region and profile are required for gardening in AWS');
    expect(Gardens.Aws.validateArgs.bind(Gardens.Aws, {'profile': null, 'region': null})).to.throw('a region and profile are required for gardening in AWS');
    expect(Gardens.Aws.validateArgs.bind(Gardens.Aws, {'profile': undefined, 'region': undefined})).to.throw('a region and profile are required for gardening in AWS');
    expect(Gardens.Aws.validateArgs.bind(Gardens.Aws, {'profile': 'default', 'region': null})).to.throw('a region and profile are required for gardening in AWS');
    expect(Gardens.Aws.validateArgs.bind(Gardens.Aws, {'profile': null, 'region': 'us-west-1'})).to.throw('a region and profile are required for gardening in AWS');
  });

  it('validateArgs() should return true with valid args', function() {
    expect(Gardens.Aws.validateArgs({'profile': 'default', 'region': 'us-west-2'})).to.equal(true);
  });

});