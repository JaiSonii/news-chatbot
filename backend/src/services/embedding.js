const axios = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');

const JINA_URL = 'https://api.jina.ai/v1/embeddings';
const DEFAULT_MODEL = config.JINA_EMBEDDING_MODEL;
const DEFAULT_TIMEOUT = config.REQUEST_TIMEOUT_MS || 15000;
const MAX_RETRIES = 3;

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Get embedding for a single text string from Jina (with retries).
 * @param {string} text
 * @param {object} options
 * @returns {Promise<number[]>} embedding vector
 */
async function getJinaEmbedding(text, { model = DEFAULT_MODEL, retries = MAX_RETRIES } = {}) {
  if (!text || !text.trim()) throw new Error('Text is empty for embedding');
  try {
    const resp = await axios.post(
      JINA_URL,
      { input: [text], model },
      {
        headers: {
          Authorization: `Bearer ${config.JINA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: DEFAULT_TIMEOUT
      }
    );

    if (!resp.data || !resp.data.data || !resp.data.data[0]) {
      throw new Error('Unexpected embedding response format from Jina');
    }
    return resp.data.data[0].embedding;
  } catch (err) {
    if (retries > 0) {
      logger.warn(`getJinaEmbedding failed, retrying (${MAX_RETRIES - retries + 1})... ${err.message}`);
      await sleep(500 * (MAX_RETRIES - retries + 1)); // backoff
      return getJinaEmbedding(text, { model, retries: retries - 1 });
    }
    logger.error('getJinaEmbedding final failure:', err.message);
    throw err;
  }
}

/**
 * Batch embeddings (simple batcher).
 * Returns array of embeddings aligned with texts array.
 * @param {string[]} texts
 * @param {object} options
 * @returns {Promise<number[][]>}
 */
async function getJinaEmbeddingsBatch(texts, { model = DEFAULT_MODEL, batchSize = 16 } = {}) {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  const results = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const resp = await axios.post(
      JINA_URL,
      { input: batch, model },
      {
        headers: {
          Authorization: `Bearer ${config.JINA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: DEFAULT_TIMEOUT * 2
      }
    );

    if (!resp.data || !resp.data.data) {
      throw new Error('Unexpected batch embedding response format from Jina');
    }

    for (const item of resp.data.data) results.push(item.embedding);
    // tiny pause to be nice to the API
    await sleep(100);
  }
  return results;
}

module.exports = {
  getJinaEmbedding,
  getJinaEmbeddingsBatch
};
