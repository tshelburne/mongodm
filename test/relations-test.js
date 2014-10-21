"use strict";

var assert = require('assert')
  , support = require('./support/common')
  , msDb = support.mongo
  , odm = support.odm
  , Parent = null
  , Child = null;

describe("relationships", function() {

	after(support.closeDbs);
	
	beforeEach(function() {
		Parent = support.getModelCtor();
		Child = support.getModelCtor();
		Parent.should.not.equal(Child);
		odm.map(Parent, 'parents');
		odm.map(Child, 'prop1');
	});

	afterEach(support.clearDbs);

	describe("when writing one to one", function() {
		
		it("creates an inline relationship", function(done) {
			odm.parents.containsOne(odm.prop1, 'prop1');
			Parent.create({ prop1: new Child(1) }, function(err, parent) {
				msDb.collection('parents').findById(parent.id(), function(err, pResult) {
					pResult.prop1.should.eql({ prop1: 1, prop2: null, prop3: null });
					done();
				});
			});
		});
		
		xit("creates a findsOne relationship", function(done) {
			odm.parents.findsOne(odm.prop1, 'prop1');
			Parent.create({ prop1: new Child(1) }, function(err, parent) {
				msDb.collection('parents').findById(parent.id(), function(err, pResult) {
					assert(pResult.prop1 === null);
					msDb.collection('prop1').find({parent_id: pResult._id}).toArray(function(err, cResults) {
						cResults.should.have.length(1);
						cResults[0].should.eql({ prop1: 1, prop2: null, prop3: null, parent_id: pResult._id });
						done();
					});
				});
			});
		});

		xit("creates a hasOne relationship", function(done) {
			odm.parents.hasOne(odm.prop1, 'prop1');
			Parent.create({ prop1: new Child(1) }, function(err, parent) {
				msDb.collection('parents').findById(parent.id(), function(err, pResult) {
					msDb.collection('prop1').findById(pResult.prop1, function(err, cResult) {
						cResult.should.eql({ prop1: 1, prop2: null, prop3: null });
						done();
					});
				});
			});
		});

	});

	describe("when writing one to many", function() {
		
		it("creates an inline relationship", function(done) {
			odm.parents.containsMany(odm.prop1, 'prop1');
			Parent.create({ prop1: [ new Child(1), new Child(2) ] }, function(err, parent) {
				msDb.collection('parents').findById(parent.id(), function(err, pResult) {
					pResult.prop1.should.be.an.Array;
					pResult.prop1[0].should.eql({ prop1: 1, prop2: null, prop3: null });
					pResult.prop1[1].should.eql({ prop1: 2, prop2: null, prop3: null });
					done();
				});
			});
		});
		
		xit("creates a findsMany relationship", function(done) {
			odm.parents.findsMany(odm.prop1, 'prop1');
			Parent.create({ prop1: [ new Child(1), new Child(2) ] }, function(err, parent) {
				msDb.collection('parents').findById(parent.id(), function(err, pResult) {
					assert(pResult.prop1 === null);
					msDb.collection('prop1').find({parent_id: pResult._id}).toArray(function(err, cResults) {
						cResults.should.have.length(2);
						cResults[0].should.eql({ prop1: 1, prop2: null, prop3: null, parent_id: pResult._id });
						cResults[1].should.eql({ prop1: 2, prop2: null, prop3: null, parent_id: pResult._id });
						done();
					});
				});
			});
		});

		xit("creates a hasMany relationship", function(done) {
			odm.parents.hasMany(odm.prop1, 'prop1');
			Parent.create({ prop1: [ new Child(1), new Child(2) ] }, function(err, parent) {
				msDb.collection('parents').findById(parent.id(), function(err, pResult) {
					msDb.collection('prop1').find({_id:{$in: pResult.prop1}}).toArray(function(err, cResults) {
						cResults.should.have.length(2);
						cResults[0].should.eql({ prop1: 1, prop2: null, prop3: null });
						cResults[1].should.eql({ prop1: 2, prop2: null, prop3: null });
						done();
					});
				});
			});
		});

	});
	
	describe("when reading one to one", function() {

		it("resolves an inline relationship", function(done) {
			odm.parents.containsOne(odm.prop1, 'prop1');
			msDb.collection('parents').save({ prop1: { prop1: 1, prop2: 2, prop3: 3 } }, function(err, pResult) {
				Parent.find(pResult._id, function(err, parent) {
					parent.prop1.should.be.an.instanceof.Child;
					parent.prop1.prop1.should.equal(1);
					parent.prop1.prop2.should.equal(2);
					parent.prop1.prop3.should.equal(3);
					done();
				});
			});
		});
		
		xit("resolves a findsOne relationship", function(done) {
			odm.parents.findsOne(odm.prop1, 'prop1');
			msDb.collection('parents').save({}, function(err, pResult) {
				msDb.collection('prop1').save({ prop1: 1, prop2: 2, prop3: 3, parent_id: pResult._id }, function(err, cResult) {
					Parent.find(pResult._id, function(err, parent) {
						parent.prop1.should.be.an.instanceof.Child;
						parent.prop1.prop1.should.equal(1);
						parent.prop1.prop2.should.equal(2);
						parent.prop1.prop3.should.equal(3);
						done();
					});
				});
			});
		});

		xit("resolves a hasOne relationship", function(done) {
			odm.parents.hasOne(odm.prop1, 'prop1');
			msDb.collection('prop1').save({ prop1: 1, prop2: 2, prop3: 3 }, function(err, cResult) {
				msDb.collection('parents').save({ prop1: cResult._id }, function(err, pResult) {
					Parent.find(pResult._id, function(err, parent) {
						parent.prop1.should.be.an.instanceof.Child;
						parent.prop1.prop1.should.equal(1);
						parent.prop1.prop2.should.equal(2);
						parent.prop1.prop3.should.equal(3);
						done();
					});
				});
			});
		});

	});

	describe("when reading one to many", function() {

		it("resolves an inline relationship", function(done) {
			odm.parents.containsMany(odm.prop1, 'prop1');
			msDb.collection('parents').save({ prop1: [ { prop1: 1 }, { prop1: 2 } ] }, function(err, pResult) {
				Parent.find(pResult._id, function(err, parent) {
					parent.prop1.should.be.an.Array;
					parent.prop1.forEach(function(child) {
						child.should.be.an.instanceof.Child;
					});
					parent.prop1[0].prop1.should.equal(1);
					parent.prop1[1].prop1.should.equal(2);
					done();
				});
			});
		});
		
		xit("resolves a findsMany relationship", function(done) {
			odm.parents.findsMany(odm.prop1, 'prop1');
			msDb.collection('parents').save({}, function(err, pResult) {
				msDb.collection('prop1').save({ prop1: 1, parent_id: pResult._id }, function(err, c1Result) {
					msDb.collection('prop1').save({ prop1: 2, parent_id: pResult._id }, function(err, c2Result) {
						Parent.find(pResult._id, function(err, parent) {
							parent.prop1.should.be.an.Array;
							parent.prop1.forEach(function(child) {
								child.should.be.an.instanceof.Child;
							});
							parent.prop1[0].prop1.should.equal(1);
							parent.prop1[1].prop1.should.equal(2);
							done();
						});
					});
				});
			});
		});

		xit("resolves a hasMany relationship", function(done) {
			odm.parents.hasMany(odm.prop1, 'prop1');
			msDb.collection('prop1').save({ prop1: 1 }, function(err, c1Result) {
				msDb.collection('prop1').save({ prop1: 2 }, function(err, c2Result) {
					msDb.collection('parents').save({ prop1: [ c1Result._id, c2Result._id ] }, function(err, pResult) {
							Parent.find(pResult._id, function(err, parent) {
							parent.prop1.should.be.an.Array;
							parent.prop1.forEach(function(child) {
								child.should.be.an.instanceof.Child;
							});
							parent.prop1[0].prop1.should.equal(1);
							parent.prop1[1].prop1.should.equal(2);
							done();
						});
					});
				});
			});
		});

	});

});