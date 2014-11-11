"use strict";

var assert = require('assert')
  , support = require('./support/common')
  , msDb = support.mongo
  , odm = support.odm
  , Model = null;

describe('a model with scopes', function() {

	after(support.closeDbs);

	beforeEach(function() {
		Model = support.getModelCtor();
		odm.map(Model, 'models');

		odm.models.scope('low', {prop1: 1});
		odm.models.scope('high', {prop1: 2});
		odm.models.scope('good', {prop2: true});
		odm.models.scope('bad', {prop2: false});
	});

	afterEach(support.clearDbs);

	it('adds scope functions to the mapper', function() {
		odm.models.low.should.be.a.Function;
		odm.models.high.should.be.a.Function;
		odm.models.good.should.be.a.Function;
		odm.models.bad.should.be.a.Function;
	});

	it('adds scope functions to the model', function() {
		Model.low.should.be.a.Function;
		Model.high.should.be.a.Function;
		Model.good.should.be.a.Function;
		Model.bad.should.be.a.Function;
	});

	it('returns models by scope', function(done) {
		Model.create({prop1: 1, prop2: true}, function(err, model1) {
			Model.create({prop1: 1, prop2: false}, function(err, model2) {
				Model.create({prop1: 2, prop2: true}, function(err, model3) {
					Model.low().all(function(err, lowModels) {
						lowModels.should.eql([model1, model2]);
						Model.good().all(function(err, goodModels) {
							goodModels.should.eql([model1, model3]);
							done();
						});
					});
				});
			});
		});
	});

	it('returns models requested by multiple scopes', function(done) {
		Model.create({prop1: 1, prop2: true}, function(err, model1) {
			Model.create({prop1: 2, prop2: false}, function(err, model2) {
				Model.create({prop1: 1, prop2: false}, function(err, model3) {
					Model.create({prop1: 2, prop2: false}, function(err, model4) {
						Model.low().good().all(function(err, lowGoodModels) {
							lowGoodModels.should.eql([model1]);
							Model.high().bad().all(function(err, highBadModels) {
								highBadModels.should.eql([model2, model4]);
								done();
							});
						});
					});
				});
			});
		});
	});

	it('returns models with additional queries inserted', function(done) {
		Model.create({prop1: 1, prop2: true}, function(err, model1) {
			Model.create({prop1: 2, prop2: false}, function(err, model2) {
				Model.create({prop1: 1, prop2: false, prop3: 'set'}, function(err, model3) {
					Model.create({prop1: 2, prop2: false, prop3: 'set'}, function(err, model4) {
						Model.low().all({prop3: 'set'}, function(err, lowSetModels) {
							lowSetModels.should.eql([model3]);
							Model.bad().all({prop3: 'set'}, function(err, badSetModels) {
								badSetModels.should.eql([model3, model4]);
								done();
							});
						});
					});
				});
			});
		});
	});

	it('returns a single model by scope', function(done) {
		Model.create({prop1: 1, prop2: true}, function(err, model1) {
			Model.create({prop1: 2, prop2: false}, function(err, model2) {
				Model.create({prop1: 1, prop2: false, prop3: 'set'}, function(err, model3) {
					Model.low().find({}, function(err, model) {
						model.should.eql(model1);
						done();
					});
				});
			});
		});
	});

	it('handles scopes with arguments', function(done) {
		odm.models.scope('withProps', function(value1, value2) { 
			return {prop1: value1, prop2: value2}; 
		});
		Model.create({prop1: 1, prop2: true}, function(err, model1) {
			Model.create({prop1: 2, prop2: false}, function(err, model2) {
				Model.create({prop1: 1, prop2: false, prop3: 'set'}, function(err, model3) {
					Model.withProps(1, false).all(function(err, models) {
						models.should.eql([model3]);
						done();
					});
				});
			});
		});
	});

	describe("default scoping", function() {
		
		beforeEach(function() {
			odm.models.scopeDefault({prop1: 1});
		});

		it('limits all queries by the scope default', function(done) {
			Model.create({prop1: 1, prop2: true}, function(err, model1) {
				Model.create({prop1: 2, prop2: false}, function(err, model2) {
					Model.create({prop1: 1, prop2: false}, function(err, model3) {
						Model.create({prop1: 2, prop2: false}, function(err, model4) {
							Model.good().all(function(err, goodModels) {
								goodModels.should.eql([model1]);
								Model.all(function(err, allModels) {
									allModels.should.eql([model1, model3]);
									done();
								});
							});
						});
					});
				});
			});
		});

		it('accepts additional queries to the scope default', function(done) {
			odm.models.scopeDefault({prop2: false});

			Model.create({prop1: 1, prop2: true}, function(err, model1) {
				Model.create({prop1: 2, prop2: false}, function(err, model2) {
					Model.create({prop1: 1, prop2: false}, function(err, model3) {
						Model.create({prop1: 2, prop2: false}, function(err, model4) {
							Model.all(function(err, allModels) {
								allModels.should.eql([model3]);
								done();
							});
						});
					});
				});
			});
		});

	});

});