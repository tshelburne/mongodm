"use strict";

var assert = require('assert')
  , mongoskin = require('mongoskin')
  , conf = require('./config')
	, mongodm = require('../../index');

var mongo = exports.mongo = mongoskin.db('mongodb://'+conf.host+':'+conf.port+'/'+conf.name);
var odm   = exports.odm   = mongodm(conf.host, conf.port, conf.name);

exports.getModelCtor = function() {
	var Model = getCleanConstructor();
	Model.should.not.have.keys('find', 'all', 'create', 'destroyAll'); // just make sure Model is clean
	return Model;
};

exports.closeDbs = function(done) {
	mongo.close(function(err) {
		assert(err === null || err === undefined);
		odm.close(done);
	});
};

exports.clearDbs = function(done) {
	delete odm.models;
	mongo.collection('models').remove(done);
};

function getCleanConstructor() {
	return function TestModel(attrs) {
		attrs = attrs || {};

		this.prop1 = attrs.prop1 || null;
		this.prop2 = attrs.prop2 || null;
		this.prop3 = attrs.prop3 || null;
	};
}