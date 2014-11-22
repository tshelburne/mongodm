'use strict';

var EventEmitter = require('events').EventEmitter,
  mongo = require('mongoskin'),
  Mapper = require('./mapping/mapper'),
  db = null,
  service = {};

/**
 * configure the service to connect to your database
 *
 * hostOrUri {String} a full mongo uri, or your db host
 * [port] {String} your db port (optional if full uri given)
 * [name] {String} your db name (optional if full uri given)
 * [username] {String} your username (optional if full uri given or not needed)
 * [password] {String} your password (optional if full uri given or not needed)
 * [options] {Object} options to pass along to mongoskin
 * @returns {Object} the instance of the Mapper
 */
module.exports = function(hostOrUri, port, name, username, password, options) {
  var args = Array.prototype.slice.call(arguments);

  hostOrUri = args.shift();
  if (args.length > 0) options = args.pop();

  var uri = 'mongodb://';

  if (args.length === 0) { // full uri given
    uri = hostOrUri;
  } else {
    if (args.length === 3) uri += username + '@'; // only username given
    else if (args.length === 4) uri += username + ':' + password + '@'; // username and password given

    uri += hostOrUri + ':' + port + '/' + name;
  }

  // expose the mongoskin instance via base property
  service.base = db = mongo.db(uri, options);

  process.on('SIGINT', db.close);

  return service;
};

/**
 * maps a constructor function (ie model class) to a collection
 *
 * Ctor {Function} constructor to be mapped
 * coll {String} collection name
 * [arguments] any additional argument will map properties to documents
 */
service.map = function(Ctor, coll) {
  var props = arguments.length > 2 ? Array.prototype.slice.call(arguments, 2) : Object.keys(new Ctor());
  var mapper = service[coll] = new Mapper(Ctor, db.collection(coll), props);

  // put class methods on the constructor
  Ctor.find = Mapper.prototype.find.bind(mapper);
  Ctor.all = Mapper.prototype.all.bind(mapper);
  Ctor.create = Mapper.prototype.save.bind(mapper);
  Ctor.destroyAll = Mapper.prototype.destroyAll.bind(mapper);
  Ctor.containsOne = Mapper.prototype.containsOne.bind(mapper);
  Ctor.findsOne = Mapper.prototype.findsOne.bind(mapper);
  Ctor.hasOne = Mapper.prototype.hasOne.bind(mapper);
  Ctor.containsMany = Mapper.prototype.containsMany.bind(mapper);
  Ctor.findsMany = Mapper.prototype.findsMany.bind(mapper);
  Ctor.hasMany = Mapper.prototype.hasMany.bind(mapper);
  Ctor.on = EventEmitter.prototype.on.bind(mapper);

  // put instance methods on the prototype
  Ctor.prototype.save = function(cb) {
    mapper.save(this, cb);
  };
  Ctor.prototype.destroy = function(cb) {
    mapper.destroy(this, cb);
  };
  Ctor.prototype.id = function() {
    return this._id;
  };
};

/**
 * this is largely only necessary for development when 'watching' changes, since the process
 * doesn't end - this let's us forcefully end it
 *
 * [cb] {Function} a standard node callback run upon completion
 */
service.close = function(cb) {
  db.close(cb);
};