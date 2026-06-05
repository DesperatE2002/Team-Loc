import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sql, type UserRow } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { POSITIONS, publicUser } from './auth.js';

const router = Router();

// Tüm admin route'ları auth + admin yetkisi ister
router.use(requireAuth, requireAdmin);

/** Tüm kullanıcıları listele (seyahat sayısıyla birlikte) */
router.get('/users', async (_req, res) => {
  const rows = (await sql`
    SELECT u.*, COUNT(t.id) AS trip_count
    FROM users u
    LEFT JOIN trips t ON t.user_id = u.id
    GROUP BY u.id
    ORDER BY u.role DESC, u.full_name COLLATE "C"
  `) as (UserRow & { trip_count: number })[];
  res.json({
    users: rows.map((u) => ({ ...publicUser(u), trip_count: Number(u.trip_count) })),
  });
});

const createSchema = z.object({
  username: z.string().min(2).max(32).regex(/^[a-zA-Z0-9._-]+$/),
  sicil: z.string().min(1).max(32).regex(/^[a-zA-Z0-9._/-]+$/),
  password: z.string().min(3).max(128),
  full_name: z.string().min(2).max(80).optional(),
  position: z.enum(POSITIONS).nullable().optional(),
  role: z.enum(['admin', 'member']).optional(),
});

/** Yeni kullanıcı oluştur */
router.post('/users', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz veri', details: parsed.error.flatten() });
    return;
  }
  const { username, sicil, password, full_name, position, role } = parsed.data;

  const existing = (await sql`
    SELECT id FROM users WHERE username = ${username} OR sicil = ${sicil}
  `) as { id: number }[];
  if (existing.length > 0) {
    res.status(409).json({ error: 'Bu kullanıcı adı veya sicil zaten kayıtlı' });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const rows = (await sql`
    INSERT INTO users (username, sicil, email, password_hash, full_name, position, role)
    VALUES (${username}, ${sicil}, NULL, ${hash}, ${full_name ?? username}, ${position ?? null}, ${role ?? 'member'})
    RETURNING *
  `) as UserRow[];
  res.status(201).json({ user: publicUser(rows[0]) });
});

const updateSchema = z.object({
  full_name: z.string().min(2).max(80).optional(),
  position: z.enum(POSITIONS).nullable().optional(),
  sicil: z.string().min(1).max(32).regex(/^[a-zA-Z0-9._/-]+$/).optional(),
  role: z.enum(['admin', 'member']).optional(),
  new_password: z.string().min(3).max(128).optional(),
});

/** Kullanıcıyı güncelle (rol, bilgiler, şifre sıfırlama) */
router.patch('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'Geçersiz id' });
    return;
  }
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz veri', details: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;

  const current = (await sql`SELECT * FROM users WHERE id = ${id}`) as UserRow[];
  if (current.length === 0) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    return;
  }
  const u = current[0];

  // Kendi admin rolünü düşürmeyi ya da son admini düşürmeyi engelle
  if (data.role === 'member' && u.role === 'admin') {
    const admins = (await sql`SELECT COUNT(*)::int AS c FROM users WHERE role = 'admin'`) as {
      c: number;
    }[];
    if (admins[0].c <= 1) {
      res.status(400).json({ error: 'Sistemde en az bir admin kalmalı' });
      return;
    }
  }

  // Sicil benzersizliği kontrolü
  if (data.sicil && data.sicil !== u.sicil) {
    const dup = (await sql`SELECT id FROM users WHERE sicil = ${data.sicil} AND id <> ${id}`) as {
      id: number;
    }[];
    if (dup.length > 0) {
      res.status(409).json({ error: 'Bu sicil başka bir kullanıcıya ait' });
      return;
    }
  }

  const next = {
    full_name: data.full_name ?? u.full_name,
    position: data.position !== undefined ? data.position : u.position,
    sicil: data.sicil ?? u.sicil,
    role: data.role ?? u.role,
    password_hash: data.new_password ? bcrypt.hashSync(data.new_password, 10) : u.password_hash,
  };

  const rows = (await sql`
    UPDATE users SET
      full_name = ${next.full_name},
      position = ${next.position},
      sicil = ${next.sicil},
      role = ${next.role},
      password_hash = ${next.password_hash}
    WHERE id = ${id}
    RETURNING *
  `) as UserRow[];
  res.json({ user: publicUser(rows[0]) });
});

/** Kullanıcıyı sil */
router.delete('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'Geçersiz id' });
    return;
  }
  if (id === req.user!.id) {
    res.status(400).json({ error: 'Kendi hesabınızı buradan silemezsiniz' });
    return;
  }
  const target = (await sql`SELECT role FROM users WHERE id = ${id}`) as { role: string }[];
  if (target.length === 0) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    return;
  }
  if (target[0].role === 'admin') {
    const admins = (await sql`SELECT COUNT(*)::int AS c FROM users WHERE role = 'admin'`) as {
      c: number;
    }[];
    if (admins[0].c <= 1) {
      res.status(400).json({ error: 'Son admin hesabı silinemez' });
      return;
    }
  }
  await sql`DELETE FROM users WHERE id = ${id}`;
  res.json({ ok: true });
});

export default router;
