'use strict';

var EventEmitter = require('events').EventEmitter,
  util = require('util'),
  mongo = require('mongoskin');

module.exports = Mapper;

util.inherits(Mapper, EventEmitter);

/**
 * a basic mapper to handle mapping a set of properties between documents of a
 * given constructor and collection
 *
 * ctor {Function} constructor being mapped
 * coll {Object} mongoskin collection
 * props {Array} all properties that will be mapped to the database
 */
function Mapper(ctor, coll, props) {
  this.ctor = ctor;
  this.coll = coll;
  this.props = props;
}

/**
 * find a model by id or by query
 *
 * idOrQuery {String|Object} the id as a string, or a standard mongo query object
 * [cb] {Function} a standard node callback which will receive the model as the second
 *   argument upon success
 */
Mapper.prototype.find = function(idOrQuery, cb) {
  var query = (typeof idOrQuery === 'string') ? {_id: mongo.helper.toObjectID(idOrQuery)} : idOrQuery;

  this.coll.findOne(query, wrap(cb, this.toModel.bind(this)));
};

/**
 * find all models
 *
 * [query] {Object} a query to apply to the all request
 * [options] {Object} options to pass to find for modifying the query
 * [cb] {Function} a standard node callback which will receive the models as the second
 *   argument upon success
 */
Mapper.prototype.all = function() {
  var self = this,
    args = Array.prototype.slice.call(arguments),
    cb = args.pop();

  this.coll.find.apply(this.coll, args).toArray(wrap(cb, function toModels(docs) {
    if (!exists(docs)) { return []; }
    return docs.map(self.toModel.bind(self));
  }));
};

/**
 * save or update a model
 *
 * modelOrHash {Object} the model to persist; alternatively, it can be passed a hash that will be mapped to a model
 * [cb] {Function} a standard node callback which will receive the most up-to-date model
 *   as the second argument upon success
 */
Mapper.prototype.save = function(modelOrHash, cb) {
  var self = this,
    model = (modelOrHash instanceof self.ctor) ? modelOrHash : self.toModel(modelOrHash);

  self.emit('saving', model);
  var doc = self.toDoc(model);
  if (exists(model._id)) {
    self.emit('updating', model);
    self.coll.updateById(model._id, doc, wrap(cb, function returnModel() {
      self.emit('updated', model);
      self.emit('saved', model);
      return model;
    }));
  } else {
    self.emit('creating', model);
    self.coll.insert(doc, {w: 1}, wrap(cb, function addIdAndReturnModel(results) {
      model._id = results[0]._id;
      self.emit('created', model);
      self.emit('saved', model);
      return model;
    }));
  }
};

/**
 * destroy a model
 *
 * model {Object} the model to destroy
 * [cb] {Function} a standard node callback which will receive the number of documents
 *   removed as the second argument upon success
 */
Mapper.prototype.destroy = function(model, cb) {
  var self = this;
  self.emit('destroying', model);
  this.coll.removeById(model._id, function(err, result) {
    self.emit('destroyed', model);
    wrap(cb)(err, result);
  });
};

/**
 * deletes the entire collection
 *
 * [cb] {Function} a standard node callback which will receive the number of documents
 *   removed as the second argument upon success
 */
Mapper.prototype.destroyAll = function(cb) {
  this.coll.remove(wrap(cb));
};

/**
 * maps a document from the db to a model of type this.ctor
 *
 * doc {Object} the doc to map
 * @returns {Object}
 */
Mapper.prototype.toModel = function(doc) {
  if (!exists(doc)) { return null; }

  return map(doc, this.new(doc));
};

/**
 * maps a model to a document as described by this.props
 *
 * model {Object} the model to map
 * @returns {Object}
 */
Mapper.prototype.toDoc = function(model) {
  if (!exists(model)) { return null; }

  return map(model, {}, this.props);
};

/**
 * returns a newly-created instance of the ctor (exists mainly to be overridden)
 *
 * @returns {Object}
 */
Mapper.prototype.new = function() {
  return new this.ctor();
};

/**
 * maps the property from one object to another
 *
 * sender {Object} the object to map from
 * receiver {Object} the object to map to
 * props {Array} the properties to map
 */
function map(sender, receiver, props) {
  props = props || Object.keys(sender);
  return props.reduce(function(updated, prop) {
    updated[prop] = sender[prop];
    return updated;
  }, receiver);
}

/**
 * wrap the callback to ensure it isn't called unless it exists. also, conveniently
 * ensures that every mongo call (whether write-concerned or not) has a callback
 *
 * [cb] {Function} callback from client code
 * [map] {Function} optional callback to map result to a different return value
 * @returns {Function}
 */
function wrap(cb, map) {
  return function handle(err, result) {
    if (cb) {
      result = typeof map === 'function' ? map(result) : result;
      cb(err, result);
    }
  };
}

/**
 * simple null|undefined check
 *
 * value {mixed} value to test
 * @returns {Boolean}
 */
function exists(value) {
  return value !== null && value !== undefined;
}