import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { sql, type UserRow } from './db.js';
import { isManager, type Role } from './roles.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
const JWT_EXPIRES_IN = '7d';

export type AuthPayload = { id: number; username: string; role: Role };

export function signToken(user: Pick<UserRow, 'id' | 'username' | 'role'>): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role } satisfies AuthPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Yetkisiz' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    const rows = (await sql`SELECT id, role FROM users WHERE id = ${payload.id}`) as {
      id: number;
      role: Role;
    }[];
    if (rows.length === 0) {
      res.status(401).json({ error: 'Kullanıcı bulunamadı' });
      return;
    }
    // Rolü DB'den taze al (admin rol değişiklikleri anında geçerli olsun)
    req.user = { ...payload, role: rows[0].role };
    next();
  } catch {
    res.status(401).json({ error: 'Geçersiz token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Bu işlem için admin yetkisi gerekli' });
    return;
  }
  next();
}

/** Yönetici (admin veya müdür) yetkisi ister. */
export function requireManager(req: Request, res: Response, next: NextFunction): void {
  if (!isManager(req.user?.role)) {
    res.status(403).json({ error: 'Bu işlem için yönetici (admin/müdür) yetkisi gerekli' });
    return;
  }
  next();
}
