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

// Semua route di bawah ini hanya untuk admin
router.use(requireAuth, requireRole('admin'));

router.get('/services', adminListServices);
router.post('/services', createService);
router.get('/services/:id', getService);
router.put('/services/:id', updateService);
router.delete('/services/:id', deleteService);

router.get('/settings', adminGetSettings);
router.put('/settings', adminUpdateSettings);

module.exports = router;
