import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import orderDetailRouter from './orderDetail';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { runMigrations } from '../db/migrate';
import { errorHandler } from '../utils/errors';

let app: express.Express;

const validDetail = {
  orderId: 1,
  productId: 1,
  quantity: 2,
  unitPrice: 25,
  notes: '',
};

describe('Order detail API', () => {
  beforeEach(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    const db = await getDatabase();
    await db.run('INSERT INTO headquarters (headquarters_id, name) VALUES (?, ?)', [1, 'HQ One']);
    await db.run(
      'INSERT INTO branches (branch_id, headquarters_id, name) VALUES (?, ?, ?)',
      [1, 1, 'Main Branch'],
    );
    await db.run(
      'INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)',
      [1, 'Supplier One'],
    );
    await db.run(
      'INSERT INTO products (product_id, supplier_id, name, price, sku, unit) VALUES (?, ?, ?, ?, ?, ?)',
      [1, 1, 'Smart Feeder', 25, 'TEST-001', 'piece'],
    );
    await db.run(
      'INSERT INTO orders (order_id, branch_id, order_date, name, status) VALUES (?, ?, ?, ?, ?)',
      [1, 1, '2026-09-22T10:00:00.000Z', 'Test order', 'pending'],
    );

    app = express();
    app.use(express.json());
    app.use('/order-details', orderDetailRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it.each([0, -1, 1.5, '2'])('rejects invalid quantity %p when creating a cart line', async (quantity) => {
    const response = await request(app)
      .post('/order-details')
      .send({ ...validDetail, quantity });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an invalid quantity when updating a cart line', async () => {
    const created = await request(app).post('/order-details').send(validDetail);
    const response = await request(app)
      .put(`/order-details/${created.body.orderDetailId}`)
      .send({ quantity: 0 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates a valid cart line', async () => {
    const response = await request(app).post('/order-details').send(validDetail);

    expect(response.status).toBe(201);
    expect(response.body.quantity).toBe(2);
  });
});
