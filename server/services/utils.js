const DynamoDBService = require('./dynamodb');

/**
 * Utility functions for common DynamoDB operations
 */

/**
 * Initialize DynamoDB services for different tables
 */
const initializeServices = () => {
  return {
    events: new DynamoDBService(process.env.EVENTS_TABLE || 'snapevent-events'),
    users: new DynamoDBService(process.env.USERS_TABLE || 'snapevent-users'),
  };
};

/**
 * Generate a unique ID with timestamp and random string
 * @param {string} prefix - Prefix for the ID (e.g., 'event', 'user')
 * @returns {string} - Unique ID
 */
const generateId = (prefix = 'item') => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substr(2, 9);
  return `${prefix}_${timestamp}_${randomString}`;
};

/**
 * Validate required fields in an object
 * @param {Object} data - Data object to validate
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} - Validation result with isValid and missingFields
 */
const validateRequiredFields = (data, requiredFields) => {
  const missingFields = requiredFields.filter(field => !data[field]);
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

/**
 * Create a standardized API response
 * @param {boolean} success - Success status
 * @param {*} data - Response data
 * @param {string} message - Response message
 * @param {*} error - Error information
 * @returns {Object} - Standardized response object
 */
const createResponse = (success, data = null, message = '', error = null) => {
  const response = { success };
  
  if (data !== null) response.data = data;
  if (message) response.message = message;
  if (error) response.error = error;
  
  return response;
};

/**
 * Add timestamps to an object
 * @param {Object} item - Item to add timestamps to
 * @param {boolean} isUpdate - Whether this is an update (only adds updatedAt)
 * @returns {Object} - Item with timestamps
 */
const addTimestamps = (item, isUpdate = false) => {
  const now = new Date().toISOString();
  
  if (!isUpdate) {
    item.createdAt = now;
  }
  item.updatedAt = now;
  
  return item;
};

/**
 * Build DynamoDB update expression from an object
 * @param {Object} updates - Object with fields to update
 * @param {Array} excludeFields - Fields to exclude from update
 * @returns {Object} - Update expression components
 */
const buildUpdateExpression = (updates, excludeFields = ['id', 'createdAt']) => {
  const updateExpressions = [];
  const expressionAttributeValues = {};
  const expressionAttributeNames = {};
  
  // Always add updatedAt
  updateExpressions.push('updatedAt = :updatedAt');
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();
  
  Object.keys(updates).forEach(key => {
    if (!excludeFields.includes(key) && updates[key] !== undefined) {
      const attributeName = `#${key}`;
      const attributeValue = `:${key}`;
      
      updateExpressions.push(`${attributeName} = ${attributeValue}`);
      expressionAttributeNames[attributeName] = key;
      expressionAttributeValues[attributeValue] = updates[key];
    }
  });
  
  return {
    updateExpression: `SET ${updateExpressions.join(', ')}`,
    expressionAttributeValues,
    expressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined
  };
};

/**
 * Paginate scan results
 * @param {DynamoDBService} service - DynamoDB service instance
 * @param {number} limit - Items per page
 * @param {Object} lastEvaluatedKey - Last evaluated key for pagination
 * @param {string} filterExpression - Optional filter expression
 * @param {Object} expressionAttributeValues - Optional expression attribute values
 * @returns {Object} - Paginated results
 */
const paginatedScan = async (service, limit = 20, lastEvaluatedKey = null, filterExpression = null, expressionAttributeValues = null) => {
  try {
    const params = {
      Limit: limit
    };
    
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }
    
    if (filterExpression) {
      params.FilterExpression = filterExpression;
      params.ExpressionAttributeValues = expressionAttributeValues;
    }
    
    const result = await service.scanTable(params);
    
    return {
      items: result.Items,
      lastEvaluatedKey: result.LastEvaluatedKey,
      hasMore: !!result.LastEvaluatedKey
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  initializeServices,
  generateId,
  validateRequiredFields,
  createResponse,
  addTimestamps,
  buildUpdateExpression,
  paginatedScan
};