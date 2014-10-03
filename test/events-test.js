"use strict";

var assert = require('assert')
  , support = require('./support/common')
  , msDb = support.mongo
  , odm = support.odm
  , Model = null;

describe('mapping events', function() {

	after(support.closeDbs);

	beforeEach(function() {
		Model = function(notMapped) {
			this.mapped = null;
			this.notMapped = notMapped;
		};
		odm.map(Model, 'models', 'mapped');
	});

	afterEach(support.clearDbs);

	it('maps a document to a model without a registered listener', function(done) {
		Model.create({mapped: 'persisted'}, function(err, model) {
			assert(err === null);
			model.mapped.should.equal('persisted');
			assert(model.notMapped === undefined);
			done();
		});
	});

	it('maps a document to a model according to a set new function', function(done) {
		odm.models.new = function(doc) {
			return new Model('injected');
		};

		Model.create({mapped: 'persisted'}, function(err, model) {
			assert(err === null);
			model.mapped.should.equal('persisted');
			model.notMapped.should.equal('injected');
			done();
		});
	});

});

describe('database events', function() {

	after(support.closeDbs);

	beforeEach(function() {
		Model = support.getModelCtor();
		odm.map(Model, 'models');
	});

	afterEach(support.clearDbs);

	it('adds a listener method to models', function() {
		Model.on.should.be.a.Function;
	});

	describe('when creating', function() {

		it('fires "pre" events from the db service', function(done) {
			odm.models.on('creating', function(model) {
				model.prop2 = 2;
			});
			odm.models.on('saving', function(model) {
				model.prop3 = 3;
			});
			var model = new Model({prop1: 1});
			odm.models.save(model, function(err, saved) {
				saved.prop2.should.equal(2);
				saved.prop3.should.equal(3);
				done();
			});
		});

		it('fires "pre" events from the model on create', function(done) {
			Model.on('creating', function(model) {
				model.prop2 = 2;
			});
			Model.on('saving', function(model) {
				model.prop3 = 3;
			});
			Model.create({prop1: 1}, function(err, model) {
				model.prop2.should.equal(2);
				model.prop3.should.equal(3);
				done();
			});
		});

		it('fires "pre" events from the model on save', function(done) {
			Model.on('creating', function(model) {
				model.prop2 = 2;
			});
			Model.on('saving', function(model) {
				model.prop3 = 3;
			});
			var model = new Model({prop1: 1});
			model.save(function(err, saved) {
				saved.prop2.should.equal(2);
				saved.prop3.should.equal(3);
				done();
			});
		});

		it('fires "post" events from the db service', function(done) {
			odm.models.on('created', function(model) {
				model.prop2 = 2;
			});
			odm.models.on('saved', function(model) {
				model.prop3 = 3;
			});
			var model = new Model({prop1: 1});
			odm.models.save(model, function(err, saved) {
				saved.prop2.should.equal(2);
				saved.prop3.should.equal(3);
				done();
			});
		});

		it('fires "post" events from the model on create', function(done) {
			Model.on('created', function(model) {
				model.prop2 = 2;
			});
			Model.on('saved', function(model) {
				model.prop3 = 3;
			});
			Model.create({prop1: 1}, function(err, model) {
				model.prop2.should.equal(2);
				model.prop3.should.equal(3);
				done();
			});
		});

		it('fires "post" events from the model on save', function(done) {
			Model.on('created', function(model) {
				model.prop2 = 2;
			});
			Model.on('saved', function(model) {
				model.prop3 = 3;
			});
			var model = new Model({prop1: 1});
			model.save(function(err, saved) {
				saved.prop2.should.equal(2);
				saved.prop3.should.equal(3);
				done();
			});
		});

	});

	describe('when updating', function() {

		it('fires "pre" events from the db service', function(done) {
			odm.models.on('updating', function(model) {
				model.prop2 = 2;
			});
			var model = new Model({prop1: 1});
			odm.models.save(model, function(err, saved) {
				odm.models.on('saving', function(model) {
					model.prop3 = 3;
				});
				assert(saved.prop2 === null);
				assert(saved.prop3 === null);
				saved.prop1 = 5;
				odm.models.save(saved, function(err, updated) {
					updated.prop2.should.equal(2);
					updated.prop3.should.equal(3);
					done();
				});
			});
		});

		it('fires "pre" events from the model on update', function(done) {
			Model.on('updating', function(model) {
				model.prop2 = 2;
			});
			Model.create({prop1: 1}, function(err, model) {
				Model.on('saving', function(model) {
					model.prop3 = 3;
				});
				assert(model.prop2 === null);
				assert(model.prop3 === null);
				model.prop1 = 5;
				model.save(function(err, updated) {
					updated.prop2.should.equal(2);
					updated.prop3.should.equal(3);
					done();
				});
			});
		});

		it('fires "post" events from the db service', function(done) {
			odm.models.on('updated', function(model) {
				model.prop2 = 2;
			});
			var model = new Model({prop1: 1});
			odm.models.save(model, function(err, saved) {
				odm.models.on('saved', function(model) {
					model.prop3 = 3;
				});
				assert(saved.prop2 === null);
				assert(saved.prop3 === null);
				saved.prop1 = 5;
				odm.models.save(saved, function(err, updated) {
					updated.prop2.should.equal(2);
					updated.prop3.should.equal(3);
					done();
				});
			});
		});

		it('fires "post" events from the model on update', function(done) {
			Model.on('updated', function(model) {
				model.prop2 = 2;
			});
			Model.create({prop1: 1}, function(err, model) {
				Model.on('saved', function(model) {
					model.prop3 = 3;
				});
				assert(model.prop2 === null);
				assert(model.prop3 === null);
				model.prop1 = 5;
				model.save(function(err, updated) {
					updated.prop2.should.equal(2);
					updated.prop3.should.equal(3);
					done();
				});
			});
		});

	});

	describe('when destroying', function() {

		it('fires "pre" events from the db service', function(done) {
			var destroying = false;
			odm.models.on('destroying', function(model) {
				destroying = true;
			});
			var model = new Model({prop1: 1});
			odm.models.save(model, function(err, saved) {
				destroying.should.be.false;
				odm.models.destroy(saved, function() {
					destroying.should.be.true;
					done();
				});
			});
		});

		it('fires "pre" events from the model on destroye', function(done) {
			var destroying = false;
			Model.on('destroying', function(model) {
				destroying = true;;
			});
			Model.create({prop1: 1}, function(err, model) {
				destroying.should.be.false;
				model.destroy(function() {
					destroying.should.be.true;
					done();
				});
			});
		});

		it('fires "post" events from the db service', function(done) {
			var destroyed = false;
			odm.models.on('destroyed', function(model) {
				destroyed = true;
			});
			var model = new Model({prop1: 1});
			odm.models.save(model, function(err, saved) {
				destroyed.should.be.false;
				odm.models.destroy(saved, function() {
					destroyed.should.be.true;
					done();
				});
			});
		});

		it('fires "post" events from the model on destroye', function(done) {
			var destroyed = false;
			Model.on('destroyed', function(model) {
				destroyed = true;;
			});
			Model.create({prop1: 1}, function(err, model) {
				destroyed.should.be.false;
				model.destroy(function() {
					destroyed.should.be.true;
					done();
				});
			});
		});

	});

});