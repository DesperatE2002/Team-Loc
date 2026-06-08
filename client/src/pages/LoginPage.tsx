import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş yapılamadı');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-slate-900">Tekrar hoş geldiniz</h1>
      <p className="mt-1 text-sm text-slate-500">
        Ekip konumlarını görmek için giriş yapın.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label">Kullanıcı adı veya sicil</label>
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div>
          <label className="label">Şifre</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Hesabınız yok mu?{' '}
        <Link to="/register" className="font-semibold text-brand-600 hover:underline">
          Kayıt olun
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-soft">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
              <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
            </svg>
          </div>
          <div className="text-2xl font-extrabold text-brand-700">SSH Location</div>
        </div>
        <div className="card p-8">{children}</div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Şirket içi ekip konum takip aracı · Yalnızca yetkili kullanıcılar içindir.
        </p>
      </div>
    </div>
  );
}
