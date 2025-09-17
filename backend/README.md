# News Chatbot Backend

This is the backend for a RAG-powered chatbot that answers queries about news articles. It uses a Retrieval-Augmented Generation (RAG) pipeline to provide accurate responses based on a corpus of news articles.

## Tech Stack

- **Node.js** with Express for the REST API
- **Socket.io** for real-time chat
- **Redis** for in-memory chat history and session management
- **Qdrant** as the vector database for storing embeddings
- **Jina AI** for generating embeddings
- **Google Gemini** for generating responses

## Features

- Ingests ~50 news articles from Reuters
- Generates embeddings for articles and stores them in Qdrant
- Retrieves relevant passages for user queries
- Generates streaming responses using Google Gemini
- Maintains chat history in Redis
- Provides both REST API and Socket.io interfaces

## Setup

1. Clone the repository
2. Install dependencies:
   \`\`\`
   npm install
   \`\`\`
3. Create a `.env` file based on `.env.example` and fill in your API keys and configuration
4. Start the server:
   \`\`\`
   npm start
   \`\`\`

## Environment Variables

- `PORT`: Port for the server (default: 5000)
- `FRONTEND_URL`: URL of the frontend for CORS (default: http://localhost:3000)
- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_PASSWORD`: Redis password (if any)
- `QDRANT_URL`: Qdrant URL (default: http://localhost:6333)
- `QDRANT_API_KEY`: Qdrant API key (if using cloud version)
- `JINA_API_KEY`: Jina AI API key
- `GEMINI_API_KEY`: Google Gemini API key

## Detailed System Architecture

### 1. RAG Pipeline Implementation

#### News Ingestion Process

The system fetches approximately 50 news articles from Reuters using their sitemap:

\`\`\`javascript
// From newsIngestion.js
async function fetchAndProcessNews() {
  // Fetch Reuters sitemap
  const sitemapUrl = "https://www.reuters.com/arc/outboundfeeds/sitemap-index/?outputType=xml";
  const sitemapResponse = await axios.get(sitemapUrl);
  const sitemapData = await parseStringPromise(sitemapResponse.data);

  // Get the first news sitemap URL
  const newsSitemapUrl = sitemapData.sitemapindex.sitemap[0].loc[0];

  // Fetch the news sitemap
  const newsSitemapResponse = await axios.get(newsSitemapUrl);
  const newsSitemapData = await parseStringPromise(newsSitemapResponse.data);

  // Get article URLs (limit to 50)
  const articleUrls = newsSitemapData.urlset.url.slice(0, 50).map((url) => url.loc[0]);
  
  // Process each article...
}
\`\`\`

Each article is parsed to extract the title, content, and publication date using HTML parsing:

\`\`\`javascript
// From newsIngestion.js
async function fetchAndParseArticle(url) {
  const response = await axios.get(url);
  const root = parse(response.data);

  // Extract title
  const titleElement = root.querySelector("h1") || root.querySelector("title");
  const title = titleElement ? titleElement.text.trim() : "Untitled Article";

  // Extract content
  const paragraphs = root.querySelectorAll("p");
  const content = paragraphs
    .map((p) => p.text.trim())
    .filter((text) => text.length > 50) // Filter out short paragraphs
    .join("\n\n");
    
  // ...
}
\`\`\`

#### Embedding Generation and Storage

For each article, we generate embeddings using Jina AI's embedding service:

\`\`\`javascript
// From embeddings.js
async function generateEmbeddings(text) {
  const response = await axios.post(
    JINA_API_URL,
    {
      input: text,
      model: "jina-embeddings-v2-base-en",
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${JINA_API_KEY}`,
      },
    }
  );

  return response.data.data[0].embedding;
}
\`\`\`

These embeddings are stored in Qdrant, a vector database, along with the article metadata:

\`\`\`javascript
// From index.js
async function initializeVectorDB() {
  // Check if collection exists
  const collections = await qdrantClient.getCollections();
  const collectionExists = collections.collections.some(c => c.name === COLLECTION_NAME);
  
  if (!collectionExists) {
    // Create collection
    await qdrantClient.createCollection(COLLECTION_NAME, {
      vectors: {
        size: 768, // Jina embeddings dimension
        distance: "Cosine",
      },
    });
    
    // Fetch and process news articles
    const newsArticles = await fetchAndProcessNews();
    
    // Generate embeddings and store in Qdrant
    for (const article of newsArticles) {
      const embedding = await generateEmbeddings(article.content);
      await qdrantClient.upsert(COLLECTION_NAME, {
        wait: true,
        points: [
          {
            id: article.id,
            vector: embedding,
            payload: {
              title: article.title,
              content: article.content,
              url: article.url,
              publishedAt: article.publishedAt,
            },
          },
        ],
      });
    }
  }
}
\`\`\`

#### Query Processing and Retrieval

When a user asks a question, the system generates an embedding for the query and searches Qdrant for the most semantically similar articles:

\`\`\`javascript
// From index.js
async function retrieveRelevantPassages(query, topK = 3) {
  const embedding = await generateEmbeddings(query);
  const searchResult = await qdrantClient.search(COLLECTION_NAME, {
    vector: embedding,
    limit: topK,
  });
  
  return searchResult.map(result => ({
    content: result.payload.content,
    title: result.payload.title,
    url: result.payload.url,
    score: result.score,
  }));
}
\`\`\`

### 2. Redis Caching & Session Management

#### Session Creation and Management

Each user gets a unique session ID (UUID). Chat history is stored in Redis lists with a 24-hour TTL:

\`\`\`javascript
// From index.js
// Session TTL in seconds (24 hours)
const SESSION_TTL = 24 * 60 * 60;

// Store message in Redis
await redis.lpush(
  `chat:${sessionId}`,
  JSON.stringify({
    role: "user",
    content: message,
    timestamp: Date.now(),
  })
);

// Set TTL for the session
await redis.expire(`chat:${sessionId}`, SESSION_TTL);
\`\`\`

#### Chat History Retrieval

Chat history is retrieved from Redis and returned in chronological order:

\`\`\`javascript
// From index.js
app.get("/api/history/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  
  // Retrieve chat history from Redis
  const history = await redis.lrange(`chat:${sessionId}`, 0, -1);
  
  // Parse and reverse to get chronological order
  const parsedHistory = history.map(JSON.parse).reverse();
  
  res.json({
    sessionId,
    history: parsedHistory,
  });
});
\`\`\`

#### Session Clearing

Sessions can be cleared manually by the user:

\`\`\`javascript
// From index.js
app.delete("/api/session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  
  // Delete chat history from Redis
  await redis.del(`chat:${sessionId}`);
  
  res.json({
    success: true,
    message: "Session cleared successfully",
  });
});
\`\`\`

### 3. Streaming Response Implementation

The system uses Gemini's streaming API to generate responses chunk by chunk:

\`\`\`javascript
// From index.js
async function generateResponse(query, context) {
  const contextText = context
    .map(item => `Title: ${item.title}\nContent: ${item.content}\nURL: ${item.url}`)
    .join('\n\n');
  
  const prompt = `
  You are a helpful assistant for a news website. Answer the following question based on the provided news articles.
  If the information is not in the provided articles, say that you don't have enough information.
  
  News Articles:
  ${contextText}
  
  User Question: ${query}
  
  Your Answer:`;
  
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const result = await model.generateContentStream(prompt);
  
  return result;
}
\`\`\`

The streaming response is sent to the client in real-time:

\`\`\`javascript
// From index.js
// Stream the response
for await (const chunk of responseStream.stream) {
  const chunkText = chunk.text();
  fullResponse += chunkText;

  // Update the message in Redis
  await redis.lset(
    `chat:${sessionId}`,
    0,
    JSON.stringify({
      role: "assistant",
      content: fullResponse,
      timestamp: responseTimestamp,
    })
  );

  // Emit the chunk to all clients in the session
  io.to(sessionId).emit("chat chunk", {
    text: chunkText,
    timestamp: responseTimestamp,
  });
}
\`\`\`

## API Endpoints

### POST /api/chat
Send a message to the chatbot.

**Request Body:**
\`\`\`json
{
  "message": "What's the latest news about climate change?",
  "sessionId": "optional-session-id"
}
\`\`\`

**Response:**
\`\`\`json
{
  "sessionId": "session-id",
  "message": "Response from the chatbot"
}
\`\`\`

### GET /api/history/:sessionId
Get chat history for a session.

**Response:**
\`\`\`json
{
  "sessionId": "session-id",
  "history": [
    {
      "role": "user",
      "content": "What's the latest news about climate change?",
      "timestamp": 1637097600000
    },
    {
      "role": "assistant",
      "content": "Response from the chatbot",
      "timestamp": 1637097601000
    }
  ]
}
\`\`\`

### DELETE /api/session/:sessionId
Clear chat history for a session.

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Session cleared successfully"
}
\`\`\`

## Socket.io Events

### Client to Server

- `join`: Join a session
  \`\`\`json
  "session-id"
  \`\`\`

- `chat message`: Send a message
  \`\`\`json
  {
    "message": "What's the latest news about climate change?",
    "sessionId": "session-id"
  }
  \`\`\`

- `clear session`: Clear a session
  \`\`\`json
  "session-id"
  \`\`\`

### Server to Client

- `chat message`: Receive a message
  \`\`\`json
  {
    "role": "user|assistant",
    "content": "Message content",
    "timestamp": 1637097600000
  }
  \`\`\`

- `chat chunk`: Receive a chunk of the streaming response
  \`\`\`json
  {
    "text": "Chunk of text",
    "timestamp": 1637097600000
  }
  \`\`\`

- `chat complete`: Receive the complete response
  \`\`\`json
  {
    "role": "assistant",
    "content": "Complete response",
    "timestamp": 1637097600000
  }
  \`\`\`

- `typing`: Typing indicator
  \`\`\`json
  true|false
  \`\`\`

- `session cleared`: Session cleared notification

- `error`: Error notification
  \`\`\`json
  {
    "message": "Error message"
  }
  \`\`\`

## Caching & Performance Considerations

### TTL Configuration

Chat history is cached in Redis with a TTL of 24 hours. This ensures that inactive sessions are automatically cleaned up:

\`\`\`javascript
// Session TTL in seconds (24 hours)
const SESSION_TTL = 24 * 60 * 60;

// Set TTL for the session
await redis.expire(`chat:${sessionId}`, SESSION_TTL);
\`\`\`

For production environments, you might want to adjust the TTL based on your application's needs:
- Short-lived sessions (1-2 hours) for high-traffic applications
- Longer sessions (1-7 days) for applications where users might return to continue conversations

### Cache Warming

For improved performance, you could implement cache warming strategies:
1. **Precompute common queries**: Identify frequently asked questions and precompute their embeddings
2. **Periodic refreshing**: Refresh the news corpus and embeddings at regular intervals (e.g., every 6 hours)
3. **Lazy loading**: Load only the most recent articles initially, then load more as needed

### Performance Optimizations

1. **Batch processing**: When ingesting news articles, process them in batches to reduce API calls
2. **Connection pooling**: Use connection pooling for Redis to reduce connection overhead
3. **Horizontal scaling**: Deploy multiple instances of the backend behind a load balancer
4. **Caching embeddings**: Cache frequently used query embeddings to reduce computation

## Design Decisions and Potential Improvements

### Design Decisions

1. **Streaming responses**: We chose to implement streaming responses for a better user experience, showing responses as they're generated
2. **Socket.io for real-time communication**: Socket.io provides a reliable way to implement real-time features with fallbacks
3. **Redis for session management**: Redis offers fast in-memory storage with TTL support, making it ideal for session management
4. **Qdrant for vector storage**: Qdrant provides efficient vector search capabilities with a simple API

### Potential Improvements

1. **SQL database integration**: Add a SQL database to persist chat transcripts for long-term storage and analysis
2. **User authentication**: Implement user authentication to associate sessions with specific users
3. **Enhanced RAG pipeline**: Implement more sophisticated chunking strategies for better retrieval
4. **Monitoring and analytics**: Add monitoring for API usage, response times, and user satisfaction
5. **Multi-modal support**: Add support for images and other media in the chat
6. **Feedback mechanism**: Allow users to provide feedback on responses to improve the system

## Deployment

This backend can be deployed to any Node.js hosting service like Render, Heroku, or Vercel. Make sure to set up the required environment variables and services (Redis, Qdrant) before deployment.

For production deployments, consider:
1. Using managed Redis services like Redis Labs or Upstash
2. Using Qdrant Cloud for vector storage
3. Setting up proper monitoring and logging
4. Implementing rate limiting and other security measures
