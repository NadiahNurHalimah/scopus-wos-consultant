const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  createConsultation,
  listConsultations,
  getConsultationsSummary,
  getConsultation,
  assignConsultant,
  updateStatus,
} = require('../controllers/consultationController');
const { handleUpload, uploadManuscript } = require('../controllers/manuscriptController');
const { handleProofUpload, uploadPaymentProof } = require('../controllers/paymentController');
const {
  handleAttachmentUpload,
  listMessages,
  sendMessage,
  markMessagesAsRead,
} = require('../controllers/messageController');

// Pembatas kecepatan kirim pesan (30 per menit per pengguna)
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user && req.user.id ? String(req.user.id) : (req.ip || 'anonymous')),
  validate: false,
  message: { message: 'Terlalu banyak pesan yang dikirim, silakan tunggu sebentar' },
});

// POST /api/consultations – hanya klien
router.post('/', requireAuth, requireRole('client'), createConsultation);

// GET /api/consultations/summary – jumlah per status sesuai peran
router.get('/summary', requireAuth, getConsultationsSummary);

// GET /api/consultations – semua peran yang login (?status=, ?q=, unread_count)
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

// POST /api/consultations/:id/payments/proof – klien pemilik unggah bukti transfer
router.post(
  '/:id/payments/proof',
  requireAuth,
  requireRole('client'),
  handleProofUpload,
  uploadPaymentProof
);

// GET /api/consultations/:id/messages – klien pemilik, konsultan ditugaskan, admin
router.get('/:id/messages', requireAuth, listMessages);

// POST /api/consultations/:id/messages – kirim pesan dengan rate limiter 30/menit
router.post(
  '/:id/messages',
  requireAuth,
  messageLimiter,
  handleAttachmentUpload,
  sendMessage
);

// PATCH /api/consultations/:id/messages/read – tandai pesan sebagai dibaca
router.patch('/:id/messages/read', requireAuth, markMessagesAsRead);

module.exports = router;
