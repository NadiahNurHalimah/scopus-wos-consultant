const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  createConsultation,
  listConsultations,
  getConsultation,
  assignConsultant,
  updateStatus,
} = require('../controllers/consultationController');
const { handleUpload, uploadManuscript } = require('../controllers/manuscriptController');

// POST /api/consultations – hanya klien
router.post('/', requireAuth, requireRole('client'), createConsultation);

// GET /api/consultations – semua peran yang login
router.get('/', requireAuth, listConsultations);

// GET /api/consultations/:id – semua peran yang login (hak akses dicek di controller)
router.get('/:id', requireAuth, getConsultation);

// PATCH /api/consultations/:id/assign – hanya admin
router.patch('/:id/assign', requireAuth, requireRole('admin'), assignConsultant);

// PATCH /api/consultations/:id/status – konsultan, admin, atau klien (untuk cancel)
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('client', 'consultant', 'admin'),
  updateStatus
);

// POST /api/consultations/:id/manuscripts – klien dan konsultan
router.post(
  '/:id/manuscripts',
  requireAuth,
  requireRole('client', 'consultant', 'admin'),
  handleUpload,
  uploadManuscript
);

module.exports = router;
