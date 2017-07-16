'use strict';

var path        = require('path');
var chai        = require('chai');
var expect      = chai.expect;
var Terraform   = require(path.join('..', '..', 'lib', 'terraform'));

describe('Terraform', function() {

  it('Terraform constructor should set directory', function() {
    var tf = new Terraform('__tests-directory');
    expect(tf.directory).to.equal('__tests-directory');
  });

  it('Terraform init should basically work', function() {
    this.timeout(10000);
    var tf = new Terraform(__dirname);
    expect(tf.init('__test-bucket', '__test-key', 'us-east-1', 'pipe').toString()).to.include('Terraform has been successfully initialized!');
  });

  it ('Terrform execute should succeed in a basic plan (via execute method)', function() {
    this.timeout(10000);
    var tf = new Terraform(__dirname);
    expect(tf.execute('plan', { one: 1111 }, '', 'pipe').toString()).to.include('No changes. Infrastructure is up-to-date.');
  });

  it ('Node interface to terraform should support different types of parameters/values', function () {
    this.timeout(10000);
    var tf = new Terraform(__dirname);
    expect(tf.execute('apply', { one: 1111 }, '', 'pipe').toString()).to.include('one = 1111');
    expect(tf.execute('apply', { one: null }, '', 'pipe').toString()).to.include('one = default when null');
    expect(tf.execute('apply', { one: "test string" }, '', 'pipe').toString()).to.include('one = test string');
  });

});