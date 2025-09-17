const express = require('express');
const chatbot = require('../services/chatbot');

const router = express.Router();

router.post('/', async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessionId || !message) return res.status(400).json({ error: "Missing sessionId or message" });

  try {
    const result = await chatbot.processQuery(sessionId, message);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to process query" });
  }
});

router.post('/ingest', async (req, res) => {
  try {
    const count = await chatbot.ingestArticles();
    res.json({ message: `Ingested ${count} articles` });
  } catch (err) {
    res.status(500).json({ error: "Ingestion failed" });
  }
});

module.exports = router;
