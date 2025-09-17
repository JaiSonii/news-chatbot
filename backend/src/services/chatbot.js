const redis = require('../config/redis');
const qdrant = require('../config/qdrant');
const { getJinaEmbedding } = require('./embedding');
const { scrapeNewsArticles } = require('./scraper');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const env = require('../config/env')

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const COLLECTION_NAME = 'news_articles';
const EMBEDDING_DIM = 1024;
const TOP_K = 5;
const SESSION_TTL = 3600;

class RAGChatbot {
  async initialize() {
    try {
      const collections = await qdrant.getCollections();
      if (!collections.collections.some(c => c.name === COLLECTION_NAME)) {
        await qdrant.createCollection(COLLECTION_NAME, {
          vectors: { size: EMBEDDING_DIM, distance: 'Cosine' }
        });
        logger.info('✅ Vector collection created');
      }
    } catch (err) {
      logger.error('Error initializing Qdrant:', err);
    }
  }

  async ingestArticles() {
    const articles = await scrapeNewsArticles();
    if (!articles.length) return 0;

    const points = [];
    for (const article of articles) {
      const embedding = await getJinaEmbedding(`${article.title}\n\n${article.content}`);
      points.push({
        id: article.id || uuidv4(),
        vector: embedding,
        payload: article
      });
    }
    await qdrant.upsert(COLLECTION_NAME, { wait: true, points });
    logger.info(`Ingested ${articles.length} articles`);
    return articles.length;
  }

  async processQuery(sessionId, query) {
    const historyKey = `session:${sessionId}:history`;
    const history = (await redis.lRange(historyKey, 0, -1)).map(JSON.parse);

    await redis.rPush(historyKey, JSON.stringify({ role: 'user', content: query, timestamp: Date.now() }));
    await redis.expire(historyKey, SESSION_TTL);

    const queryEmbedding = await getJinaEmbedding(query);
    const results = await qdrant.search(COLLECTION_NAME, {
      vector: queryEmbedding, limit: TOP_K, with_payload: true
    });

    const context = results.map(r => r.payload);
    const contextText = context.map(c => `Title: ${c.title}\nContent: ${c.content}\nURL: ${c.url}`).join("\n\n");
    const historyText = history.slice(-6).map(h => `${h.role}: ${h.content}`).join("\n");

    const prompt = `
You are a helpful news assistant. 
Chat History:\n${historyText}
Relevant News:\n${contextText}
User: ${query}
Answer:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();

    await redis.rPush(historyKey, JSON.stringify({ role: 'assistant', content: answer, timestamp: Date.now() }));
    await redis.expire(historyKey, SESSION_TTL);

    return { response: answer, sources: context.map(c => ({ title: c.title, url: c.url })) };
  }

  async getHistory(sessionId) {
    const history = await redis.lRange(`session:${sessionId}:history`, 0, -1);
    return history.map(JSON.parse);
  }

  async clearHistory(sessionId) {
    await redis.del(`session:${sessionId}:history`);
    return true;
  }
}

module.exports = new RAGChatbot();
