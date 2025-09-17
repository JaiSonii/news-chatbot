const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv')
const Redis = require('redis');
const { QdrantClient } = require('@qdrant/js-client-rest');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Initialize services
const redis = Redis.createClient({
  url: process.env.REDIS_URL
});

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Configuration
const COLLECTION_NAME = 'news_articles';
const EMBEDDING_DIM = 1024; // Jina embeddings dimension
const TOP_K = 5;
const SESSION_TTL = 3600; // 1 hour

// Connect to Redis
redis.connect().catch(console.error);

class RAGChatbot {
  constructor() {
    this.initializeVectorStore();
  }

  async initializeVectorStore() {
    try {
      // Check if collection exists, create if not
      const collections = await qdrant.getCollections();
      const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

      if (!exists) {
        await qdrant.createCollection(COLLECTION_NAME, {
          vectors: {
            size: EMBEDDING_DIM,
            distance: 'Cosine'
          }
        });
        console.log('Vector collection created successfully');
      }
    } catch (error) {
      console.error('Error initializing vector store:', error);
    }
  }

  async getJinaEmbedding(text) {
    try {
      const response = await axios.post('https://api.jina.ai/v1/embeddings', {
        input: [text],
        model: 'jina-embeddings-v2-base-en'
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.JINA_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.data[0].embedding;
    } catch (error) {
      console.error('Error getting embedding:', error);
      throw error;
    }
  }

  async scrapeNewsArticles() {
    const articles = [];
    const sources = [
      "https://rss.cnn.com/rss/edition.rss",
      "https://feeds.bbci.co.uk/news/rss.xml",
      "https://feeds.reuters.com/reuters/worldNews"
    ];

    try {
      for (const source of sources) {
        try {
          const response = await axios.get(source, {
            timeout: 15000,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0 Safari/537.36",
              "Accept":
                "application/rss+xml, application/xml, text/xml;q=0.9,*/*;q=0.8",
            },
          });

          const $ = cheerio.load(response.data, { xmlMode: true });
          $('item').slice(0, 20).each((i, elem) => {
            const title = $(elem).find('title').text();
            const description = $(elem).find('description').text();
            const link = $(elem).find('link').text();
            const pubDate = $(elem).find('pubDate').text();

            if (title && description) {
              articles.push({
                id: uuidv4(),
                title: title.trim(),
                content: description.trim(),
                url: link.trim(),
                publishDate: pubDate.trim(),
                source,
              });
            }
          });
        } catch (err) {
          console.error(`❌ Failed to fetch ${source}:`, err.message);
        }
      }

    } catch (error) {
      console.error('Error scraping articles:', error);
    }

    return articles.slice(0, 50); // Limit to 50 articles as required
  }

  async ingestArticles() {
    try {
      console.log('Starting article ingestion...');
      const articles = await this.scrapeNewsArticles();

      if (articles.length === 0) {
        console.log('No articles found, using sample data...');
        // Fallback sample articles
        return this.ingestSampleArticles();
      }

      const points = [];
      for (const article of articles) {
        const text = `${article.title}\n\n${article.content}`;
        const embedding = await this.getJinaEmbedding(text);

        points.push({
          id: article.id,
          vector: embedding,
          payload: {
            title: article.title,
            content: article.content,
            url: article.url,
            publishDate: article.publishDate,
            source: article.source
          }
        });

        // Rate limiting for API calls
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await qdrant.upsert(COLLECTION_NAME, {
        wait: true,
        points: points
      });

      console.log(`Successfully ingested ${articles.length} articles`);
      return articles.length;
    } catch (error) {
      console.error('Error ingesting articles:', error);
      throw error;
    }
  }

  async ingestSampleArticles() {
    const sampleArticles = [
      {
        id: uuidv4(),
        title: "Technology Advances in AI",
        content: "Artificial Intelligence continues to evolve rapidly with new breakthroughs in machine learning and natural language processing.",
        url: "https://example.com/tech-ai",
        publishDate: new Date().toISOString(),
        source: "sample"
      },
      {
        id: uuidv4(),
        title: "Global Climate Change Summit",
        content: "World leaders gather to discuss climate change initiatives and sustainable development goals for the next decade.",
        url: "https://example.com/climate",
        publishDate: new Date().toISOString(),
        source: "sample"
      },
      // Add more sample articles...
    ];

    const points = [];
    for (const article of sampleArticles) {
      const text = `${article.title}\n\n${article.content}`;
      const embedding = await this.getJinaEmbedding(text);

      points.push({
        id: article.id,
        vector: embedding,
        payload: article
      });
    }

    await qdrant.upsert(COLLECTION_NAME, {
      wait: true,
      points: points
    });

    return sampleArticles.length;
  }

  async retrieveRelevantPassages(query) {
    try {
      const queryEmbedding = await this.getJinaEmbedding(query);

      const searchResult = await qdrant.search(COLLECTION_NAME, {
        vector: queryEmbedding,
        limit: TOP_K,
        with_payload: true
      });

      return searchResult.map(result => ({
        score: result.score,
        title: result.payload.title,
        content: result.payload.content,
        url: result.payload.url,
        publishDate: result.payload.publishDate
      }));
    } catch (error) {
      console.error('Error retrieving passages:', error);
      throw error;
    }
  }

  async generateResponse(query, context, chatHistory) {
    try {
      const contextText = context.map(c =>
        `Title: ${c.title}\nContent: ${c.content}\nURL: ${c.url}\n---`
      ).join('\n\n');

      const historyText = chatHistory.slice(-6).map(msg =>
        `${msg.role}: ${msg.content}`
      ).join('\n');

      const prompt = `
You are a helpful news assistant. Answer the user's question based on the following news articles and chat history.

Chat History:
${historyText}

Relevant News Articles:
${contextText}

User Question: ${query}

Instructions:
- Provide a comprehensive and accurate answer based on the news articles
- If the articles don't contain relevant information, say so politely
- Include source URLs when referencing specific articles
- Keep responses conversational and helpful
- Be concise but informative

Answer:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }

  async processQuery(sessionId, query) {
    try {
      // Get chat history
      const historyKey = `session:${sessionId}:history`;
      const history = await redis.lRange(historyKey, 0, -1);
      const chatHistory = history.map(h => JSON.parse(h));

      // Add user message to history
      const userMessage = { role: 'user', content: query, timestamp: Date.now() };
      await redis.rPush(historyKey, JSON.stringify(userMessage));
      await redis.expire(historyKey, SESSION_TTL);

      // Retrieve relevant passages
      const relevantPassages = await this.retrieveRelevantPassages(query);

      // Generate response
      const response = await this.generateResponse(query, relevantPassages, chatHistory);

      // Add assistant response to history
      const assistantMessage = {
        role: 'assistant',
        content: response,
        sources: relevantPassages.map(p => ({ title: p.title, url: p.url })),
        timestamp: Date.now()
      };
      await redis.rPush(historyKey, JSON.stringify(assistantMessage));
      await redis.expire(historyKey, SESSION_TTL);

      return {
        response,
        sources: relevantPassages.map(p => ({ title: p.title, url: p.url }))
      };
    } catch (error) {
      console.error('Error processing query:', error);
      throw error;
    }
  }

  async getSessionHistory(sessionId) {
    try {
      const historyKey = `session:${sessionId}:history`;
      const history = await redis.lRange(historyKey, 0, -1);
      return history.map(h => JSON.parse(h));
    } catch (error) {
      console.error('Error getting session history:', error);
      return [];
    }
  }

  async clearSession(sessionId) {
    try {
      const historyKey = `session:${sessionId}:history`;
      await redis.del(historyKey);
      return true;
    } catch (error) {
      console.error('Error clearing session:', error);
      return false;
    }
  }
}

// Initialize RAG chatbot
const ragChatbot = new RAGChatbot();

// REST API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/api/sessions', (req, res) => {
  const sessionId = uuidv4();
  res.json({ sessionId });
});

app.get('/api/sessions/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = await ragChatbot.getSessionHistory(sessionId);
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get session history' });
  }
});

app.delete('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const success = await ragChatbot.clearSession(sessionId);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear session' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Missing sessionId or message' });
    }

    const result = await ragChatbot.processQuery(sessionId, message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process query' });
  }
});

app.post('/api/ingest', async (req, res) => {
  try {
    const count = await ragChatbot.ingestArticles();
    res.json({ message: `Successfully ingested ${count} articles` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to ingest articles' });
  }
});

// Socket.IO for real-time chat
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`User ${socket.id} joined session ${sessionId}`);
  });

  socket.on('send-message', async (data) => {
    console.log('message recieved :', data)
    try {
      const { sessionId, message } = data;

      // Emit typing indicator
      io.to(sessionId).emit('bot-typing', true);

      const result = await ragChatbot.processQuery(sessionId, message);
      console.log('result from chatbot : ',result)

      // Emit response
      io.to(sessionId).emit('bot-typing', false);
      io.to(sessionId).emit('bot-response', {
        message: result.response,
        sources: result.sources,
        timestamp: Date.now()
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to process message' });
    }
  });

  socket.on('clear-session', async (sessionId) => {
    try {
      await ragChatbot.clearSession(sessionId);
      socket.to(sessionId).emit('session-cleared');
    } catch (error) {
      socket.emit('error', { message: 'Failed to clear session' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Initialize articles on startup
setTimeout(async () => {
  try {
    console.log('Initializing articles...');
    await ragChatbot.ingestArticles();
    console.log('Articles initialized successfully');
  } catch (error) {
    console.error('Failed to initialize articles:', error);
  }
}, 5000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});