# MongODM - Simplest ODM there is

[![Build Status](https://travis-ci.org/tshelburne/mongodm.svg?branch=master)](https://travis-ci.org/tshelburne/mongodm)

## Description

MongODM is a simple, low-key interface for mapping a model to a collection. The source code can be understood in an afternoon. It's great for kick-starting a really simple project, or for getting your ideas down quickly before going for a full-blown, feature-heavy solution.

## Installation

`npm install mongodm`

## Usage

Create a simple POJO model:

```
// currently, it is required that your model constructor accept attributes 
// as an object - this is the method to map from a model to a document
var Article = module.exports = function(attrs) {
	attrs = attrs || {};

	this.title = attrs.title;
	this.body  = attrs.body;
	this.date  = attrs.date;
}
```

Map the model to a collection:

```
var odm = require('mongodm')('localhost', 27017, 'my-db-name'),
  , Article = require('./models/articles');

odm.map(Article, 'articles');
```

Access the models from the odm object:

```
odm.articles.find('some-id', function(err, article) {
	// do something spectacular
});
```

Or from the model constructor (ActiveRecord-like interface):

```
Article.find('some-id', function(err, article) {
	// well that's kind of neat
});
```

The interface is simple:

```
odm.articles.find(idOrObjectQuery, function(err, article) { ... })
odm.articles.all(function(err, articles) { ... })
odm.articles.save(article, function(err, article) { ... }) // insert and update
odm.articles.destroy(article, function(err, numRmvd) { ... })
odm.articles.destroyAll(function(err, numRmvd) { ... })

// model constructor API
Article.find(idOrObjectQuery, function(err, article) { ... })
Article.all(function(err, articles) { ... })
Article.destroyAll(function(err, numRmvd) { ... })

// model instance API
article.save(function(err, article) { ... }) // insert and update
article.destroy(function(err, numRmvd) { ... })
article.id() // as an alternative to article._id
```

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