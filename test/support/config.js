exports.host = process.env.db_host || 'localhost';
exports.port = process.env.db_port || 27017;
exports.name = process.env.db_name || 'mongodb-test';