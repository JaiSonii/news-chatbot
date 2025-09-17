const chatbot = require('../services/chatbot');
const { logger } = require('../config')

module.exports = (io, socket) => {
  logger.info(`User connected: ${socket.id}`);

  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    logger.info(`User ${socket.id} joined session ${sessionId}`);
  });

  socket.on('send-message', async ({ sessionId, message }) => {
    io.to(sessionId).emit('bot-typing', true);
    try {
      const result = await chatbot.processQuery(sessionId, message);
      io.to(sessionId).emit('bot-typing', false);
      io.to(sessionId).emit('bot-response', { message: result.response, sources: result.sources, timestamp: Date.now() });
    } catch {
      socket.emit('error', { message: "Processing failed" });
    }
  });

  socket.on('clear-session', async (sessionId) => {
    await chatbot.clearHistory(sessionId);
    io.to(sessionId).emit('session-cleared');
  });

  socket.on('disconnect', () => logger.info(`User disconnected: ${socket.id}`));
};
