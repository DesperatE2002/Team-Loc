import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { sql, type UserRow } from '../db.js';
import { requireAuth, signToken } from '../auth.js';

const router = Router();

export const POSITIONS = ['Müdür', 'Uzman', 'Mühendis', 'Teknisyen', 'Stajyer'] as const;

const registerSchema = z.object({
  username: z.string().min(2).max(32).regex(/^[a-zA-Z0-9._-]+$/),
  sicil: z.string().min(1).max(32).regex(/^[a-zA-Z0-9._/-]+$/),
  password: z.string().min(3).max(128),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz veri', details: parsed.error.flatten() });
    return;
  }
  const { username, sicil, password } = parsed.data;

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
    VALUES (${username}, ${sicil}, NULL, ${hash}, ${username}, 'member')
    RETURNING *
  `) as UserRow[];
  const user = rows[0];

  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz veri' });
    return;
  }
  const { username, password } = parsed.data;
  const rows = (await sql`
    SELECT * FROM users WHERE username = ${username} OR sicil = ${username}
  `) as UserRow[];
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Kullanıcı adı/sicil veya şifre hatalı' });
    return;
  }
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const rows = (await sql`SELECT * FROM users WHERE id = ${req.user!.id}`) as UserRow[];
  res.json({ user: publicUser(rows[0]) });
});

export function publicUser(u: UserRow) {
  return {
    id: u.id,
    username: u.username,
    sicil: u.sicil ?? null,
    email: u.email ?? null,
    full_name: u.full_name,
    position: u.position ?? null,
    avatar_url: u.avatar_url ?? null,
    role: u.role,
    created_at: u.created_at,
  };
}

export default router;
