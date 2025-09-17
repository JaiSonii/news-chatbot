const express = require('express');
const chatRoutes = require('./chat');
const sessionRoutes = require('./session');

const router = express.Router();

router.use('/chat', chatRoutes);
router.use('/sessions', sessionRoutes);

router.get('/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString() }));

module.exports = router;
