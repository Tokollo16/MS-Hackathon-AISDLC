import express from 'express';
import { getDatabase } from '../db/sqlite';

const router = express.Router();

router.get('/live', (_req, res) => {
  res.json({ status: 'healthy' });
});

router.get('/ready', async (_req, res, next) => {
  try {
    const db = await getDatabase();
    await db.get<{ ok: number }>('SELECT 1 AS ok');
    res.json({ status: 'ready', dependencies: { database: 'healthy' } });
  } catch (error) {
    next(error);
  }
});

export default router;
