require('dotenv').config({ quiet: true });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pool = require('./src/config/db');
const authRoutes         = require('./src/routes/auth');
const serviceRoutes      = require('./src/routes/services');
const adminRoutes        = require('./src/routes/admin');
const consultationRoutes = require('./src/routes/consultations');
const manuscriptRoutes   = require('./src/routes/manuscripts');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

app.use('/api/auth',          authRoutes);
app.use('/api/services',      serviceRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/manuscripts',   manuscriptRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint tidak ditemukan' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Terjadi kesalahan pada server' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API berjalan di port ${PORT}`));

module.exports = app;
