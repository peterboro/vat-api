const express = require('express');
const router = express.Router();
const { calculateTax } = require('../engine/ruleEngine');

router.post('/', (req, res) => {
  const { country_code, price, currency, customer_type, product_type } = req.body;

  // Validation
  if (!country_code || price === undefined) {
    return res.status(400).json({
      success: false,
      error: 'country_code and price are required fields.'
    });
  }

  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({
      success: false,
      error: 'price must be a non-negative number.'
    });
  }

  const result = calculateTax({ country_code, price, currency, customer_type, product_type });

  if (!result.success) {
    return res.status(404).json(result);
  }

  return res.status(200).json(result);
});

module.exports = router;