const rates = require('../data/tax-rates.json');

const EU_COUNTRIES = ['AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI',
  'FR','GR','HR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT',
  'RO','SE','SI','SK'];

function calculateTax({ country_code, price, customer_type = 'B2C', product_type = 'digital_subscription' }) {
  const code = country_code.toUpperCase();
  const rateData = rates[code];

  if (!rateData) {
    return {
      success: false,
      error: `Country code '${code}' not supported. Check /v1/rates for supported countries.`
    };
  }

  const isEU = EU_COUNTRIES.includes(code);
  const isB2B = customer_type.toUpperCase() === 'B2B';
  const isReverseCharge = isEU && isB2B;

  // B2B EU transactions: reverse charge — 0% charged by seller
  const effectiveRate = isReverseCharge ? 0 : (rateData.digital_services_rate ?? rateData.standard_rate);

  const taxAmount = parseFloat((price * effectiveRate).toFixed(2));
  const totalPrice = parseFloat((price + taxAmount).toFixed(2));

  let mechanism = 'standard_rate';
  let notes = rateData.notes;

  if (isReverseCharge) {
    mechanism = 'reverse_charge';
    notes = `EU Reverse Charge applies. As a B2B transaction, you charge 0% VAT. The buyer self-accounts for VAT in their country (${rateData.country}). Include "VAT: Reverse Charge" on your invoice.`;
  } else if (isEU) {
    mechanism = 'eu_oss';
    notes = `${rateData.notes} EU VAT OSS registration required if annual cross-border EU digital sales exceed €10,000.`;
  }

  return {
    success: true,
    data: {
      country: rateData.country,
      country_code: code,
      currency: rateData.currency,
      price_before_tax: price,
      tax_rate: effectiveRate,
      tax_rate_percent: `${(effectiveRate * 100).toFixed(1)}%`,
      tax_amount: taxAmount,
      total_price: totalPrice,
      tax_type: rateData.tax_type,
      compliance: {
        regime: isEU ? 'EU_VAT' : rateData.region + '_TAX',
        customer_type: customer_type.toUpperCase(),
        mechanism,
        oss_applicable: isEU && !isB2B,
        reverse_charge: isReverseCharge,
        notes,
        confidence: rateData.confidence
      }
    },
    meta: {
      rate_updated: rateData.last_updated,
      version: '1.0'
    }
  };
}

module.exports = { calculateTax };