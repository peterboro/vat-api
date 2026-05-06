const express = require('express');
const router = express.Router();
const rates = require('../data/tax-rates.json');

// GET /v1/rates — all countries
router.get('/', (req, res) => {
  const summary = Object.entries(rates).map(([code, data]) => ({
    country_code: code,
    country: data.country,
    tax_type: data.tax_type,
    standard_rate_percent: `${(data.standard_rate * 100).toFixed(1)}%`,
    digital_services_rate_percent: `${((data.digital_services_rate ?? data.standard_rate) * 100).toFixed(1)}%`,
    region: data.region
  }));
  res.json({ success: true, count: summary.length, data: summary });
});

// GET /v1/rates/:code — single country
router.get('/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const data = rates[code];
  if (!data) {
    return res.status(404).json({ success: false, error: `Country '${code}' not found.` });
  }
  res.json({ success: true, data: { country_code: code, ...data } });
});

module.exports = router;