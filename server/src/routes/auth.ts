import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { sql, type UserRow } from '../db.js';
import { requireAuth, signToken } from '../auth.js';

const router = Router();

export const POSITIONS = ['Müdür', 'Uzman', 'Mühendis', 'Teknisyen', 'Stajyer'] as const;

const registerSchema = z.object({
  username: z.string().min(2).max(32).regex(/^[a-zA-Z0-9._-]+$/),
  email: z.string().email(),
  password: z.string().min(3).max(128),
  full_name: z.string().min(2).max(80),
  position: z.enum(POSITIONS).optional(),
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
  const { username, email, password, full_name, position } = parsed.data;

  const existing = (await sql`
    SELECT id FROM users WHERE username = ${username} OR email = ${email}
  `) as { id: number }[];
  if (existing.length > 0) {
    res.status(409).json({ error: 'Kullanıcı adı veya e-posta zaten kayıtlı' });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const rows = (await sql`
    INSERT INTO users (username, email, password_hash, full_name, position, role)
    VALUES (${username}, ${email}, ${hash}, ${full_name}, ${position ?? null}, 'member')
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
    SELECT * FROM users WHERE username = ${username} OR email = ${username}
  `) as UserRow[];
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
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
    email: u.email,
    full_name: u.full_name,
    position: u.position ?? null,
    avatar_url: u.avatar_url ?? null,
    created_at: u.created_at,
  };
}

export default router;
