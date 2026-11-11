const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { getPaymentSettings } = require('../controllers/settingController');

// GET /api/settings/payment – harus login
router.get('/payment', requireAuth, getPaymentSettings);

module.exports = router;

