const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const chatSocket = require('./socket/chat');
const { errorHandler } = require('./utils/errorHandler');
const logger = require('./utils/logger');
const env = require('./config/env')


const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: env.FRONTEND_URL || "http://localhost:5173", methods: ["GET", "POST"] }
});

// Middleware
app.use(cors());
app.use(express.json());

// Rate Limiting
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Routes
app.use('/api', routes);

// Error Handling
app.use(errorHandler);

// Socket.IO
io.on('connection', (socket) => chatSocket(io, socket));

// Start Server
const PORT = env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});
