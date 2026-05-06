require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const calculateRoute = require('./routes/calculate');
const ratesRoute = require('./routes/rates');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting (backup to RapidAPI's own limiting)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: 'Too many requests, slow down.' }
});
app.use(limiter);

// Routes
app.use('/v1/calculate', calculateRoute);
app.use('/v1/rates', ratesRoute);
app.get('/v1/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, error: 'Endpoint not found.' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`VAT API running on port ${PORT}`));

module.exports = app;