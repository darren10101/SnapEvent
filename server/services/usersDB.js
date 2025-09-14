const DynamoDBService = require('../services/dynamodb');
const usersDB = new DynamoDBService(process.env.USERS_TABLE || 'snapevent-users');
module.exports = usersDB;