# RAG Chatbot Backend

A Node.js/Express backend implementing a Retrieval-Augmented Generation (RAG) pipeline for news article chatbots.

## Features

- **RAG Pipeline**: Ingests news articles, creates embeddings with Jina AI, and stores in Qdrant vector database
- **Real-time Chat**: WebSocket support using Socket.IO for instant messaging
- **Session Management**: Redis-based session storage with configurable TTL
- **News Ingestion**: Automated RSS feed scraping from major news sources
- **Caching**: In-memory chat history and session caching
- **Rate Limiting**: API rate limiting for production use

## Tech Stack

- **Framework**: Node.js + Express
- **Vector Database**: Qdrant
- **Embeddings**: Jina AI Embeddings v2
- **LLM**: Google Gemini Pro
- **Cache**: Redis
- **WebSockets**: Socket.IO

## Prerequisites

- Node.js 18+
- Redis server
- Qdrant vector database
- API keys for Jina AI and Google Gemini

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-repo/rag-chatbot-backend.git
cd rag-chatbot-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```env
GEMINI_API_KEY=your_gemini_api_key_here
JINA_API_KEY=your_jina_api_key_here
REDIS_URL=redis://localhost:6379
QDRANT_HOST=localhost
QDRANT_PORT=6333
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
SESSION_TTL=3600
```

## Getting API Keys

### Google Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your `.env` file

### Jina AI API Key
1. Visit [Jina AI Embeddings](https://jina.ai/embeddings)
2. Sign up for a free account
3. Generate an API key
4. Copy the key to your `.env` file

## Setting up Dependencies

### Redis Installation
```bash
# Using Docker
docker run -d --name redis -p 6379:6379 redis:alpine

# Or install locally (Ubuntu)
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server

# Or using Homebrew (macOS)
brew install redis
brew services start redis
```

### Qdrant Installation
```bash
# Using Docker
docker run -p 6333:6333 qdrant/qdrant

# Or download binary from https://qdrant.tech/documentation/quick-start/
```

## Usage

1. Start Redis and Qdrant services
2. Start the development server:
```bash
npm run dev
```

3. The server will start on `http://localhost:5000`

## API Endpoints

### REST API

- `POST /api/sessions` - Create a new chat session
- `GET /api/sessions/:sessionId/history` - Get session chat history
- `DELETE /api/sessions/:sessionId` - Clear session history
- `POST /api/chat` - Send a chat message (REST fallback)
- `POST /api/ingest` - Manually trigger article ingestion
- `GET /health` - Health check endpoint

### WebSocket Events

**Client → Server:**
- `join-session` - Join a session room
- `send-message` - Send a chat message
- `clear-session` - Clear session history

**Server → Client:**
- `bot-response` - Receive bot response
- `bot-typing` - Bot typing indicator
- `session-cleared` - Session cleared confirmation
- `error` - Error message

## Architecture

### RAG Pipeline Flow

1. **Article Ingestion**:
   - Scrapes RSS feeds from major news sources (CNN, BBC, Reuters)
   - Extracts title, content, URL, and metadata
   - Creates embeddings using Jina AI Embeddings v2

2. **Vector Storage**:
   - Stores embeddings in Qdrant vector database
   - Uses cosine similarity for retrieval
   - Maintains article metadata as payloads

3. **Query Processing**:
   - Receives user query via REST API or WebSocket
   - Creates query embedding using same Jina model
   - Retrieves top-k (default: 5) most relevant articles

4. **Response Generation**:
   - Constructs context from retrieved articles
   - Includes chat history for contextual responses
   - Generates response using Google Gemini Pro
   - Returns response with source citations

### Session Management

- **Session Creation**: Each new user gets a unique session ID (UUID)
- **History Storage**: Chat history stored in Redis with configurable TTL
- **Cache Strategy**: In-memory caching with Redis persistence
- **Session Cleanup**: Automatic expiration after TTL period

### Caching Strategy

```javascript
// Session History Caching
Key: session:{sessionId}:history
TTL: 3600 seconds (1 hour)
Structure: List of JSON objects (messages)

// Cache Warming (future enhancement)
// - Pre-load popular queries
// - Cache embeddings for frequent searches
// - Background refresh of news articles
```

## Performance Optimizations

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Connection Pooling**: Redis connection pooling
- **Batch Processing**: Efficient vector operations
- **Streaming Responses**: Real-time message streaming via WebSocket
- **Lazy Loading**: On-demand article ingestion

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | Required |
| `JINA_API_KEY` | Jina AI API key | Required |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `QDRANT_HOST` | Qdrant host | `localhost` |
| `QDRANT_PORT` | Qdrant port | `6333` |
| `PORT` | Server port | `5000` |
| `SESSION_TTL` | Session TTL in seconds | `3600` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

### Cache Configuration

```javascript
// TTL Configuration
SESSION_TTL=3600          # 1 hour session expiry
CACHE_WARM_INTERVAL=300   # 5 minutes cache warming
MAX_HISTORY_LENGTH=50     # Maximum messages per session

// Vector Search Configuration
TOP_K=5                   # Number of articles to retrieve
SIMILARITY_THRESHOLD=0.7  # Minimum similarity score
EMBEDDING_DIMENSION=1024  # Jina embeddings dimension
```

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Test specific endpoint
curl -X POST http://localhost:5000/api/sessions
```

## Deployment

### Using Docker

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Using Render.com

1. Connect your GitHub repository
2. Set environment variables in Render dashboard
3. Deploy with build command: `npm install`
4. Start command: `npm start`

### Production Considerations

- **Database**: Use managed Redis (Redis Cloud, AWS ElastiCache)
- **Vector DB**: Use Qdrant Cloud or self-hosted cluster
- **Monitoring**: Add logging, metrics, and health checks
- **Security**: API authentication, HTTPS, input validation
- **Scaling**: Load balancing, horizontal scaling

## Error Handling

The server implements comprehensive error handling:

- **Validation Errors**: 400 Bad Request
- **Authentication Errors**: 401 Unauthorized
- **Not Found**: 404 Not Found
- **Rate Limiting**: 429 Too Many Requests
- **Server Errors**: 500 Internal Server Error

## Logging

Structured logging for production debugging:

```javascript
// Example log entries
2024-01-15T10:30:00Z INFO Server started on port 5000
2024-01-15T10:30:05Z INFO Article ingestion completed: 47 articles
2024-01-15T10:30:15Z ERROR Failed to generate response: API rate limit exceeded
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create a GitHub issue
- Check the documentation
- Review the code walkthrough video