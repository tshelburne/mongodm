"use strict";

var assert = require('assert')
  , skin = require('mongoskin')
  , support = require('./support/common')
  , conf = require('./support/config')
  , mongodm = require('../index')
  , Model = null;

describe('initializing the service', function() {
	var testOdm;

	after(support.closeDbs);

	beforeEach(function() {
		testOdm = null;
	});

	afterEach(support.clearDbs);

	afterEach(function checkThatConnectionWorks(done) {
		testOdm.should.not.equal(null);
		testOdm.map.should.be.a.instanceof(Function);
		testOdm.map(support.getModelCtor(), 'models');

		support.mongo.collection('models').save({ prop1: 1, prop2: 2, prop3: 3 }, function(err, result) {
			testOdm.models.find(result._id, function(err, model) {
				assert(err === null);
				model.should.not.equal(null);
				testOdm.close(done);
			});
		});
	});

	it('accepts a fully formed uri', function() {
		testOdm = mongodm('mongodb://'+conf.host+':'+conf.port+'/'+conf.name);
	});

	it('accepts specified db config arguments', function() {
		testOdm = mongodm(conf.host, conf.port, conf.name);
	});

	it('accepts username and password arguments');

	it('passes a list of options on to the mongoskin instance');

	it('exposes the low-level mongoskin instance', function() {
		testOdm = buildMongOdm();
		testOdm.base.should.be.a.instanceof(skin.Db);
	});

	function buildMongOdm() {
		return mongodm(conf.host, conf.port, conf.name);
	}

});