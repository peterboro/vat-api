const request = require('supertest');
const app = require('../src/app');

describe('POST /v1/calculate', () => {
  test('returns correct VAT for Germany B2C', async () => {
    const res = await request(app)
      .post('/v1/calculate')
      .send({ country_code: 'DE', price: 100, customer_type: 'B2C' });
    
    expect(res.status).toBe(200);
    expect(res.body.data.tax_rate).toBe(0.19);
    expect(res.body.data.tax_amount).toBe(19.00);
    expect(res.body.data.compliance.reverse_charge).toBe(false);
  });

  test('applies reverse charge for EU B2B', async () => {
    const res = await request(app)
      .post('/v1/calculate')
      .send({ country_code: 'DE', price: 100, customer_type: 'B2B' });
    
    expect(res.body.data.tax_rate).toBe(0);
    expect(res.body.data.compliance.reverse_charge).toBe(true);
  });

  test('returns 400 for missing country_code', async () => {
    const res = await request(app)
      .post('/v1/calculate')
      .send({ price: 50 });
    expect(res.status).toBe(400);
  });
});