import { Router } from 'express';
import { z } from 'zod';
import { sql, type TripRow } from '../db.js';
import { requireAuth } from '../auth.js';
import { isManager } from '../roles.js';

const router = Router();
router.use(requireAuth);

const tripSchema = z.object({
  country_code: z.string().min(2).max(3).toUpperCase(),
  country_name: z.string().min(2).max(80),
  city: z.string().max(80).nullable().optional(),
  is_domestic: z.boolean(),
  status_message: z.string().max(280).nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
});

function normalize(t: TripRow): Omit<TripRow, 'is_domestic'> & { is_domestic: 0 | 1 } {
  return { ...t, is_domestic: (t.is_domestic ? 1 : 0) as 0 | 1 };
}

/** Listeleme: kendi tüm trip'lerim, ya da ?user_id=X ile başka biri */
router.get('/', async (req, res) => {
  const userId = req.query.user_id ? Number(req.query.user_id) : req.user!.id;
  if (!Number.isFinite(userId)) {
    res.status(400).json({ error: 'Geçersiz user_id' });
    return;
  }
  const rows = (await sql`
    SELECT * FROM trips WHERE user_id = ${userId}
    ORDER BY start_date DESC, id DESC
  `) as TripRow[];
  res.json({ trips: rows.map(normalize) });
});

/** Tüm ekibin tüm trip'leri (geçmiş sayfası için) */
router.get('/all', async (_req, res) => {
  const rows = (await sql`
    SELECT t.*, u.full_name AS user_full_name, u.username AS user_username
    FROM trips t JOIN users u ON u.id = t.user_id
    ORDER BY t.start_date DESC, t.id DESC
    LIMIT 500
  `) as (TripRow & { user_full_name: string; user_username: string })[];
  res.json({
    trips: rows.map((r) => ({
      ...normalize(r),
      user_full_name: r.user_full_name,
      user_username: r.user_username,
    })),
  });
});

router.post('/', async (req, res) => {
  const parsed = tripSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz veri', details: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;
  if (d.end_date && d.end_date < d.start_date) {
    res.status(400).json({ error: 'Bitiş tarihi başlangıçtan önce olamaz' });
    return;
  }
  const rows = (await sql`
    INSERT INTO trips (user_id, country_code, country_name, city, is_domestic,
                       status_message, start_date, end_date, lat, lng)
    VALUES (${req.user!.id}, ${d.country_code}, ${d.country_name}, ${d.city ?? null},
            ${d.is_domestic}, ${d.status_message ?? null},
            ${d.start_date}::date, ${d.end_date ? d.end_date : null}::date,
            ${d.lat ?? null}, ${d.lng ?? null})
    RETURNING *
  `) as TripRow[];
  res.status(201).json({ trip: normalize(rows[0]) });
});

const quickSchema = z.object({
  country_code: z.string().min(2).max(3).toUpperCase(),
  country_name: z.string().min(1).max(80),
  city: z.string().max(120).nullable().optional(),
  is_domestic: z.boolean(),
  status_message: z.string().max(280).nullable().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * Anlık konum güncelleme (tek dokunuş). Bugün aktif bir kayıt varsa onu günceller,
 * yoksa bugün başlayan açık uçlu yeni bir kayıt oluşturur. Böylece kayıt yığılmaz.
 */
router.post('/quick-location', async (req, res) => {
  const parsed = quickSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz konum verisi', details: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;
  const today = new Date().toISOString().slice(0, 10);

  const active = (await sql`
    SELECT * FROM trips
    WHERE user_id = ${req.user!.id}
      AND start_date <= ${today}::date
      AND (end_date IS NULL OR end_date >= ${today}::date)
    ORDER BY start_date DESC, id DESC
    LIMIT 1
  `) as TripRow[];

  if (active.length > 0) {
    const t = active[0];
    const rows = (await sql`
      UPDATE trips SET
        country_code = ${d.country_code},
        country_name = ${d.country_name},
        city = ${d.city ?? null},
        is_domestic = ${d.is_domestic},
        status_message = ${d.status_message ?? t.status_message},
        lat = ${d.lat},
        lng = ${d.lng},
        updated_at = NOW()
      WHERE id = ${t.id}
      RETURNING *
    `) as TripRow[];
    res.json({ trip: normalize(rows[0]) });
    return;
  }

  const rows = (await sql`
    INSERT INTO trips (user_id, country_code, country_name, city, is_domestic,
                       status_message, start_date, end_date, lat, lng)
    VALUES (${req.user!.id}, ${d.country_code}, ${d.country_name}, ${d.city ?? null},
            ${d.is_domestic}, ${d.status_message ?? null},
            ${today}::date, NULL, ${d.lat}, ${d.lng})
    RETURNING *
  `) as TripRow[];
  res.status(201).json({ trip: normalize(rows[0]) });
});

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const existing = (await sql`SELECT * FROM trips WHERE id = ${id}`) as TripRow[];
  if (existing.length === 0) {
    res.status(404).json({ error: 'Bulunamadı' });
    return;
  }
  const trip = existing[0];
  if (trip.user_id !== req.user!.id && !isManager(req.user!.role)) {
    res.status(403).json({ error: 'Yetkisiz' });
    return;
  }
  const parsed = tripSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz veri' });
    return;
  }
  const d = parsed.data;
  const next = {
    country_code: d.country_code ?? trip.country_code,
    country_name: d.country_name ?? trip.country_name,
    city: d.city !== undefined ? d.city : trip.city,
    is_domestic: d.is_domestic !== undefined ? d.is_domestic : Boolean(trip.is_domestic),
    status_message:
      d.status_message !== undefined ? d.status_message : trip.status_message,
    start_date: d.start_date ?? trip.start_date,
    end_date: d.end_date !== undefined ? d.end_date : trip.end_date,
    lat: d.lat !== undefined ? d.lat : trip.lat,
    lng: d.lng !== undefined ? d.lng : trip.lng,
  };
  const rows = (await sql`
    UPDATE trips SET
      country_code = ${next.country_code},
      country_name = ${next.country_name},
      city = ${next.city},
      is_domestic = ${next.is_domestic},
      status_message = ${next.status_message},
      start_date = ${next.start_date}::date,
      end_date = ${next.end_date ? next.end_date : null}::date,
      lat = ${next.lat},
      lng = ${next.lng},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `) as TripRow[];
  res.json({ trip: normalize(rows[0]) });
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const existing = (await sql`SELECT * FROM trips WHERE id = ${id}`) as TripRow[];
  if (existing.length === 0) {
    res.status(404).json({ error: 'Bulunamadı' });
    return;
  }
  const trip = existing[0];
  if (trip.user_id !== req.user!.id && !isManager(req.user!.role)) {
    res.status(403).json({ error: 'Yetkisiz' });
    return;
  }
  await sql`DELETE FROM trips WHERE id = ${id}`;
  res.json({ ok: true });
});

export default router;
