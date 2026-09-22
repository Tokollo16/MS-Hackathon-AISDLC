import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import orderRouter from './order';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { runMigrations } from '../db/migrate';
import { errorHandler } from '../utils/errors';

let app: express.Express;

describe('Order history API', () => {
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
      'INSERT INTO suppliers (supplier_id, name, description, contact_person, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [1, 'Supplier One', 'Test supplier', 'Test Person', 'test@example.com', '555-0000'],
    );
    await db.run(
      'INSERT INTO products (product_id, supplier_id, name, description, price, sku, unit) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [1, 1, 'Smart Feeder', 'Test product', 25, 'TEST-001', 'piece'],
    );
    await db.run(
      'INSERT INTO orders (order_id, branch_id, order_date, name, description, status) VALUES (?, ?, ?, ?, ?, ?)',
      [1, 1, '2026-09-22T10:00:00.000Z', 'September order', 'Test order', 'pending'],
    );
    await db.run(
      'INSERT INTO order_details (order_id, product_id, quantity, unit_price, notes) VALUES (?, ?, ?, ?, ?)',
      [1, 1, 2, 25, ''],
    );

    app = express();
    app.use(express.json());
    app.use('/orders', orderRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it('returns branch orders with line items and totals', async () => {
    const response = await request(app).get('/orders/history?branchId=1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({
        orderId: 1,
        branchId: 1,
        total: 50,
        items: [
          {
            productId: 1,
            productName: 'Smart Feeder',
            quantity: 2,
            unitPrice: 25,
          },
        ],
      }),
    ]);
  });

  it('rejects an invalid branch ID', async () => {
    const response = await request(app).get('/orders/history?branchId=invalid');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
