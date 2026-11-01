const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { downloadManuscript } = require('../controllers/manuscriptController');

// GET /api/manuscripts/:id/download – hak akses dicek di controller
router.get('/:id/download', requireAuth, downloadManuscript);

module.exports = router;
