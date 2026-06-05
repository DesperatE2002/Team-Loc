import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { POSITIONS, type AdminUser, type Position, type Role } from '../types';

export default function AdminPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function reload() {
    try {
      const d = await api<{ users: AdminUser[] }>('/api/admin/users');
      setUsers(d.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const filtered = useMemo(() => {
    if (!users) return [];
    const s = search.trim().toLowerCase();
    if (!s) return users;
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(s) ||
        u.username.toLowerCase().includes(s) ||
        (u.sicil ?? '').toLowerCase().includes(s),
    );
  }, [users, search]);

  async function changeRole(u: AdminUser, role: Role) {
    setBusyId(u.id);
    setError(null);
    try {
      await api(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Güncellenemedi');
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(u: AdminUser) {
    const pw = prompt(`${u.full_name} için yeni şifre (en az 3 karakter):`);
    if (!pw) return;
    if (pw.length < 3) {
      setError('Şifre en az 3 karakter olmalı');
      return;
    }
    setBusyId(u.id);
    setError(null);
    try {
      await api(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ new_password: pw }),
      });
      alert('Şifre güncellendi.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Güncellenemedi');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(u: AdminUser) {
    if (!confirm(`${u.full_name} (${u.username}) kalıcı olarak silinsin mi?`)) return;
    setBusyId(u.id);
    setError(null);
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Silinemedi');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Kullanıcı Yönetimi</h1>
          <p className="text-sm text-slate-500">
            Ekip üyelerini ekle, rollerini değiştir, şifre sıfırla veya kaldır.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Vazgeç' : '+ Yeni Kullanıcı'}
        </button>
      </section>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {showCreate && (
        <CreateUserForm
          onCreated={async () => {
            setShowCreate(false);
            await reload();
          }}
        />
      )}

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <input
            className="input max-w-xs"
            placeholder="Ara… (isim, kullanıcı adı, sicil)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {!users && !error && (
          <div className="p-8 text-center text-sm text-slate-500">Yükleniyor…</div>
        )}

        {users && (
          <div className="divide-y divide-slate-100">
            {filtered.map((u) => {
              const isSelf = me?.id === u.id;
              return (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center gap-3 p-4 hover:bg-slate-50"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 font-bold text-brand-700">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.full_name} className="h-full w-full object-cover" />
                    ) : (
                      initials(u.full_name)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-slate-900">{u.full_name}</span>
                      {u.role === 'admin' && (
                        <span className="badge bg-amber-100 text-amber-700">Admin</span>
                      )}
                      {isSelf && (
                        <span className="badge bg-slate-100 text-slate-500">Sen</span>
                      )}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      @{u.username} · Sicil: {u.sicil ?? '—'}
                      {u.position ? ` · ${u.position}` : ''} · {u.trip_count} kayıt
                    </div>
                  </div>

                  <select
                    className="input w-auto py-1.5 text-xs"
                    value={u.role}
                    disabled={busyId === u.id}
                    onChange={(e) => changeRole(u, e.target.value as Role)}
                  >
                    <option value="member">Üye</option>
                    <option value="admin">Admin</option>
                  </select>

                  <button
                    className="btn-outline text-xs py-1.5"
                    disabled={busyId === u.id}
                    onClick={() => resetPassword(u)}
                  >
                    Şifre Sıfırla
                  </button>
                  <button
                    className="btn-danger text-xs py-1.5"
                    disabled={busyId === u.id || isSelf}
                    title={isSelf ? 'Kendi hesabını buradan silemezsin' : undefined}
                    onClick={() => deleteUser(u)}
                  >
                    Sil
                  </button>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                Kullanıcı bulunamadı.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState<{
    username: string;
    sicil: string;
    password: string;
    full_name: string;
    position: Position;
    role: Role;
  }>({
    username: '',
    sicil: '',
    password: '',
    full_name: '',
    position: 'Uzman',
    role: 'member',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          username: form.username,
          sicil: form.sicil,
          password: form.password,
          full_name: form.full_name.trim() || undefined,
          position: form.position,
          role: form.role,
        }),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Oluşturulamadı');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card grid gap-4 p-5 sm:grid-cols-2">
      <div>
        <label className="label">Kullanıcı Adı</label>
        <input
          className="input"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          pattern="[a-zA-Z0-9._-]{2,32}"
          required
        />
      </div>
      <div>
        <label className="label">Sicil No</label>
        <input
          className="input"
          value={form.sicil}
          onChange={(e) => setForm((f) => ({ ...f, sicil: e.target.value }))}
          required
        />
      </div>
      <div>
        <label className="label">Ad Soyad (opsiyonel)</label>
        <input
          className="input"
          value={form.full_name}
          onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          placeholder="Boşsa kullanıcı adı kullanılır"
        />
      </div>
      <div>
        <label className="label">Pozisyon</label>
        <select
          className="input"
          value={form.position}
          onChange={(e) => setForm((f) => ({ ...f, position: e.target.value as Position }))}
        >
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Şifre (en az 3 karakter)</label>
        <input
          type="password"
          className="input"
          minLength={3}
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          required
        />
      </div>
      <div>
        <label className="label">Rol</label>
        <select
          className="input"
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
        >
          <option value="member">Üye</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {error && (
        <div className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="sm:col-span-2">
        <button className="btn-primary" disabled={busy}>
          {busy ? 'Oluşturuluyor…' : 'Kullanıcı Oluştur'}
        </button>
      </div>
    </form>
  );
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
