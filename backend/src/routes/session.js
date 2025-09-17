const express = require('express');
const { v4: uuidv4 } = require('uuid');
const chatbot = require('../services/chatbot');

const router = express.Router();

router.post('/', (req, res) => res.json({ sessionId: uuidv4() }));
router.get('/:sessionId/history', async (req, res) => res.json({ history: await chatbot.getHistory(req.params.sessionId) }));
router.delete('/:sessionId', async (req, res) => res.json({ success: await chatbot.clearHistory(req.params.sessionId) }));

module.exports = router;
