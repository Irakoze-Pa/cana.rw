const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { Invoice, Payment } = require('../dist/modules/billing/billing.model');
const { recordPayment } = require('../dist/modules/billing/billing.service');
const id = new mongoose.Types.ObjectId().toString();
let invoice;
let receipts;
const session = {};
// In-memory transaction double verifies service accounting and shared-session writes.
mongoose.connection.transaction = async callback => {
  const before = { ...invoice };
  const count = receipts.length;
  try { return await callback(session); }
  catch (error) { Object.assign(invoice, before); receipts.length = count; throw error; }
};
Invoice.findById = () => {
  const query = { session(value) { assert.equal(value, session); return this; }, populate() { return this; }, lean() { return Promise.resolve(invoice); }, then(resolve, reject) { return Promise.resolve(invoice).then(resolve, reject); } };
  return query;
};
Payment.countDocuments = async () => receipts.length;
Payment.create = async (rows, options) => { assert.equal(options.session, session); receipts.push(...rows); return rows; };
async function run() {
  receipts = [];
  invoice = { _id: id, customer: id, total: 100, amountPaid: 0, balance: 100, status: 'issued', async save(options) { assert.equal(options.session, session); } };
  await assert.rejects(recordPayment({ invoice: id, amount: -1, method: 'cash' }), /greater than zero/);
  await assert.rejects(recordPayment({ invoice: id, amount: 10, method: 'invalid' }), /valid payment method/);
  await assert.rejects(recordPayment({ invoice: id, amount: 101, method: 'cash' }), /outstanding balance/);
  assert.equal(receipts.length, 0);
  await recordPayment({ invoice: id, amount: 35.25, method: 'cash' });
  assert.equal(invoice.balance, 64.75);
  assert.equal(invoice.status, 'partially_paid');
  await recordPayment({ invoice: id, amount: 64.75, method: 'bank_transfer' });
  assert.equal(invoice.balance, 0);
  assert.equal(invoice.amountPaid, 100);
  assert.equal(invoice.status, 'paid');
  assert.equal(receipts.length, 2);
  await assert.rejects(recordPayment({ invoice: id, amount: 1, method: 'cash' }), /outstanding balance/);
  invoice.status = 'void';
  await assert.rejects(recordPayment({ invoice: id, amount: 1, method: 'cash' }), /void invoice/);
  invoice.status = 'issued'; invoice.balance = 100; invoice.amountPaid = 0;
  invoice.save = async () => { throw new Error('Simulated database failure'); };
  await assert.rejects(recordPayment({ invoice: id, amount: 20, method: 'cash' }), /database failure/);
  assert.equal(receipts.length, 2);
  assert.equal(invoice.balance, 100);
  console.log('Billing workflow tests passed: partial/full payment, invalid method, overpayment, void invoice, transaction failure.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
