const router = require('express').Router();
const { listServices } = require('../controllers/serviceController');

// GET /api/services – publik, hanya yang aktif
router.get('/', listServices);

module.exports = router;
