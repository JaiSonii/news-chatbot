const { QdrantClient } = require('@qdrant/js-client-rest');
const env = require('./env')

const qdrant = new QdrantClient({
  url: env.QDRANT_URL,
  apiKey: env.QDRANT_API_KEY
});

module.exports = qdrant;
