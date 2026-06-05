import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import tripsRouter from './routes/trips.js';
import { ensureSchema } from './db.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '4mb' }));

  // Şemayı ilk request'ten önce hazırlamayı garanti et (idempotent)
  app.use(async (_req, _res, next) => {
    try {
      await ensureSchema();
      next();
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/trips', tripsRouter);

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error('[server error]', err);
      res.status(500).json({ error: 'Sunucu hatası' });
    },
  );

  return app;
}

export default createApp;
