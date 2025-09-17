const dotenv = require('dotenv');
dotenv.config();

const config = {
  PORT: Number(process.env.PORT) || 5000,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  REDIS_URL: process.env.REDIS_URL,
  QDRANT_URL: process.env.QDRANT_URL,
  QDRANT_API_KEY: process.env.QDRANT_API_KEY,
  JINA_API_KEY: process.env.JINA_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  COLLECTION_NAME: process.env.COLLECTION_NAME || 'news_articles',
  EMBEDDING_DIM: Number(process.env.EMBEDDING_DIM) || 1024,
  TOP_K: Number(process.env.TOP_K) || 5,
  SESSION_TTL: Number(process.env.SESSION_TTL) || 3600,
  JINA_EMBEDDING_MODEL: process.env.JINA_EMBEDDING_MODEL || 'jina-embeddings-v2-base-en',
  REQUEST_TIMEOUT_MS: Number(process.env.REQUEST_TIMEOUT_MS) || 15000,
};

module.exports = config;