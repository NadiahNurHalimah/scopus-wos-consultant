const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { downloadAttachment } = require('../controllers/messageController');

// GET /api/messages/:id/attachment – download lampiran dengan verifikasi hak akses
router.get('/:id/attachment', requireAuth, downloadAttachment);

module.exports = router;

