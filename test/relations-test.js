/* global describe, after, beforeEach, afterEach, it, xit */

'use strict';

var assert = require('assert')
  , support = require('./support/common')
  , msDb = support.mongo
  , odm = support.odm
  , Parent = null
  , Child = null;

describe('relationships', function() {

	after(support.closeDbs);
	
	beforeEach(function() {
		Parent = support.getModelCtor();
		Child = support.getModelCtor();
		Parent.should.not.equal(Child);
		odm.map(Parent, 'parents');
		odm.map(Child, 'prop1');
	});

	afterEach(support.clearDbs.bind(undefined, 'parents'));
	afterEach(support.clearDbs.bind(undefined, 'prop1'));

	describe('when writing one to one', function() {
		
		it('creates an embedded relationship', function(done) {
			Parent.containsOne(odm.prop1, 'prop1');
			Parent.create({ prop1: new Child(1) }, function(err, parent) {
				msDb.collection('parents').findById(parent.id(), function(err, pResult) {
					pResult.prop1.should.eql({ prop1: 1, prop2: null, prop3: null });
					done();
				});
			});
		});
		
		it('creates a findsOne relationship', function(done) {
			Parent.findsOne(odm.prop1, 'prop1', 'parent_id');
			var child = new Child(1);
			Parent.create({ prop1: child }, function(err, parent) {
				assert(!child.parent_id);
				msDb.collection('parents').findById(parent.id(), function(err, pResult) {
					assert(!pResult.prop1);
					msDb.collection('prop1').find({parent_id: pResult._id}).toArray(function(err, cResults) {
						cResults.should.have.length(1);
						cResults[0].prop1.should.equal(1);
						cResults[0].parent_id.should.eql(pResult._id);
						done();
					});
				});
			});
		});

		it('creates a hasOne relationship', function(done) {
			Parent.hasOne(odm.prop1, 'prop1');
			Child.create({ prop1: 1 }, function(err, child) {
				Parent.create({ prop1: child }, function(err, parent) {
					msDb.collection('parents').findById(parent.id(), function(err, pResult) {
						msDb.collection('prop1').findById(pResult.prop1, function(err, cResult) {
							cResult.should.not.equal(null);
							cResult.prop1.should.equal(1);
							done();
						});
					});
				});
			});
		});

	});

	describe('when writing one to many', function() {
		
		it('creates an embedded relationship', function(done) {
			Parent.containsMany(odm.prop1, 'prop1');
			Parent.create({ prop1: [ new Child(1), new Child(2) ] }, function(err, parent) {
				msDb.collection('parents').findById(parent.id(), function(err, pResult) {
					pResult.prop1.should.be.an.Array;
					pResult.prop1[0].should.eql({ prop1: 1, prop2: null, prop3: null });
					pResult.prop1[1].should.eql({ prop1: 2, prop2: null, prop3: null });
					done();
				});
			});
		});
		
		it('creates a findsMany relationship', function(done) {
			Parent.findsMany(odm.prop1, 'prop1', 'parent_id');
			var child1 = new Child(1);
			Child.create({prop1: 2}, function(err, child2) {
				Parent.create({ prop1: [ child1, child2 ] }, function(err, parent) {
					assert(!child1.parent_id);
					assert(!child2.parent_id);
					msDb.collection('parents').findById(parent.id(), function(err, pResult) {
						assert(!pResult.prop1);
						msDb.collection('prop1').find({parent_id: pResult._id}, {sort: {_id: -1}}).toArray(function(err, cResults) {
							cResults.should.have.length(2);
							cResults[0].prop1.should.equal(1);
							cResults[0].parent_id.should.eql(pResult._id);
							cResults[1].prop1.should.equal(2);
							cResults[1].parent_id.should.eql(pResult._id);
							done();
						});
					});
				});
			});
		});

		it('creates a hasMany relationship', function(done) {
			Parent.hasMany(odm.prop1, 'prop1');
			Child.create({prop1: 1}, function(err, child1) {
				Child.create({prop1: 2}, function(err, child2) {
					Parent.create({ prop1: [ child1, child2 ] }, function(err, parent) {
						msDb.collection('parents').findById(parent.id(), function(err, pResult) {
							msDb.collection('prop1').find({_id:{$in: pResult.prop1}}, {sort: {_id: 1}}).toArray(function(err, cResults) {
								cResults.should.have.length(2);
								cResults[0].prop1.should.equal(1);
								cResults[1].prop1.should.equal(2);
								done();
							});
						});
					});
				});
			});
		});

	});
	
	describe('when reading one to one', function() {

		it('resolves an embedded relationship', function(done) {
			Parent.containsOne(odm.prop1, 'prop1');
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
		
		it('resolves a findsOne relationship', function(done) {
			Parent.findsOne(odm.prop1, 'prop1', 'parent_id');
			msDb.collection('parents').save({}, function(err, pResult) {
				msDb.collection('prop1').save({ prop1: 1, prop2: 2, prop3: 3, parent_id: pResult._id }, function() {
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

		it('resolves a hasOne relationship', function(done) {
			Parent.hasOne(odm.prop1, 'prop1');
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

		it('resolves embedded relationships with all', function(done) {
			Parent.containsOne(odm.prop1, 'prop1');
			msDb.collection('parents').save({ prop1: { prop1: 1, prop2: 2, prop3: 3 } }, function(err, pResult1) {
				msDb.collection('parents').save({ prop1: { prop1: 4, prop2: 5, prop3: 6 } }, function(err, pResult2) {
					Parent.all(function(err, parents) {
						parents[0].prop1.should.be.an.instanceof.Child;
						parents[1].prop1.should.be.an.instanceof.Child;
						parents[0].prop1.prop1.should.equal(1);
						parents[0].prop1.prop2.should.equal(2);
						parents[0].prop1.prop3.should.equal(3);
						parents[1].prop1.prop1.should.equal(4);
						parents[1].prop1.prop2.should.equal(5);
						parents[1].prop1.prop3.should.equal(6);
						done();
					});
				});
			});
		});

		it('resolves findsOne relationships with all', function(done) {
			Parent.findsOne(odm.prop1, 'prop1', 'parent_id');
			msDb.collection('parents').save({}, function(err, pResult1) {
				msDb.collection('parents').save({}, function(err, pResult2) {
					msDb.collection('prop1').save({ prop1: 1, prop2: 2, prop3: 3, parent_id: pResult1._id }, function(err, cResult) {
						msDb.collection('prop1').save({ prop1: 4, prop2: 5, prop3: 6, parent_id: pResult2._id }, function(err, cResult) {
							Parent.all(function(err, parents) {
								parents[0].prop1.should.be.an.instanceof.Child;
								parents[1].prop1.should.be.an.instanceof.Child;
								parents[0].prop1.prop1.should.equal(1);
								parents[0].prop1.prop2.should.equal(2);
								parents[0].prop1.prop3.should.equal(3);
								parents[1].prop1.prop1.should.equal(4);
								parents[1].prop1.prop2.should.equal(5);
								parents[1].prop1.prop3.should.equal(6);
								done();
							});
						});
					});
				});
			});
		});

		it('resolves hasOne relationships with all', function(done) {
			Parent.hasOne(odm.prop1, 'prop1');
			msDb.collection('prop1').save({ prop1: 1, prop2: 2, prop3: 3 }, function(err, cResult) {
				msDb.collection('parents').save({ prop1: cResult._id }, function() {
					msDb.collection('parents').save({ prop1: cResult._id }, function() {
						Parent.all(function(err, parents) {
							parents[0].prop1.should.be.an.instanceof.Child;
							parents[1].prop1.should.be.an.instanceof.Child;
							parents[0].prop1.prop1.should.equal(1);
							parents[0].prop1.prop2.should.equal(2);
							parents[0].prop1.prop3.should.equal(3);
							parents[1].prop1.prop1.should.equal(1);
							parents[1].prop1.prop2.should.equal(2);
							parents[1].prop1.prop3.should.equal(3);
							done();
						});
					});
				});
			});
		});

	});

	describe('when reading one to many', function() {

		it('resolves an embedded relationship', function(done) {
			Parent.containsMany(odm.prop1, 'prop1');
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
		
		it('resolves a findsMany relationship', function(done) {
			Parent.findsMany(odm.prop1, 'prop1', 'parent_id');
			msDb.collection('parents').save({}, function(err, pResult) {
				msDb.collection('prop1').save({ prop1: 1, parent_id: pResult._id }, function(err, cResult1) {
					msDb.collection('prop1').save({ prop1: 2, parent_id: pResult._id }, function(err, cResult2) {
						Parent.find(pResult._id, function(err, parent) {
							parent.prop1.should.have.length(2);
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

		it('resolves a hasMany relationship', function(done) {
			Parent.hasMany(odm.prop1, 'prop1');
			msDb.collection('prop1').save({ prop1: 1 }, function(err, cResult1) {
				msDb.collection('prop1').save({ prop1: 2 }, function(err, cResult2) {
					msDb.collection('parents').save({ prop1: [ cResult1._id, cResult2._id ] }, function(err, pResult) {
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

		it('resolves embedded relationships with all', function(done) {
			Parent.containsMany(odm.prop1, 'prop1');
			msDb.collection('parents').save({ prop1: [ { prop1: 1 }, { prop1: 2 } ] }, function(err, pResult1) {
				msDb.collection('parents').save({prop1: [{prop1: 3}]}, function(err, pResult2) {
					Parent.all(function(err, parents) {
						parents.forEach(function(parent) {
							parent.prop1.should.be.an.Array;
							parent.prop1.forEach(function(child) {
								child.should.be.an.instanceof.Child;
							});
						});
						parents[0].prop1[0].prop1.should.equal(1);
						parents[0].prop1[1].prop1.should.equal(2);
						parents[1].prop1[0].prop1.should.equal(3);
						done();
					});
				});
			});
		});

		it('resolves findsMany relationships with all', function(done) {
			Parent.findsMany(odm.prop1, 'prop1', 'parent_id');
			msDb.collection('parents').save({}, function(err, pResult1) {
				msDb.collection('parents').save({}, function(err, pResult2) {
					msDb.collection('prop1').save({ prop1: 1, parent_id: pResult1._id }, function(err, cResult1) {
						msDb.collection('prop1').save({ prop1: 2, parent_id: pResult2._id }, function(err, cResult2) {
							msDb.collection('prop1').save({ prop1: 3, parent_id: pResult1._id }, function(err, cResult2) {
								Parent.all(function(err, parents) {
									parents.forEach(function(parent) {
										parent.prop1.should.be.an.Array;
										parent.prop1.forEach(function(child) {
											child.should.be.an.instanceof.Child;
										});
									});
									parents[0].prop1[0].prop1.should.equal(1);
									parents[0].prop1[1].prop1.should.equal(3);
									parents[1].prop1[0].prop1.should.equal(2);
									done();
								});
							});
						});
					});
				});
			});
		});

		it('resolves hasMany relationships with all', function(done) {
			Parent.hasMany(odm.prop1, 'prop1');
			msDb.collection('prop1').save({ prop1: 1 }, function(err, cResult1) {
				msDb.collection('prop1').save({ prop1: 2 }, function(err, cResult2) {
					msDb.collection('parents').save({ prop1: [ cResult1._id, cResult2._id ] }, function(err, pResult1) {
						msDb.collection('parents').save({prop1: [ cResult2._id ]}, function(err, pResult2) {
							Parent.all(function(err, parents) {
								parents.forEach(function(parent) {
									parent.prop1.should.be.an.Array;
									parent.prop1.forEach(function(child) {
										child.should.be.an.instanceof.Child;
									});
								});
								parents[0].prop1[0].prop1.should.equal(1);
								parents[0].prop1[1].prop1.should.equal(2);
								parents[1].prop1[0].prop1.should.equal(2);
								done();
							});
						});
					});
				});
			});
		});

	});

});