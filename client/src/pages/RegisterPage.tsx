import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { AuthShell } from './LoginPage';
import { POSITIONS, type Position } from '../types';

export default function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<{
    full_name: string;
    position: Position;
    username: string;
    email: string;
    password: string;
  }>({
    full_name: '',
    position: 'Uzman',
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız');
    } finally {
      setBusy(false);
    }
  }

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-slate-900">Hesap oluştur</h1>
      <p className="mt-1 text-sm text-slate-500">
        Bilgilerini doldurarak ekibe katıl.
      </p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Ad Soyad</label>
          <input
            className="input"
            value={form.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Pozisyon</label>
          <select
            className="input"
            value={form.position}
            onChange={(e) => update('position', e.target.value as Position)}
          >
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Kullanıcı Adı</label>
          <input
            className="input"
            value={form.username}
            onChange={(e) => update('username', e.target.value)}
            pattern="[a-zA-Z0-9._-]{2,32}"
            title="Sadece harf, rakam, . _ - kullanın (en az 2 karakter)"
            required
          />
        </div>
        <div>
          <label className="label">E-posta</label>
          <input
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Şifre (en az 3 karakter)</label>
          <input
            type="password"
            className="input"
            minLength={3}
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            required
          />
        </div>
        {error && (
          <div className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <button className="btn-primary sm:col-span-2 w-full" disabled={busy}>
          {busy ? 'Kayıt yapılıyor…' : 'Kayıt Ol'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Zaten bir hesabınız var mı?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          Giriş yapın
        </Link>
      </p>
    </AuthShell>
  );
}
