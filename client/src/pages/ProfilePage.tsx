import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import type { Trip, User } from '../types';
import { roleLabel } from '../types';
import { COUNTRIES, findCountry, flagFor } from '../countries';
import QuickLocationButton from '../components/QuickLocationButton';

const TODAY = () => new Date().toISOString().slice(0, 10);

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Trip | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<{
    full_name: string;
    email: string;
  }>({
    full_name: user?.full_name ?? '',
    email: user?.email ?? '',
  });

  const [pwForm, setPwForm] = useState({ current: '', next: '' });
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  async function uploadAvatar(file: File) {
    setAvatarMsg(null);
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      setAvatarMsg('Sadece PNG, JPG veya WEBP yükleyebilirsin.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setAvatarMsg('Dosya 8 MB\u2019dan büyük olamaz.');
      return;
    }
    setAvatarBusy(true);
    try {
      const dataUrl = await resizeImage(file, 256, 0.85);
      await api<{ user: User }>('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ avatar_url: dataUrl }),
      });
      await refresh();
      setAvatarMsg('Profil fotoğrafı güncellendi.');
    } catch (err) {
      setAvatarMsg(err instanceof Error ? err.message : 'Yüklenemedi');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarMsg(null);
    setAvatarBusy(true);
    try {
      await api<{ user: User }>('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ avatar_url: null }),
      });
      await refresh();
      setAvatarMsg('Profil fotoğrafı kaldırıldı.');
    } catch (err) {
      setAvatarMsg(err instanceof Error ? err.message : 'Kaldırılamadı');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function reload() {
    try {
      const d = await api<{ trips: Trip[] }>('/api/trips');
      setTrips(d.trips);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const current = useMemo(() => {
    if (!trips) return null;
    const today = TODAY();
    return (
      trips.find(
        (t) => t.start_date <= today && (!t.end_date || t.end_date >= today),
      ) ?? null
    );
  }, [trips]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    try {
      await api<{ user: User }>('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: profileForm.full_name,
          email: profileForm.email.trim() || null,
        }),
      });
      await refresh();
      setProfileMsg('Profil güncellendi.');
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'Güncellenemedi');
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    try {
      await api('/api/users/me/password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: pwForm.current,
          new_password: pwForm.next,
        }),
      });
      setPwMsg('Şifre güncellendi.');
      setPwForm({ current: '', next: '' });
    } catch (err) {
      setPwMsg(err instanceof Error ? err.message : 'Güncellenemedi');
    }
  }

  async function deleteTrip(id: number) {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    await api(`/api/trips/${id}`, { method: 'DELETE' });
    await reload();
  }

  return (
    <div className="space-y-8">
      <section className="card p-6">
        <h1 className="text-xl font-bold text-slate-900">Profilim</h1>

        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 text-2xl font-bold text-brand-700 ring-2 ring-white shadow">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{initialsOf(user?.full_name ?? '')}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900">Profil Fotoğrafı</div>
            <p className="text-xs text-slate-500">
              PNG, JPG veya WEBP. Otomatik olarak 256×256 boyutuna küçültülür.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className={`btn-primary cursor-pointer ${avatarBusy ? 'opacity-60 pointer-events-none' : ''}`}>
                {user?.avatar_url ? 'Değiştir' : 'Fotoğraf Yükle'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadAvatar(f);
                    e.target.value = '';
                  }}
                />
              </label>
              {user?.avatar_url && (
                <button
                  type="button"
                  className="btn-outline"
                  disabled={avatarBusy}
                  onClick={removeAvatar}
                >
                  Kaldır
                </button>
              )}
              {avatarMsg && (
                <span className="text-xs text-slate-500">{avatarMsg}</span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={saveProfile} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Ad Soyad</label>
            <input
              className="input"
              value={profileForm.full_name}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, full_name: e.target.value }))
              }
              required
            />
          </div>
          <div>
            <label className="label">Rol</label>
            <input className="input bg-slate-50 text-slate-500" value={roleLabel(user?.role)} disabled readOnly />
          </div>
          <div>
            <label className="label">E-posta (opsiyonel)</label>
            <input
              type="email"
              className="input"
              value={profileForm.email}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, email: e.target.value }))
              }
            />
          </div>
          <div className="flex items-end gap-2">
            <button className="btn-primary">Kaydet</button>
            {profileMsg && (
              <span className="text-xs text-slate-500">{profileMsg}</span>
            )}
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Şifre Değiştir
        </h2>
        <form onSubmit={changePassword} className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            type="password"
            className="input"
            placeholder="Mevcut şifre"
            value={pwForm.current}
            onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
            required
          />
          <input
            type="password"
            className="input"
            placeholder="Yeni şifre (≥3 karakter)"
            minLength={3}
            value={pwForm.next}
            onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
            required
          />
          <div className="flex items-center gap-2">
            <button className="btn-outline">Güncelle</button>
            {pwMsg && <span className="text-xs text-slate-500">{pwMsg}</span>}
          </div>
        </form>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Konum / Seyahat Kayıtlarım
          </h2>
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            + Yeni Konum
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
          <div>
            <div className="text-sm font-semibold text-brand-800">Hızlı konum güncelleme</div>
            <p className="text-xs text-brand-700/80">
              Tek dokunuşla bulunduğun yeri GPS'ten paylaş — uğraşmadan.
            </p>
          </div>
          <QuickLocationButton onUpdated={reload} />
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {current && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Şu anki durumun
            </div>
            <div className="mt-1 flex items-center gap-2 text-base font-semibold text-emerald-900">
              <span className="text-xl">{flagFor(current.country_code)}</span>
              {current.country_name}
              {current.city && (
                <span className="text-sm font-normal text-emerald-800/80">
                  · {current.city}
                </span>
              )}
            </div>
            {current.status_message && (
              <p className="mt-1 text-sm italic text-emerald-900/80">
                “{current.status_message}”
              </p>
            )}
          </div>
        )}

        {showForm && (
          <TripForm
            initial={editing}
            onCancel={() => setShowForm(false)}
            onSaved={async () => {
              setShowForm(false);
              setEditing(null);
              await reload();
            }}
          />
        )}

        {trips && (
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {trips.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500">
                Henüz kayıt yok. “Yeni Konum” butonu ile ekleyebilirsin.
              </div>
            )}
            {trips.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center gap-3 p-4 hover:bg-slate-50"
              >
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-xl">
                  {flagFor(t.country_code)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">
                    {t.country_name}
                    {t.city && (
                      <span className="font-normal text-slate-500"> · {t.city}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatRange(t.start_date, t.end_date)}
                  </div>
                  {t.status_message && (
                    <div className="mt-1 text-xs italic text-slate-600">
                      “{t.status_message}”
                    </div>
                  )}
                </div>
                <span
                  className={`badge ${
                    t.is_domestic
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-brand-100 text-brand-700'
                  }`}
                >
                  {t.is_domestic ? 'Yurt İçi' : 'Yurt Dışı'}
                </span>
                <div className="flex gap-2">
                  <button
                    className="btn-outline text-xs py-1.5"
                    onClick={() => {
                      setEditing(t);
                      setShowForm(true);
                    }}
                  >
                    Düzenle
                  </button>
                  <button
                    className="btn-danger text-xs py-1.5"
                    onClick={() => deleteTrip(t.id)}
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TripForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: Trip | null;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [countryCode, setCountryCode] = useState(initial?.country_code ?? 'TR');
  const [city, setCity] = useState(initial?.city ?? '');
  const [statusMessage, setStatusMessage] = useState(initial?.status_message ?? '');
  const [startDate, setStartDate] = useState(initial?.start_date ?? TODAY());
  const [endDate, setEndDate] = useState(initial?.end_date ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const country = findCountry(countryCode);
  const isDomestic = country?.domestic ?? false;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!country) {
      setErr('Geçerli bir ülke seçin');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const payload = {
        country_code: country.code,
        country_name: country.name,
        city: city || null,
        is_domestic: isDomestic,
        status_message: statusMessage || null,
        start_date: startDate,
        end_date: endDate || null,
        lat: country.lat,
        lng: country.lng,
      };
      if (initial) {
        await api(`/api/trips/${initial.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await api('/api/trips', { method: 'POST', body: JSON.stringify(payload) });
      }
      await onSaved();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Kaydedilemedi');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="card mb-4 grid gap-4 p-5 sm:grid-cols-2">
      <div className="sm:col-span-2 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">
          {initial ? 'Konumu Düzenle' : 'Yeni Konum Kaydı'}
        </h3>
        <span
          className={`badge ${
            isDomestic
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-brand-100 text-brand-700'
          }`}
        >
          {isDomestic ? 'Yurt İçi' : 'Yurt Dışı'}
        </span>
      </div>

      <div>
        <label className="label">Ülke</label>
        <select
          className="input"
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Şehir (opsiyonel)</label>
        <input
          className="input"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="örn. Münih"
        />
      </div>

      <div>
        <label className="label">Başlangıç</label>
        <input
          type="date"
          className="input"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label">Bitiş (boş = açık uçlu)</label>
        <input
          type="date"
          className="input"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          min={startDate}
        />
      </div>

      <div className="sm:col-span-2">
        <label className="label">Durum mesajı (opsiyonel)</label>
        <input
          className="input"
          maxLength={280}
          value={statusMessage}
          onChange={(e) => setStatusMessage(e.target.value)}
          placeholder="örn. Müşteri ziyareti / saha çalışması"
        />
      </div>

      {err && (
        <div className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="sm:col-span-2 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Vazgeç
        </button>
        <button className="btn-primary" disabled={busy}>
          {busy ? 'Kaydediliyor…' : initial ? 'Güncelle' : 'Kaydet'}
        </button>
      </div>
    </form>
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

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

async function resizeImage(file: File, maxSize: number, quality: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas oluşturulamadı');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
}
