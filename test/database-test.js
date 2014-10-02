"use strict";

var assert = require('assert')
  , mongoskin = require('mongoskin')
  , Model = null
  , conf = require('./config')
  , msDb  = mongoskin.db('mongodb://'+conf.host+':'+conf.port+'/'+conf.name)
	, mongodm = require('../index')
	, odm = mongodm(conf.host, conf.port, conf.name);

after(function(done) {
	msDb.close(function(err) {
		assert(err === null);
		odm.close(done);
	});
});

beforeEach(function() {
	Model = getCleanConstructor();
	Model.should.not.have.keys('find', 'all', 'destroyAll'); // just make sure Model is clean
	odm.map(Model, 'models');
});

afterEach(function(done) {
	delete odm.models;
	msDb.collection('models').remove(done);
});

describe('initializing the service', function() {
	var testOdm;

	beforeEach(function() {
		testOdm = null;
	});

	afterEach(function checkThatConnectionWorks(done) {
		testOdm.should.not.equal(null);
		testOdm.map.should.be.a.instanceof(Function);
		testOdm.map(getCleanConstructor(), 'models');

		msDb.collection('models').save({ prop1: 1, prop2: 2, prop3: 3 }, function(err, result) {
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

});

describe('the database service', function() {

	describe('when mapping a model to a collection', function() {

		it('adds the collection as a property on the service', function() {
			odm.should.have.property('models');
		});

		it('builds an object with a mappable interface', function() {
			odm.models.__proto__.should.have.keys('find', 'all', 'save', 'destroy', 'destroyAll', 'toModel', 'toDoc');
		});

		it('maps based on the object keys of an instance of the constructor', function() {
			odm.models.props.should.eql([ 'prop1', 'prop2', 'prop3' ]);
		});

		it('maps based on passed property names', function() {
			var NewModel = getCleanConstructor();
			odm.map(NewModel, 'new-models', 'prop2', 'prop3');
			odm['new-models'].props.should.eql([ 'prop2', 'prop3' ]);
			delete odm['new-models'];
		});

	});

	describe('when finding models', function() {

		it('calls back with null for an unfound document', function() {
			odm.models.find('bad-id', function(err, model) {
				assert(model === null);
			});
		}); 

		it('calls back with a mapped model by id', function(done) {
			msDb.collection('models').save({ prop1: 1, prop2: 2, prop3: 3 }, function(err, result) {
				odm.models.find(result._id, function(err, model) {
					assert(err === null);
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
					assert(err === null);
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
					assert(err === null);
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
			odm.models.save(new Model({prop1: 1}), function(err, model) {
				assert(err === null);
				msDb.collection('models').findOne({prop1: 1}, function(err, doc) {
					doc.should.have.properties({prop1: 1, prop2: null, prop3: null});
					done();
				});
			});
		});

		it('appends an _id to new models', function(done) {
			odm.models.save(new Model({prop1: 1}), function(err, model) {
				assert(err === null);
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
						assert(err === null);
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
			odm.models.save(new Model({prop1: 1}));
		});

	});

	describe('when destroying models', function() {

		it('destroys a given model', function(done) {
			odm.models.save(new Model({prop1: 1}), function(err, model1) {
				odm.models.save(new Model({prop1: 2}), function(err, model2) {
					odm.models.destroy(model1, function(err, numRemoved) {
						assert(err === null);
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
			odm.models.save(new Model({prop1: 1}), function(err, model1) {
				odm.models.save(new Model({prop1: 2}), function(err, model2) {
					odm.models.destroyAll(function(err, numRemoved) {
						assert(err === null);
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
			odm.models.save(new Model({prop1: 1}), function(err, model1) {
				odm.models.save(new Model({prop1: 2}), function(err, model2) {
					odm.models.destroy(model1);
					odm.models.destroyAll();
					done();
				});
			});
		});

	});

});

describe('a model mapped into the database service', function() {

	describe('when mapping a model to a collection', function() {

		it('updates the model interface', function() {
			Model.should.have.keys('find', 'all', 'create', 'destroyAll');
		});

		it('updates the model prototype interface', function() {
			(new Model()).__proto__.should.have.keys('save', 'destroy', 'id');
		});

	});

	describe('when finding models', function() {

		it('calls back with null for an unfound document', function() {
			Model.find('bad-id', function(err, model) {
				assert(model === null);
			});
		}); 

		it('calls back with a mapped model by id', function(done) {
			msDb.collection('models').save({ prop1: 1, prop2: 2, prop3: 3 }, function(err, result) {
				Model.find(result._id, function(err, model) {
					assert(err === null);
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
					assert(err === null);
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
					assert(err === null);
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
				assert(err === null);

				model.should.be.an.instanceof(Model);
				model.id().should.not.equal(null);
				done();
			});
		});

		it('inserts new models to the db', function(done) {
			var model = Model.create({prop1: 1}, function(err, model) {
				assert(err === null);
				msDb.collection('models').findOne({prop1: 1}, function(err, doc) {
					doc.should.have.properties({prop1: 1, prop2: null, prop3: null});
					done();
				});
			});
		});

		it('inserts new models to the db', function(done) {
			var model = new Model({prop1: 1});
			model.save(function(err, model) {
				assert(err === null);
				msDb.collection('models').findOne({prop1: 1}, function(err, doc) {
					doc.should.have.properties({prop1: 1, prop2: null, prop3: null});
					done();
				});
			});
		});

		it('appends an _id to new models (accessible via #id)', function(done) {
			var model = new Model({prop1: 1});
			model.save(function(err, model) {
				assert(err === null);
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
						assert(err === null);
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
			var model1 = new Model({prop1: 1});
			model1.save();
		});

	});

	describe('when destroying models', function() {

		it('destroys a given model', function(done) {
			var model1 = new Model({prop1: 1});
			model1.save(function(err, model1) {
				var model2 = new Model({prop1: 2});
				model2.save(function(err, model2) {
					model1.destroy(function(err, numRemoved) {
						assert(err === null);
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
			var model1 = new Model({prop1: 1});
			model1.save(function(err, model1) {
				var model2 = new Model({prop1: 2});
				model2.save(function(err, model2) {
					Model.destroyAll(function(err, numRemoved) {
						assert(err === null);
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
			var model1 = new Model({prop1: 1});
			model1.save(function(err, model1) {
				var model2 = new Model({prop1: 2});
				model2.save(function(err, model2) {
					model1.destroy();
					Model.destroyAll();
					done();
				});
			});
		});

	});

});

function getCleanConstructor() {
	return function TestModel(attrs) {
		attrs = attrs || {};

		this.prop1 = attrs.prop1 || null;
		this.prop2 = attrs.prop2 || null;
		this.prop3 = attrs.prop3 || null;
	};
}