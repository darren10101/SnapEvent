const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  UpdateCommand, 
  DeleteCommand, 
  ScanCommand,
  QueryCommand 
} = require('@aws-sdk/lib-dynamodb');

// DynamoDB Client Configuration
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Document client for easier operations
const docClient = DynamoDBDocumentClient.from(dynamoClient);

class DynamoDBService {
  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * Create/Put an item in DynamoDB
   * @param {Object} item - The item to put in the table
   * @returns {Promise} - DynamoDB response
   */
  async putItem(item) {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: item,
      });
      
      const response = await docClient.send(command);
      console.log(`Item added to ${this.tableName}:`, item);
      return response;
    } catch (error) {
      console.error(`Error putting item in ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get an item from DynamoDB by key
   * @param {Object} key - The key to retrieve the item
   * @returns {Promise} - The retrieved item
   */
  async getItem(key) {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: key,
      });
      
      const response = await docClient.send(command);
      return response.Item;
    } catch (error) {
      console.error(`Error getting item from ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Update an item in DynamoDB
   * @param {Object} key - The key of the item to update
   * @param {Object} updateExpression - Update expression details
   * @param {Object} expressionAttributeValues - Values for the expression
   * @param {Object} expressionAttributeNames - Names for the expression (optional)
   * @returns {Promise} - DynamoDB response
   */
  async updateItem(key, updateExpression, expressionAttributeValues, expressionAttributeNames = null) {
    try {
      const params = {
        TableName: this.tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'UPDATED_NEW',
      };

      if (expressionAttributeNames) {
        params.ExpressionAttributeNames = expressionAttributeNames;
      }

      const command = new UpdateCommand(params);
      const response = await docClient.send(command);
      return response.Attributes;
    } catch (error) {
      console.error(`Error updating item in ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Delete an item from DynamoDB
   * @param {Object} key - The key of the item to delete
   * @returns {Promise} - DynamoDB response
   */
  async deleteItem(key) {
    try {
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: key,
      });
      
      const response = await docClient.send(command);
      console.log(`Item deleted from ${this.tableName}:`, key);
      return response;
    } catch (error) {
      console.error(`Error deleting item from ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Scan all items in the table
   * @param {Object} filterExpression - Optional filter expression
   * @param {Object} expressionAttributeValues - Values for the filter expression
   * @param {number} limit - Optional limit for number of items
   * @returns {Promise} - Array of items
   */
  async scanTable(filterExpression = null, expressionAttributeValues = null, limit = null) {
    try {
      const params = {
        TableName: this.tableName,
      };

      if (filterExpression) {
        params.FilterExpression = filterExpression;
        params.ExpressionAttributeValues = expressionAttributeValues;
      }

      if (limit) {
        params.Limit = limit;
      }

      const command = new ScanCommand(params);
      const response = await docClient.send(command);
      return response.Items;
    } catch (error) {
      console.error(`Error scanning ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Query items from DynamoDB using a partition key
   * @param {string} keyConditionExpression - Key condition expression
   * @param {Object} expressionAttributeValues - Values for the expression
   * @param {Object} expressionAttributeNames - Names for the expression (optional)
   * @param {number} limit - Optional limit for number of items
   * @returns {Promise} - Array of items
   */
  async queryItems(keyConditionExpression, expressionAttributeValues, expressionAttributeNames = null, limit = null) {
    try {
      const params = {
        TableName: this.tableName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      };

      if (expressionAttributeNames) {
        params.ExpressionAttributeNames = expressionAttributeNames;
      }

      if (limit) {
        params.Limit = limit;
      }

      const command = new QueryCommand(params);
      const response = await docClient.send(command);
      return response.Items;
    } catch (error) {
      console.error(`Error querying ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Batch write items (put or delete multiple items)
   * @param {Array} items - Array of items to put
   * @param {Array} deleteKeys - Array of keys to delete (optional)
   * @returns {Promise} - DynamoDB response
   */
  async batchWrite(items = [], deleteKeys = []) {
    try {
      const requestItems = {};
      requestItems[this.tableName] = [];

      // Add put requests
      items.forEach(item => {
        requestItems[this.tableName].push({
          PutRequest: {
            Item: item
          }
        });
      });

      // Add delete requests
      deleteKeys.forEach(key => {
        requestItems[this.tableName].push({
          DeleteRequest: {
            Key: key
          }
        });
      });

      const command = new BatchWriteCommand({
        RequestItems: requestItems
      });

      const response = await docClient.send(command);
      return response;
    } catch (error) {
      console.error(`Error batch writing to ${this.tableName}:`, error);
      throw error;
    }
  }
}

module.exports = DynamoDBService;