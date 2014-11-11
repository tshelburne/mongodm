"use strict";

var assert = require('assert')
  , support = require('./support/common')
  , msDb = support.mongo
  , odm = support.odm
  , Model = null;

describe('the database service', function() {

	after(support.closeDbs);

	beforeEach(function() {
		Model = support.getModelCtor();
		odm.map(Model, 'models');
	});

	afterEach(support.clearDbs);

	describe('when mapping a model to a collection', function() {

		it('adds the collection as a property on the service', function() {
			odm.should.have.property('models');
		});

		it('builds an object with a mappable interface', function() {
			odm.models.__proto__.should.have.keys(
				// active record API
				'find', 'all', 'save', 'destroy', 'destroyAll', 'scope', 'scopeDefault',
				// mapping helpers
				'toModel', 'toDoc', 'new', 
				// relations
				'containsOne', 'findsOne', 'hasOne', 'containsMany', 'findsMany', 'hasMany'
				);
		});

		it('maps based on the object keys of an instance of the constructor', function() {
			odm.models.props.should.eql([ 'prop1', 'prop2', 'prop3' ]);
		});

		it('maps based on passed property names', function() {
			var NewModel = support.getModelCtor();
			odm.map(NewModel, 'new-models', 'prop2', 'prop3');
			odm['new-models'].props.should.eql([ 'prop2', 'prop3' ]);
			NewModel.destroyAll();
			delete odm['new-models'];
		});

	});

	describe('when finding models', function() {

		it('calls back with null for an unfound document', function(done) {
			odm.models.find('bad-id', function(err, model) {
				assert(model === null);
				done();
			});
		}); 

		it('calls back with a mapped model by id', function(done) {
			msDb.collection('models').save({ prop1: 1, prop2: 2, prop3: 3 }, function(err, result) {
				odm.models.find(result._id, function(err, model) {
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
				odm.models.find({ prop2: 2 }, function(err, model) {
					assert(!err);
					model.should.not.equal(null);
					model.should.be.an.instanceof(Model);
					model.should.have.properties({ prop1: 1, prop2: 2, prop3: 3 });
					done();
				});
			});
		});

		it('calls back with an empty array for a collection with no documents', function(done) {
			odm.models.all(function(err, models) {
				models.should.be.an.Array;
				models.should.be.empty;
				done();
			});
		});

		it('calls back with all models in a collection with documents', function(done) {
			msDb.collection('models').insert([{prop1: 1}, {prop1: 2}, {prop1: 3}], function(err, docs) {
				odm.models.all(function(err, models) {
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
				odm.models.all({prop1: {'$gt': 1}}, function(err, models) {
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
				odm.models.all({}, {sort: {prop1: -1}}, function(err, models) {
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
				odm.models.find({prop1: 1});
				odm.models.all();
				done();
			});
		});

	});

	describe('when saving models', function() {

		it('inserts new models to the db', function(done) {
			odm.models.save(new Model(1), function(err, model) {
				assert(!err);
				msDb.collection('models').findOne({prop1: 1}, function(err, doc) {
					doc.should.have.properties({prop1: 1, prop2: null, prop3: null});
					done();
				});
			});
		});

		it('appends an _id to new models', function(done) {
			odm.models.save(new Model(1), function(err, model) {
				assert(!err);
				model.should.have.property('_id');
				model._id.should.be.an.Object;
				done();
			});
		});

		it('updates existing models in the db', function(done) {
			msDb.collection('models').save({ prop1: 1, prop2: 2, prop3: 3 }, function(err, result) {
				odm.models.find(result._id, function(err, model) {
					model.prop2 = 'new value';
					odm.models.save(model, function(err, savedModel) {
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
			odm.models.save(new Model(1));
		});

	});

	describe('when destroying models', function() {

		it('destroys a given model', function(done) {
			odm.models.save(new Model(1), function(err, model1) {
				odm.models.save(new Model(null, 2), function(err, model2) {
					odm.models.destroy(model1, function(err, numRemoved) {
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
			odm.models.save(new Model(1), function(err, model1) {
				odm.models.save(new Model(null, 2), function(err, model2) {
					odm.models.destroyAll(function(err, numRemoved) {
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
			odm.models.save(new Model(1), function(err, model1) {
				odm.models.save(new Model(null, 2), function(err, model2) {
					odm.models.destroy(model1);
					odm.models.destroyAll();
					done();
				});
			});
		});

	});

});