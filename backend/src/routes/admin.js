const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  adminListServices,
  createService,
  getService,
  updateService,
  deleteService,
} = require('../controllers/serviceController');
const {
  adminGetSettings,
  adminUpdateSettings,
} = require('../controllers/settingController');

// Semua route di bawah ini memerlukan login
router.use(requireAuth);

// Layanan: GET boleh untuk admin dan owner (monitoring), mutasi hanya admin
router.get('/services', requireRole('admin', 'owner'), adminListServices);
router.post('/services', requireRole('admin'), createService);
router.get('/services/:id', requireRole('admin', 'owner'), getService);
router.put('/services/:id', requireRole('admin'), updateService);
router.delete('/services/:id', requireRole('admin'), deleteService);

// Pengaturan: GET boleh untuk admin dan owner (monitoring), PUT hanya admin
router.get('/settings', requireRole('admin', 'owner'), adminGetSettings);
router.put('/settings', requireRole('admin'), adminUpdateSettings);

module.exports = router;
