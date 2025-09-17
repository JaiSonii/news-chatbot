# 📰 RAG-Powered News Chatbot

A **full-stack Retrieval-Augmented Generation (RAG) chatbot** that answers user queries based on a corpus of ~50 recent news articles.  
It features a **React frontend**, a **Node.js backend**, and a complete **RAG pipeline** built with **Jina Embeddings, Qdrant, Redis, and Google Gemini API**.

---

## ✨ Features

- **RAG Pipeline** → Ingests news from RSS feeds, generates vector embeddings, and uses a vector database to find relevant context for user queries.
- **Generative AI** → Leverages Google Gemini API to provide natural, context-aware answers.
- **Real-Time Communication** → Powered by Socket.io with typing indicators for a responsive chat experience.
- **Session Management** → Each user conversation is tied to a unique session ID with Redis-backed history.
- **Persistent Chat History** → History cached with TTL (default 1 hour), reloaded on refresh.
- **Clear & Reset** → Users can start a fresh session with one click.
- **Source Linking** → Responses include links to original news articles.

---

## 🛠️ Tech Stack

| Category             | Technology                          | Why?                                                                 |
|----------------------|-------------------------------------|----------------------------------------------------------------------|
| **Frontend**         | React, Vite, TailwindCSS, Socket.io | Fast UI dev, component-based architecture, real-time chat             |
| **Backend**          | Node.js, Express, Socket.io         | Robust REST & WebSocket APIs                                         |
| **AI / RAG Pipeline**| Google Gemini, Jina Embeddings, Qdrant | Generative AI + efficient vector similarity search                    |
| **Cache & Sessions** | Redis                               | High-speed in-memory storage with TTL for session history             |

---

## 🏗️ System Architecture

The app is split into **frontend** and **backend** which communicate via REST (for session mgmt) and WebSockets (for chat).  

### 1. RAG Pipeline

#### a. News Ingestion  
Scrapes up to **50 latest news articles** from RSS feeds (BBC, Reuters, CNN, etc.).  

_File: `backend/src/services/scraper.js`_
```js
const DEFAULT_SOURCES = [
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://www.theguardian.com/world/rss',
  'https://rss.cnn.com/rss/edition.rss',
  // ... more sources
];

async function scrapeNewsArticles(sources = DEFAULT_SOURCES, limit = 50) {
  // ... fetch and parse RSS feeds
}

b. Embedding Generation & Storage

Generates embeddings using Jina AI and stores them in Qdrant.

File: backend/src/services/embedding.js

async function getJinaEmbedding(text, { model = DEFAULT_MODEL } = {}) {
  const resp = await axios.post(JINA_URL, { input: [text], model }, {
    headers: { Authorization: `Bearer ${process.env.JINA_API_KEY}` }
  });
  return resp.data.data[0].embedding;
}

File: backend/src/services/chatbot.js

const embedding = await getJinaEmbedding(`${article.title}\n\n${article.content}`);
points.push({
  id: article.id || uuidv4(),
  vector: embedding,
  payload: article
});
await qdrant.upsert(COLLECTION_NAME, { wait: true, points });

c. Query → Retrieval → Generation

    Embed query

    Search Qdrant

    Build prompt with history + retrieved articles

    Call Gemini

const queryEmbedding = await getJinaEmbedding(query);
const results = await qdrant.search(COLLECTION_NAME, {
  vector: queryEmbedding, limit: TOP_K, with_payload: true
});

const context = results.map(r => r.payload);
const prompt = `
You are a helpful news assistant.
Chat History:\n${historyText}
Relevant News:\n${contextText}
User: ${query}
Answer:`;

const result = await model.generateContent(prompt);
const answer = result.response.text();

2. Redis Caching & Session Management

    Each session = UUID stored in localStorage

    Messages stored in Redis lists with TTL

    Default TTL = 1 hour

const SESSION_TTL = 3600; // 1 hour
const historyKey = `session:${sessionId}:history`;

await redis.rPush(historyKey, JSON.stringify({ role: 'user', content: query, timestamp: Date.now() }));
await redis.expire(historyKey, SESSION_TTL);

3. Frontend Communication

    Custom Hook (useChat) handles all state & socket communication.

    On load → requests session from /api/sessions.

    Joins WebSocket room for that session.

    Sends messages via send-message, receives responses on bot-response.

🚀 Setup & Deployment
Prerequisites

    Node.js v18+

    Redis instance

    Qdrant instance (Docker recommended)

    API keys → Jina AI + Google Gemini

Backend Setup

cd backend
cp .env.example .env   # add API keys + config
npm install
npm run dev

Frontend Setup

cd frontend-vite
cp .env.example .env.local   # set VITE_API_URL=http://localhost:5000
npm install
npm run dev

🌐 Live Demo

👉 Link to your deployed app
💡 Design Decisions

    Socket-first communication → smoother UX vs HTTP polling

    Service separation → scraper, embedding, chatbot as modular services

    Redis for sessions → in-memory + TTL = perfect transient store

    Env config → keys & params kept environment-specific

🚧 Potential Improvements

    Streaming Responses → Use Gemini’s streaming API for "typing effect" replies.

    Persistent Storage → Store transcripts in PostgreSQL for analytics.

    Better RAG Splits → Chunk articles for more precise retrieval.

    Error Feedback → Frontend should display clearer error states.

    Cache Warming → Periodic refresh of article embeddings.


