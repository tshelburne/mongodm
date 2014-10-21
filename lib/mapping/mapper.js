'use strict';

var EventEmitter = require('events').EventEmitter,
  util = require('util'),
  async = require('async'),
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
  var self = this,
    query = (typeof idOrQuery === 'string') ? {_id: mongo.helper.toObjectID(idOrQuery)} : idOrQuery;

  self.coll.findOne(query, function(err, doc) {
    self.toModel(doc, wrap(cb));
  });
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

  self.coll.find.apply(this.coll, args).toArray(function(err, docs) {
    if (err) return wrap(cb)(err);
    if (!exists(docs)) return wrap(cb)(null, []);

    async.map(docs, self.toModel.bind(self), wrap(cb));
  });
};

/**
 * save or update a model
 *
 * modelOrHash {Object} the model to persist; alternatively, it can be passed a hash that will be mapped to a model
 * [cb] {Function} a standard node callback which will receive the most up-to-date model
 *   as the second argument upon success
 */
Mapper.prototype.save = function(modelOrHash, cb) {
  var self = this;

  if (modelOrHash instanceof self.ctor) {
    saveModel.call(self, modelOrHash);
  }
  else {
    self.toModel(modelOrHash, function(err, model) {
      saveModel.call(self, model);
    });
  }

  function saveModel(model) {
    var doc = self.toDoc(model);
    self.emit('saving', model, doc);
    if (exists(model._id)) {
      self.emit('updating', model, doc);
      self.coll.updateById(model._id, doc, function(err, results) {
        self.emit('updated', model);
        self.emit('saved', model);
        wrap(cb)(err, model);
      });
    } else {
      self.emit('creating', model, doc);
      self.coll.insert(doc, {w: 1}, function(err, results) {
        model._id = results[0]._id;
        self.emit('created', model);
        self.emit('saved', model);
        wrap(cb)(err, model);
      });
    }
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
 * maps a one-to-one embedded relationship
 *
 * mapper {Object} the mapper from the mongodm service
 * prop {String} the model property on the object that should be set
 */
Mapper.prototype.containsOne = function(mapper, prop) {
  this.on('built', function mapInlineToModel(parent, doc) {
    mapper.toModel(doc[prop], function(err, child) {
      parent[prop] = child;
    });
  });

  this.on('saving', function mapInlineToDoc(parent, doc) {
    doc[prop] = mapper.toDoc(parent[prop]);
  });
};

/**
 * maps a one-to-many embedded relationship
 *
 * mapper {Object} the mapper from the mongodm service
 * prop {String} the collection property on the object that should be set
 */
Mapper.prototype.containsMany = function(mapper, prop) {
  this.on('built', function mapInlineToModel(parent, doc) {
    async.map(doc[prop], mapper.toModel.bind(mapper), function(err, children) {
      parent[prop] = children;
    });
  });

  this.on('saving', function mapInlineToDoc(parent, doc) {
    doc[prop] = parent[prop].map(mapper.toDoc.bind(mapper));
  });
};

/**
 * maps a document from the db to a model of type this.ctor
 *
 * doc {Object} the doc to map
 * @returns {Object}
 */
Mapper.prototype.toModel = function(doc, cb) {
  if (!exists(doc)) { return cb(null, null); }

  this.emit('building', doc);
  var model = map(doc, this.new(doc));
  this.emit('built', model, doc);
  cb(null, model);
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
 * @returns {Function}
 */
function wrap(cb) {
  return (typeof cb === 'function') ? cb : function(err, result) {};
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