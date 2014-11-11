# MongODM - Simplest ODM there is

[![Build Status](https://travis-ci.org/tshelburne/mongodm.svg?branch=master)](https://travis-ci.org/tshelburne/mongodm)


## Description

MongODM is a simple, low-key interface for mapping a model to a collection. The source code can be understood in an afternoon. It's great for kick-starting a really simple project, or for getting your ideas down quickly before going for a full-blown, feature-heavy solution.


## Features

- POJO registration 
- ActiveRecord-like interface extension
- Relations
- Scopes
- Evented lifecycle


## Installation

`npm install mongodm`


## Usage

Create a simple POJO model:

	var Article = module.exports = function(title, body, date) {
		this.title = title;
		this.body  = body;
		this.date  = date;
	}

Map the model to a collection:

	var odm = require('mongodm')('localhost', 27017, 'my-db-name'),
	  , Article = require('./models/articles');

	// this reads the persistable properties from a constructed instance
	odm.map(Article, 'articles');

	// alternatively, you can specify the properties to persist
	odm.map(Article, 'articles', 'title', 'date');

Access the models from the odm object:

	odm.articles.find('some-id', function(err, article) {
		// do something spectacular
	});

Or from the model constructor (ActiveRecord-like interface):

	Article.find('some-id', function(err, article) {
		// well that's kind of neat
	});

The interface is simple:

	odm.articles.find(idOrObjectQuery, function(err, article) { ... })
	odm.articles.all(function(err, articles) { ... })
	odm.articles.save(article, function(err, article) { ... }) // insert and update
	odm.articles.destroy(article, function(err, numRmvd) { ... })
	odm.articles.destroyAll(function(err, numRmvd) { ... })

	// model constructor API
	Article.find(idOrObjectQuery, function(err, article) { ... })
	Article.all(function(err, articles) { ... })
	Article.create({ ... }, function(err, articles) { ... })
	Article.destroyAll(function(err, numRmvd) { ... })

	// model instance API
	article.save(function(err, article) { ... }) // insert and update
	article.destroy(function(err, numRmvd) { ... })
	article.id() // as an alternative to article._id


## Relations

This interface is still evolving, since it depends pretty heavily on the odm.{mapper} syntax, and there is little in the way of convenience. However, it does the job, and shipped is better than perfect! I don't anticipate deprecating this version anytime soon, but it will be extended to read more nicely (using constructors, fewer required arguments, etc.).

As before, we create our models:

	var Article = module.exports = function(author, title, body, date) {
		this.author   = author;
		this.comments = [];

		this.title  = title;
		this.body   = body;
		this.date   = date;
	}

	var User = module.exports = function(username) {
		this.username = username;
		this.articles = [];
	}

	var Comment = module.exports = function(author, body) {
		this.author = author;
		this.body   = body;
	}

Map the models to collections:

	odm.map(Article, 'articles');
	odm.map(User, 'users');
	odm.map(Comment, 'comments');

Map the relationships between models:

	odm.articles.hasOne(odm.users, 'author');

Or, with a little more class...

	Article.hasOne(odm.users, 'author');
	Article.containsMany(odm.comments, 'comments');

	Author.findsMany(odm.articles, 'articles', 'author');

	Comment.hasOne(odm.users, 'author');

Now when you load a model, it will have all relationships eagerly populated. The interface here is simple as well:
	
- These define embedded models, and ensure we get instances of the model class rather than just objects:
	
		Article.containsOne(odm.users, 'author');
		Article.containsMany(odm.users, 'authors');

	Example stored documents:
	- in db.articles: `{ title: 'some title', author: { username: 'tshelburne' } }`

- These define relationships where the relation stores the article ID in the foreign key:
	
		Article.findsOne(odm.users, 'author', 'article');
		Article.findsMany(odm.users, 'authors', 'article');

	Example stored documents:
	- in db.articles: `{ title: 'some title' }`
	- in db.users: `{ username: 'tshelburne', article: '1234' }`
	
- These define relationships where the article stores the relation ID:
	
		Article.hasOne(odm.users, 'author');
		Article.hasMany(odm.users, 'authors');

	Example stored documents:
	- in db.articles: `{ title: 'some title', author: '1234' }`
	- in db.users: `{ username: 'tshelburne' }`

	It should be noted that `hasOne` and `hasMany` relationships *do not* ensure the relation is persisted, so save the relation first.


## Scopes

My favorite feature of ActiveRecord - by far - is using scopes to build easily readable and composable query objects. The current implementation in MongODM is pretty trivial, but it does the job for now. The setup is basic:

```
odm.map(Article, 'articles');
odm.articles.scope('published', {publishedOn: {'$ne': null}});
odm.articles.scope('by', function(firstName, lastName) { 
    return {author: {first: firstName, last: lastName}}; 
});
```

Now we can use this scope for a much more readable and usable interface when querying:

```
Article.published().by('Mark', 'Twain').all({...}, function(err, articles) {...});
odm.articles.published().all({...}, function(err, articles) {...});
```

Additionally, we can set up default scopes which will be applied to *every* query made for this model (eventually there will be a one-off override, but I'm feeling lazy):

```
odm.articles.scopeDefault({publishedOn: {'$ne': null}});
Article.all(function(err, articles) {...}); // articles will all be published
```


## Finding by `all`

In addition to a callback, `all` accepts two optional arguments as the first parameters: `query` and `options`. These are the same as in the [low-level driver](https://github.com/mongodb/node-mongodb-native/blob/master/Readme.md#find).

Note: If you only want to pass in the options object, you must pass an empty query object as well - `Model.all({}, {sort: {prop: 'weight'}}, cb)`


## Constructor arguments

Any values stored in the database document are mapped to an instance of your model created with `new Model()`. However, if you need to call the constructor in a specific way, you can override this on the odm interface with the `new` function:

	odm.articles.new = function(doc) {
		return new Article(doc.body); // maybe our Article generates a summary at instantiation
	}


## Events

Both the ODM object and the model emit lifecycle events that can be listened to with the following interface:

	odm.articles.on('event', function(article) { ... })

	Article.on('event', function(article) { ... })

The events that are fired are:

- `creating` | `created`
- `updating` | `updated`
- `saving` | `saved` (for both create and update actions)
- `destroying` | `destroyed` (`destroy` only, not on `destroyAll`)


## Tests

1. `mongod`
1. `npm test`

The code interface is decently tested, since it's so small. The tests are currently depending on the proper functioning of mongoskin - not too excited about that, but I'd rather see the library actually working with the database than mock out calls at this low level.


## Contribution

Fork and PR.


## License

License
The MIT License (MIT)

Copyright (c) 2014 Tim Shelburne

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.