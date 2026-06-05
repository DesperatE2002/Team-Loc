import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sql, type UserRow } from '../db.js';
import { requireAuth, requireManager } from '../auth.js';
import { publicUser } from './auth.js';
import { ROLES, isManager } from '../roles.js';

const router = Router();

// Tüm yönetim route'ları auth + yönetici (admin/müdür) yetkisi ister
router.use(requireAuth, requireManager);

/** Tüm kullanıcıları listele (seyahat sayısıyla birlikte) */
router.get('/users', async (_req, res) => {
  const rows = (await sql`
    SELECT u.*, COUNT(t.id) AS trip_count
    FROM users u
    LEFT JOIN trips t ON t.user_id = u.id
    GROUP BY u.id
    ORDER BY
      CASE u.role WHEN 'admin' THEN 0 WHEN 'mudur' THEN 1 WHEN 'tekniker' THEN 2 ELSE 3 END,
      u.full_name COLLATE "C"
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
  role: z.enum(ROLES).optional(),
});

/** Yeni kullanıcı oluştur */
router.post('/users', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz veri', details: parsed.error.flatten() });
    return;
  }
  const { username, sicil, password, full_name, role } = parsed.data;

  const existing = (await sql`
    SELECT id FROM users WHERE username = ${username} OR sicil = ${sicil}
  `) as { id: number }[];
  if (existing.length > 0) {
    res.status(409).json({ error: 'Bu kullanıcı adı veya sicil zaten kayıtlı' });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const rows = (await sql`
    INSERT INTO users (username, sicil, email, password_hash, full_name, role)
    VALUES (${username}, ${sicil}, NULL, ${hash}, ${full_name ?? username}, ${role ?? 'uzman'})
    RETURNING *
  `) as UserRow[];
  res.status(201).json({ user: publicUser(rows[0]) });
});

const updateSchema = z.object({
  full_name: z.string().min(2).max(80).optional(),
  sicil: z.string().min(1).max(32).regex(/^[a-zA-Z0-9._/-]+$/).optional(),
  role: z.enum(ROLES).optional(),
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

  // Bir yöneticiyi (admin/müdür) alt role düşürüyorsak ve sistemde başka yönetici kalmıyorsa engelle
  if (data.role && isManager(u.role) && !isManager(data.role)) {
    const managers = (await sql`
      SELECT COUNT(*)::int AS c FROM users WHERE role IN ('admin', 'mudur')
    `) as { c: number }[];
    if (managers[0].c <= 1) {
      res.status(400).json({ error: 'Sistemde en az bir yönetici (admin/müdür) kalmalı' });
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
    sicil: data.sicil ?? u.sicil,
    role: data.role ?? u.role,
    password_hash: data.new_password ? bcrypt.hashSync(data.new_password, 10) : u.password_hash,
  };

  const rows = (await sql`
    UPDATE users SET
      full_name = ${next.full_name},
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
  if (isManager(target[0].role)) {
    const managers = (await sql`
      SELECT COUNT(*)::int AS c FROM users WHERE role IN ('admin', 'mudur')
    `) as { c: number }[];
    if (managers[0].c <= 1) {
      res.status(400).json({ error: 'Son yönetici hesabı silinemez' });
      return;
    }
  }
  await sql`DELETE FROM users WHERE id = ${id}`;
  res.json({ ok: true });
});

export default router;
