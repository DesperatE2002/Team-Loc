import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { Trip } from '../types';
import { flagFor } from '../countries';

export default function HistoryPage() {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'all' | 'mine'>('all');

  useEffect(() => {
    let cancelled = false;
    const url = scope === 'all' ? '/api/trips/all' : '/api/trips';
    api<{ trips: Trip[] }>(url)
      .then((d) => !cancelled && setTrips(d.trips))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Hata'));
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const filtered = useMemo(() => {
    if (!trips) return [];
    if (!search) return trips;
    const s = search.toLowerCase();
    return trips.filter(
      (t) =>
        t.country_name.toLowerCase().includes(s) ||
        (t.city?.toLowerCase().includes(s) ?? false) ||
        (t.user_full_name?.toLowerCase().includes(s) ?? false) ||
        (t.status_message?.toLowerCase().includes(s) ?? false),
    );
  }, [trips, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Geçmiş</h1>
          <p className="text-sm text-slate-500">
            Tüm konum/seyahat kayıtlarını görüntüle.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input max-w-xs"
            placeholder="Ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {(
              [
                { v: 'all', l: 'Tüm Ekip' },
                { v: 'mine', l: 'Sadece Ben' },
              ] as const
            ).map((b) => (
              <button
                key={b.v}
                onClick={() => setScope(b.v)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                  scope === b.v
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {b.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {!trips && !error && (
        <div className="card h-40 animate-pulse bg-slate-100/60" />
      )}

      {trips && (
        <div className="card overflow-hidden">
          <div className="hidden sm:grid grid-cols-12 gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {scope === 'all' && <div className="col-span-3">Üye</div>}
            <div className={scope === 'all' ? 'col-span-3' : 'col-span-4'}>Konum</div>
            <div className="col-span-3">Tarih</div>
            <div className="col-span-3">Durum</div>
          </div>
          <ul className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <li className="p-6 text-center text-sm text-slate-500">Kayıt bulunamadı.</li>
            )}
            {filtered.map((t) => (
              <li
                key={t.id}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 px-4 py-3 hover:bg-slate-50"
              >
                {scope === 'all' && (
                  <div className="col-span-3 font-semibold text-slate-900">
                    {t.user_full_name}
                    <div className="text-xs font-normal text-slate-500">
                      @{t.user_username}
                    </div>
                  </div>
                )}
                <div
                  className={
                    scope === 'all' ? 'sm:col-span-3' : 'sm:col-span-4'
                  }
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{flagFor(t.country_code)}</span>
                    <div>
                      <div className="font-medium">{t.country_name}</div>
                      {t.city && (
                        <div className="text-xs text-slate-500">{t.city}</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-3 text-sm text-slate-600">
                  {formatRange(t.start_date, t.end_date)}
                </div>
                <div className="sm:col-span-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`badge ${
                      t.is_domestic
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-brand-100 text-brand-700'
                    }`}
                  >
                    {t.is_domestic ? 'Yurt İçi' : 'Yurt Dışı'}
                  </span>
                  {t.status_message && (
                    <span className="text-xs italic text-slate-600">
                      “{t.status_message}”
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatRange(start: string, end: string | null): string {
  const s = formatTr(start);
  if (!end) return `${s} – devam ediyor`;
  return `${s} → ${formatTr(end)}`;
}
function formatTr(d: string): string {
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}
