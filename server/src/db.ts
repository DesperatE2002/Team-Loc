import { neon, neonConfig } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

neonConfig.fetchConnectionCache = true;

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const sql = neon(url);

export type UserRow = {
  id: number;
  username: string;
  sicil: string | null;
  email: string | null;
  password_hash: string;
  full_name: string;
  title: string | null;
  position: string | null;
  avatar_url: string | null;
  role: 'admin' | 'member';
  created_at: string;
};

export type TripRow = {
  id: number;
  user_id: number;
  country_code: string;
  country_name: string;
  city: string | null;
  is_domestic: boolean;
  status_message: string | null;
  start_date: string;
  end_date: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  updated_at: string;
};

let initialized = false;

/** Şemayı oluştur (idempotent). Her serverless invocation'ında çağrılabilir. */
export async function ensureSchema(): Promise<void> {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      title TEXT,
      position TEXT,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS trips (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      country_code TEXT NOT NULL,
      country_name TEXT NOT NULL,
      city TEXT,
      is_domestic BOOLEAN NOT NULL DEFAULT FALSE,
      status_message TEXT,
      start_date DATE NOT NULL,
      end_date DATE,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_trips_dates ON trips(start_date, end_date)`;

  // Eski DB için kolon migration'ları (idempotent)
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS position TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS sicil TEXT`;
  // Artık e-posta zorunlu değil
  await sql`ALTER TABLE users ALTER COLUMN email DROP NOT NULL`;
  // Sicil benzersiz olmalı (NULL'lar hariç)
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_sicil ON users(sicil) WHERE sicil IS NOT NULL`;

  // Varsayılan admin hesabını oluştur (yoksa). Şifre env'den okunur, yoksa 'admin123'.
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminSicil = process.env.ADMIN_SICIL || '0000';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  const adminHash = bcrypt.hashSync(adminPass, 10);
  await sql`
    INSERT INTO users (username, sicil, email, password_hash, full_name, role)
    VALUES (${adminUser}, ${adminSicil}, NULL, ${adminHash}, 'Yönetici', 'admin')
    ON CONFLICT (username) DO NOTHING
  `;

  initialized = true;
}
