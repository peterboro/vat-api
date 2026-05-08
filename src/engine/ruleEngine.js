const rawData = require('../data/tax-rates.json');

// Flatten nested regional structure into a single lookup map
const rates = {};
Object.entries(rawData).forEach(([key, value]) => {
  if (key === '_meta') return;
  Object.entries(value).forEach(([countryCode, countryData]) => {
    rates[countryCode] = countryData;
  });
});

const EU_COUNTRIES = [
  'AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI',
  'FR','GR','HR','HU','IE','IT','LT','LU','LV','MT',
  'NL','PL','PT','RO','SE','SI','SK'
];

const US_STATES = [
  'US-TX','US-NY','US-WA','US-PA','US-OH','US-IL',
  'US-FL','US-CA','US-GA','US-NC','US-AZ','US-CO',
  'US-MA'
];

function getSupportedCountries() {
  return Object.entries(rates).map(([code, data]) => ({
    country_code: code,
    country: data.country,
    tax_type: data.tax_type,
    standard_rate_percent: `${(data.standard_rate * 100).toFixed(1)}%`,
    digital_services_rate_percent: `${((data.digital_services_rate ?? data.standard_rate) * 100).toFixed(1)}%`,
    currency: data.currency,
    region: data.region,
    eu_member: data.eu_member ?? false
  }));
}

function getRateByCode(code) {
  return rates[code.toUpperCase()] || null;
}

function calculateTax({ country_code, price, customer_type = 'B2C', product_type = 'digital_subscription' }) {
  const code = country_code.toUpperCase();
  const rateData = rates[code];

  if (!rateData) {
    return {
      success: false,
      error: `Country code '${code}' is not supported. Use GET /v1/rates to see all supported countries.`,
      suggestion: code.startsWith('US') ? 
        'For US states use format: US-TX, US-CA, US-NY etc.' : 
        'Ensure you are using ISO 3166-1 alpha-2 format (e.g. DE, GB, KE)'
    };
  }

  const isEU = EU_COUNTRIES.includes(code);
  const isUS = US_STATES.includes(code);
  const isB2B = customer_type.toUpperCase() === 'B2B';
  const isReverseCharge = isEU && isB2B;

  // Determine effective rate
  const baseRate = rateData.digital_services_rate ?? rateData.standard_rate;
  const effectiveRate = isReverseCharge ? 0 : baseRate;

  const taxAmount = parseFloat((price * effectiveRate).toFixed(2));
  const totalPrice = parseFloat((price + taxAmount).toFixed(2));

  // Build compliance info
  let mechanism = 'standard_rate';
  let regime = `${rateData.region}_TAX`;
  let notes = rateData.notes;
  let ossApplicable = false;
  let invoiceNote = null;

  if (isReverseCharge) {
    mechanism = 'reverse_charge';
    regime = 'EU_VAT';
    ossApplicable = false;
    invoiceNote = 'VAT: Reverse Charge — Article 196 EU VAT Directive';
    notes = `EU Reverse Charge applies. As a B2B transaction, charge 0% VAT. ` +
      `The buyer self-accounts for VAT in ${rateData.country}. ` +
      `Include "${invoiceNote}" on your invoice.`;
  } else if (isEU) {
    mechanism = 'eu_oss';
    regime = 'EU_VAT';
    ossApplicable = true;
    invoiceNote = `VAT ${(effectiveRate * 100).toFixed(1)}% — ${rateData.country}`;
    notes = `${rateData.notes}`;
  } else if (isUS) {
    mechanism = 'us_sales_tax';
    regime = 'US_SALES_TAX';
    invoiceNote = effectiveRate > 0 
      ? `Sales Tax ${(effectiveRate * 100).toFixed(2)}%` 
      : 'No sales tax applicable';
  } else if (code === 'GB') {
    mechanism = 'uk_vat';
    regime = 'UK_VAT';
    invoiceNote = `VAT ${(effectiveRate * 100).toFixed(1)}%`;
  } else if (rateData.region === 'APAC') {
    mechanism = 'gst';
    regime = 'APAC_GST';
    invoiceNote = `${rateData.tax_type} ${(effectiveRate * 100).toFixed(1)}%`;
  }

  // Registration threshold note
  let thresholdNote = null;
  if (rateData.registration_threshold) {
    thresholdNote = `Registration threshold: ${rateData.registration_threshold_currency || rateData.currency} ${rateData.registration_threshold.toLocaleString()}/year`;
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
        regime,
        customer_type: customer_type.toUpperCase(),
        mechanism,
        eu_member: rateData.eu_member ?? false,
        oss_applicable: ossApplicable,
        reverse_charge: isReverseCharge,
        registration_threshold: thresholdNote,
        invoice_note: invoiceNote,
        notes,
        confidence: rateData.confidence
      }
    },
    meta: {
      rate_updated: rateData.last_updated,
      source: rateData.source,
      version: '2.0',
      disclaimer: 'Not a substitute for professional tax advice.'
    }
  };
}

module.exports = { calculateTax, getSupportedCountries, getRateByCode };