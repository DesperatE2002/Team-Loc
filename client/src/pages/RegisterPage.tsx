import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { AuthShell } from './LoginPage';

export default function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<{
    username: string;
    sicil: string;
    password: string;
  }>({
    username: '',
    sicil: '',
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
        Kullanıcı adı, sicil ve şifre ile ekibe katıl.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label">Kullanıcı Adı</label>
          <input
            className="input"
            value={form.username}
            onChange={(e) => update('username', e.target.value)}
            pattern="[a-zA-Z0-9._-]{2,32}"
            title="Sadece harf, rakam, . _ - kullanın (en az 2 karakter)"
            autoFocus
            required
          />
        </div>
        <div>
          <label className="label">Sicil No</label>
          <input
            className="input"
            value={form.sicil}
            onChange={(e) => update('sicil', e.target.value)}
            placeholder="Örn. 12345"
            required
          />
        </div>
        <div>
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
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <button className="btn-primary w-full" disabled={busy}>
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
