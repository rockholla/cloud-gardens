'use strict';

var path    = require('path');
var chai    = require('chai');
var expect  = chai.expect;
var Gardens = require(path.join('..', 'lib'));

describe('Gardens', function() {

    it('validateName() should not allow special characters', function() {
        expect(Gardens.validateName.bind(Gardens, '123gARden&*(')).to.throw('Please provide a valid garden name, following the pattern [0-9a-zA-Z\\-_]+');
    });

    it('validateName() should allow numbers, letters, dashes, and underscores', function() {
        expect(Gardens.validateName('12abAB-_C')).to.equal(true);
    });

});