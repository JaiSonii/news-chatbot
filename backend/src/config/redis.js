const Redis = require('redis');
const logger = require('../utils/logger');
const env = require('./env')

const redis = Redis.createClient({ url: env.REDIS_URL });
redis.connect().catch(err => logger.error('Redis connection failed:', err));

module.exports = redis;
