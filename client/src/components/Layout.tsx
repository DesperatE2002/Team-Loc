import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

const links = [
  { to: '/', label: 'Panel', end: true },
  { to: '/profil', label: 'Profilim' },
  { to: '/gecmis', label: 'Geçmiş' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
          <div className="flex items-center gap-2 font-bold text-brand-700">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-soft">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-base">SSH Location</div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Ekip Konum Takibi
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:block text-right leading-tight">
              <div className="text-sm font-semibold">{user?.full_name}</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">
                {user?.position ?? 'Kullanıcı'}
              </div>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-brand-700 font-bold">
              {initials(user?.full_name ?? '')}
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="btn-outline"
            >
              Çıkış
            </button>
          </div>
        </div>

        <nav className="md:hidden flex border-t border-slate-200 bg-white">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex-1 py-2 text-center text-sm font-semibold ${
                  isActive ? 'text-brand-700 bg-brand-50' : 'text-slate-600'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} SSH Ekibi · Konum Takip Platformu
        </div>
      </footer>
    </div>
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
