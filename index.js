var mongo = require('mongoskin')
  , db = null
  , service = {};

/**
 * configure the service to connect to your database
 *
 * [host] {String} your db host
 * [port] {String} your db port
 * [name] {String} your db name
 * [options] {Object} options to pass along to mongoskin
 */
module.exports = function(host, port, name, options) {
	db = mongo.db('mongodb://'+host+':'+port+'/'+name, options);
	
	process.on('SIGINT', db.close);

	return service;
}

/**
 * maps a constructor function (ie model class) to a collection
 * 
 * ctor {Function} constructor to be mapped
 * coll {String} collection name
 * [arguments] any additional argument will map properties to documents
 */
service.map = function(ctor, coll) {
	var props  = arguments.length > 2 ? Array.prototype.slice.call(arguments, 2) : Object.keys(new ctor());
	var mapper = service[coll] = new Mapper(ctor, coll, props);
	
	// put class methods on the constructor	
	ctor.find       = Mapper.prototype.find.bind(mapper);
	ctor.all        = Mapper.prototype.all.bind(mapper);
	ctor.destroyAll = Mapper.prototype.destroyAll.bind(mapper);

	// put instance methods on the prototype
	ctor.prototype.save    = function(cb) { mapper.save(this, cb); }
	ctor.prototype.destroy = function(cb) { mapper.destroy(this, cb); }
	ctor.prototype.id      = function() { return this._id; }
};

/**
 * this is largely only necessary for development when 'watching' changes, since the process
 * doesn't end - this let's us forcefully end it
 *
 * [cb] {Function} a standard node callback run upon completion
 */
service.close = function(cb) {
	db.close(cb);
}

/**
 * a basic mapper to handle mapping a set of properties between documents of a 
 * given constructor and collection
 *
 * [ctor] {Function} constructor being mapped
 * [coll] {String} collection name
 * [props] {Array} all properties that will be mapped to the database
 */
function Mapper(ctor, coll, props) {
	this.ctor = ctor;
	this.coll = db.collection(coll);
	this.props = props;
}

/**
 * find a model by id or by query
 *
 * [idOrQuery] {String|Object} the id as a string, or a standard mongo query object
 * [cb] {Function} a standard node callback which will receive the model as the second
 *   argument upon success
 */
Mapper.prototype.find = function(idOrQuery, cb) {
	var query = (typeof idOrQuery === 'string') ? { _id: mongo.helper.toObjectID(idOrQuery) } : idOrQuery;
	this.coll.findOne(query, wrap(cb, this.toModel.bind(this)));
}

/**
 * find all models
 *
 * [cb] {Function} a standard node callback which will receive the models as the second
 *   argument upon success
 */
Mapper.prototype.all = function(cb) {
	var self = this;
	this.coll.find({}).toArray(wrap(cb, function toModels(docs) { 
		if (!exists(docs)) { return []; }
		return docs.map(self.toModel.bind(self)); 
	}));
}

/**
 * save or update a model
 *
 * [model] {Object} the model to persist
 * [cb] {Function} a standard node callback which will receive the most up-to-date model 
 *   as the second argument upon success
 */
Mapper.prototype.save = function(model, cb) {
	var doc = this.toDoc(model);
	if (exists(model._id)) {
		this.coll.updateById(model._id, doc, wrap(cb, function returnModel() {
			return model;
		}));
	}
	else {
		this.coll.insert(doc, { w: 1 }, wrap(cb, function addIdAndReturnModel(results) {
			model._id = results[0]._id;
			return model;
		}));
	}
}

/**
 * destroy a model
 *
 * [model] {Object} the model to destroy
 * [cb] {Function} a standard node callback which will receive the number of documents
 *   removed as the second argument upon success
 */
Mapper.prototype.destroy = function(model, cb) {
	this.coll.removeById(model._id, wrap(cb));
}

/**
 * deletes the entire collection
 *
 * [cb] {Function} a standard node callback which will receive the number of documents
 *   removed as the second argument upon success
 */
Mapper.prototype.destroyAll = function(cb) {
	this.coll.remove(wrap(cb));
}

/**
 * maps a document from the db to a model of type this.ctor
 *
 * [doc] {Object} the doc to map
 * @returns {Object}
 */
Mapper.prototype.toModel = function(doc) {
	if (!exists(doc)) { return null; }
	var model = new this.ctor(doc);
	model._id = doc._id;
	return model;
}

/**
 * maps a model to a document as described by this.props
 *
 * [model] {Object} the model to map
 * @returns {Object}
 */
Mapper.prototype.toDoc = function(model) {
	if (!exists(model)) { return null; }
	return this.props.reduce(function addModelPropToDoc(doc, prop) {
		doc[prop] = model[prop];
		return doc;
	}, {});
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
 */
function exists(value) {
	return value !== null && value !== undefined;
}