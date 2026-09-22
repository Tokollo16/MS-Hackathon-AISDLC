import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import healthRouter from './health';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { runMigrations } from '../db/migrate';
import { errorHandler } from '../utils/errors';

let app: express.Express;

describe('Health API', () => {
  beforeEach(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    app = express();
    app.use('/health', healthRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it('reports liveness without requiring dependencies', async () => {
    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'healthy' });
  });

  it('reports readiness when SQLite is available', async () => {
    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ready',
      dependencies: { database: 'healthy' },
    });
  });

  it('recovers readiness after the database connection is closed', async () => {
    await closeDatabase();

    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ready');
  });
});
