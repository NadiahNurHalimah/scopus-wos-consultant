const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  listPayments,
  getPaymentProof,
  updatePaymentStatus,
} = require('../controllers/paymentController');

// GET /api/payments – klien (milik sendiri), konsultan (ditugaskan), admin (semua)
router.get('/', requireAuth, listPayments);

// GET /api/payments/:id/proof – hanya klien pemilik dan admin
router.get('/:id/proof', requireAuth, getPaymentProof);

// PATCH /api/payments/:id – khusus admin
router.patch('/:id', requireAuth, requireRole('admin'), updatePaymentStatus);

module.exports = router;

