import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sql, type TripRow, type UserRow } from '../db.js';
import { requireAuth } from '../auth.js';
import { publicUser } from './auth.js';

const router = Router();

router.use(requireAuth);

router.get('/team', async (_req, res) => {
  const users = (await sql`
    SELECT * FROM users ORDER BY full_name COLLATE "C"
  `) as UserRow[];

  const today = new Date().toISOString().slice(0, 10);
  const enriched = await Promise.all(
    users.map(async (u) => {
      const rows = (await sql`
        SELECT * FROM trips
        WHERE user_id = ${u.id}
          AND start_date <= ${today}::date
          AND (end_date IS NULL OR end_date >= ${today}::date)
        ORDER BY start_date DESC, id DESC
        LIMIT 1
      `) as TripRow[];
      return {
        ...publicUser(u),
        current_trip: rows[0] ? normalizeTrip(rows[0]) : null,
      };
    }),
  );
  res.json({ team: enriched });
});

const updateMeSchema = z.object({
  full_name: z.string().min(2).max(80).optional(),
  email: z.union([z.string().email(), z.literal('')]).nullable().optional(),
  avatar_url: z
    .string()
    .max(2_000_000)
    .regex(/^data:image\/(png|jpe?g|webp);base64,/)
    .nullable()
    .optional(),
});

router.patch('/me', async (req, res) => {
  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz veri', details: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;
  const id = req.user!.id;

  // Mevcut değerleri çek, eksik alanları koru → tek bir UPDATE ile yaz
  const current = (await sql`SELECT * FROM users WHERE id = ${id}`) as UserRow[];
  if (current.length === 0) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    return;
  }
  const u = current[0];
  const next = {
    full_name: data.full_name ?? u.full_name,
    email: data.email !== undefined ? (data.email || null) : u.email,
    avatar_url: data.avatar_url !== undefined ? data.avatar_url : u.avatar_url,
  };

  const rows = (await sql`
    UPDATE users SET
      full_name = ${next.full_name},
      email = ${next.email},
      avatar_url = ${next.avatar_url}
    WHERE id = ${id}
    RETURNING *
  `) as UserRow[];
  res.json({ user: publicUser(rows[0]) });
});

const passwordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(3).max(128),
});

router.post('/me/password', async (req, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz veri' });
    return;
  }
  const rows = (await sql`SELECT * FROM users WHERE id = ${req.user!.id}`) as UserRow[];
  const u = rows[0];
  if (!u || !bcrypt.compareSync(parsed.data.current_password, u.password_hash)) {
    res.status(401).json({ error: 'Mevcut şifre hatalı' });
    return;
  }
  const hash = bcrypt.hashSync(parsed.data.new_password, 10);
  await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${req.user!.id}`;
  res.json({ ok: true });
});

router.delete('/me', async (req, res) => {
  await sql`DELETE FROM users WHERE id = ${req.user!.id}`;
  res.json({ ok: true });
});

function normalizeTrip(
  t: TripRow,
): Omit<TripRow, 'is_domestic'> & { is_domestic: 0 | 1 } {
  // Frontend hâlâ 0/1 bekliyor olabilir → uyumlu kalmak için cast
  return { ...t, is_domestic: (t.is_domestic ? 1 : 0) as 0 | 1 };
}

export default router;
