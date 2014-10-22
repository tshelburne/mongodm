"use strict";

var assert = require('assert')
  , support = require('./support/common')
  , msDb = support.mongo
  , odm = support.odm
  , Model = null;

describe('a model mapped into the database service', function() {

	after(support.closeDbs);

	beforeEach(function() {
		Model = support.getModelCtor();
		odm.map(Model, 'models');
	});

	afterEach(support.clearDbs);

	describe('when mapping a model to a collection', function() {

		it('updates the model interface', function() {
			Model.should.have.keys('find', 'all', 'create', 'destroyAll', 'containsOne', 'findsOne', 'hasOne', 'containsMany', 'findsMany', 'hasMany', 'on');
		});

		it('updates the model prototype interface', function() {
			(new Model()).__proto__.should.have.keys('save', 'destroy', 'id');
		});

	});

	describe('when finding models', function() {

		it('calls back with null for an unfound document', function(done) {
			Model.find('bad-id', function(err, model) {
				assert(model === null);
				done();
			});
		}); 

		it('calls back with a mapped model by id', function(done) {
			msDb.collection('models').save({ prop1: 1, prop2: 2, prop3: 3 }, function(err, result) {
				Model.find(result._id, function(err, model) {
					assert(!err);
					model.should.not.equal(null);
					model.should.be.an.instanceof(Model);
					model.should.have.properties({ prop1: 1, prop2: 2, prop3: 3 });
					done();
				});
			});
		});

		it('calls back with a mapped model by query', function(done) {
			msDb.collection('models').save({ prop1: 1, prop2: 2, prop3: 3 }, function(err, result) {
				Model.find({ prop2: 2 }, function(err, model) {
					assert(!err);
					model.should.not.equal(null);
					model.should.be.an.instanceof(Model);
					model.should.have.properties({ prop1: 1, prop2: 2, prop3: 3 });
					done();
				});
			});
		});

		it('calls back with an empty array for a collection with no documents', function(done) {
			Model.all(function(err, models) {
				models.should.be.an.Array;
				models.should.be.empty;
				done();
			});
		});

		it('calls back with all models in a collection with documents', function(done) {
			msDb.collection('models').insert([{prop1: 1}, {prop1: 2}, {prop1: 3}], function(err, docs) {
				Model.all(function(err, models) {
					assert(!err);
					models.should.be.an.Array;
					models.should.have.length(3);
					models.forEach(function(model) {
						model.should.be.an.instanceof(Model);
						model.prop1.should.not.equal(null);
						model.should.have.properties({prop2: null, prop3: null});
					});
					done();
				});
			});
		});

		it('calls back with all models in a collection modified by a query', function(done) {
			msDb.collection('models').insert([{prop1: 1}, {prop1: 2}, {prop1: 3}], function(err, docs) {
				Model.all({prop1: {'$gt': 1}}, function(err, models) {
					assert(!err);
					models.should.be.an.Array;
					models.should.have.length(2);
					models[0].prop1.should.equal(2);
					models[1].prop1.should.equal(3);
					done();
				});
			});
		});

		it('calls back with all models in a collection modified by options sent to find', function(done) {
			msDb.collection('models').insert([{prop1: 1}, {prop1: 2}, {prop1: 3}], function(err, docs) {
				Model.all({}, {sort: {prop1: -1}}, function(err, models) {
					assert(!err);
					models.should.be.an.Array;
					models.should.have.length(3);
					models[0].prop1.should.equal(3);
					models[1].prop1.should.equal(2);
					models[2].prop1.should.equal(1);
					done();
				});
			});
		});

		// this just means your program won't break because you haven't added a callback
		it('allows finding without a callback', function(done) {
			msDb.collection('models').insert([{prop1: 1}, {prop1: 2}, {prop1: 3}], function(err, docs) {
				Model.find({prop1: 1});
				Model.all();
				done();
			});
		});

	});

	describe('when saving models', function() {

		it('creates a new model and returns the result', function(done) {
			var model = Model.create({prop1: 1}, function(err, model) {
				assert(!err);

				model.should.be.an.instanceof(Model);
				model.id().should.not.equal(null);
				done();
			});
		});

		it('inserts new models to the db', function(done) {
			var model = Model.create({prop1: 1}, function(err, model) {
				assert(!err);
				msDb.collection('models').findOne({prop1: 1}, function(err, doc) {
					doc.should.have.properties({prop1: 1, prop2: null, prop3: null});
					done();
				});
			});
		});

		it('inserts new models to the db', function(done) {
			var model = new Model(1);
			model.save(function(err, model) {
				assert(!err);
				msDb.collection('models').findOne({prop1: 1}, function(err, doc) {
					doc.should.have.properties({prop1: 1, prop2: null, prop3: null});
					done();
				});
			});
		});

		it('appends an _id to new models (accessible via #id)', function(done) {
			var model = new Model(1);
			model.save(function(err, model) {
				assert(!err);
				model.should.have.property('_id');
				model.id().should.be.an.Object;
				model.id().should.equal(model._id);
				done();
			});
		});

		it('updates existing models in the db', function(done) {
			msDb.collection('models').save({ prop1: 1, prop2: 2, prop3: 3 }, function(err, result) {
				Model.find(result._id, function(err, model) {
					model.prop2 = 'new value';
					model.save(function(err, savedModel) {
						assert(!err);
						msDb.collection('models').findOne({_id: model._id}, function(err, doc) {
							doc.should.have.properties({prop1: 1, prop2: 'new value', prop3: 3});
							done();
						});
					});
				});
			});
		});

		// this just means your program won't break because you haven't added a callback
		it('allows saving without a callback', function() {
			var model1 = new Model(1);
			model1.save();
		});

	});

	describe('when destroying models', function() {

		it('destroys a given model', function(done) {
			var model1 = new Model(1);
			model1.save(function(err, model1) {
				var model2 = new Model(null, 2);
				model2.save(function(err, model2) {
					model1.destroy(function(err, numRemoved) {
						assert(!err);
						assert(numRemoved === 1);
						msDb.collection('models').count(function(err, count) {
							count.should.equal(1);
							done();
						});
					});
				});
			});
		});

		it('destroys all models', function(done) {
			var model1 = new Model(1);
			model1.save(function(err, model1) {
				var model2 = new Model(null, 2);
				model2.save(function(err, model2) {
					Model.destroyAll(function(err, numRemoved) {
						assert(!err);
						assert(numRemoved === 2);
						msDb.collection('models').count(function(err, count) {
							count.should.equal(0);
							done();
						});
					});
				});
			});
		});

		// this just means your program won't break because you haven't added a callback
		it('allows destroying without a callback', function(done) {
			var model1 = new Model(1);
			model1.save(function(err, model1) {
				var model2 = new Model(null, 2);
				model2.save(function(err, model2) {
					model1.destroy();
					Model.destroyAll();
					done();
				});
			});
		});

	});

});