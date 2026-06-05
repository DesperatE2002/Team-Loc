import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { TeamMember } from '../types';
import { roleLabel } from '../types';
import { flagFor } from '../countries';
import TeamMap from '../components/TeamMap';
import QuickLocationButton from '../components/QuickLocationButton';
import { useAuth } from '../auth';

export default function DashboardPage() {
  const { user } = useAuth();
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'domestic' | 'abroad'>('all');
  const [search, setSearch] = useState('');

  async function loadTeam() {
    try {
      const d = await api<{ team: TeamMember[] }>('/api/users/team');
      setTeam(d.team);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
    }
  }

  useEffect(() => {
    let cancelled = false;
    api<{ team: TeamMember[] }>('/api/users/team')
      .then((d) => !cancelled && setTeam(d.team))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Hata'));
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    if (!team) return { total: 0, domestic: 0, abroad: 0 };
    let domestic = 0;
    let abroad = 0;
    for (const m of team) {
      if (!m.current_trip || m.current_trip.is_domestic === 1) domestic++;
      else abroad++;
    }
    return { total: team.length, domestic, abroad };
  }, [team]);

  const filtered = useMemo(() => {
    if (!team) return [];
    return team.filter((m) => {
      const isAbroad = m.current_trip && m.current_trip.is_domestic === 0;
      if (filter === 'domestic' && isAbroad) return false;
      if (filter === 'abroad' && !isAbroad) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !m.full_name.toLowerCase().includes(s) &&
          !(m.current_trip?.country_name.toLowerCase().includes(s) ?? false) &&
          !(m.current_trip?.city?.toLowerCase().includes(s) ?? false)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [team, filter, search]);

  return (
    <div className="space-y-8">
      <section className="flex items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-100 text-lg font-bold text-brand-700 shadow-soft">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
          ) : (
            initials(user?.full_name ?? '')
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Merhaba {user?.full_name.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-slate-500">
            Ekibin şu anki konumlarını aşağıdan takip edebilirsin.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Toplam Ekip" value={stats.total} accent="bg-slate-100 text-slate-700" />
        <StatCard
          label="Yurt İçinde"
          value={stats.domestic}
          accent="bg-emerald-100 text-emerald-700"
          icon="🇹🇷"
        />
        <StatCard
          label="Yurt Dışında"
          value={stats.abroad}
          accent="bg-brand-100 text-brand-700"
          icon="✈️"
        />
      </section>

      {team && team.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Harita
          </h2>
          <TeamMap team={team} />
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Ekip Üyeleri
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="input max-w-xs"
              placeholder="Ara… (isim, ülke, şehir)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {(
                [
                  { v: 'all', l: 'Tümü' },
                  { v: 'domestic', l: 'Yurt İçi' },
                  { v: 'abroad', l: 'Yurt Dışı' },
                ] as const
              ).map((b) => (
                <button
                  key={b.v}
                  onClick={() => setFilter(b.v)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    filter === b.v
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
        {!team && !error && <SkeletonGrid />}

        {team && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => (
              <MemberCard key={m.id} member={m} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-10 text-center text-sm text-slate-500">
                Bu kritere uyan üye bulunamadı.
              </div>
            )}
          </div>
        )}
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-3 bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white">
        <div>
          <h3 className="font-semibold">Konumun güncel mi?</h3>
          <p className="text-sm text-white/80">
            Tek dokunuşla bulunduğun yeri GPS'ten paylaş — uğraşmadan, anında.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <QuickLocationButton variant="light" onUpdated={loadTeam} />
          <Link to="/profil" className="text-sm font-semibold text-white/90 underline-offset-4 hover:underline">
            Detaylı düzenle
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent: string;
  icon?: string;
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`grid h-12 w-12 place-items-center rounded-xl text-xl font-bold ${accent}`}>
        {icon ?? value}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function MemberCard({ member }: { member: TeamMember }) {
  const trip = member.current_trip;
  const isAbroad = trip && trip.is_domestic === 0;
  return (
    <div className="card flex flex-col gap-3 p-5 transition hover:shadow-lg">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 font-bold text-brand-700">
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.full_name}
              className="h-full w-full object-cover"
            />
          ) : (
            initials(member.full_name)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-slate-900">{member.full_name}</div>
          <div className="truncate text-xs text-slate-500">
            {roleLabel(member.role)}
          </div>
        </div>
      </div>

      <div
        className={`rounded-xl border p-3 ${
          isAbroad
            ? 'border-brand-200 bg-brand-50/50'
            : 'border-emerald-200 bg-emerald-50/50'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold">
            <span className="text-2xl">{flagFor(trip?.country_code ?? 'TR')}</span>
            <div>
              <div className="text-sm">{trip?.country_name ?? 'Türkiye'}</div>
              {trip?.city && <div className="text-xs text-slate-500">{trip.city}</div>}
            </div>
          </div>
          <span
            className={`badge ${
              isAbroad ? 'bg-brand-600 text-white' : 'bg-emerald-600 text-white'
            }`}
          >
            {isAbroad ? 'Yurt Dışı' : 'Yurt İçi'}
          </span>
        </div>
        {trip?.status_message && (
          <p className="mt-2 text-sm italic text-slate-600">“{trip.status_message}”</p>
        )}
        {trip && (
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{formatRange(trip.start_date, trip.end_date)}</span>
            {trip.updated_at && <span title={trip.updated_at}>{relativeTime(trip.updated_at)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card h-44 animate-pulse bg-slate-100/60" />
      ))}
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

function formatRange(start: string, end: string | null): string {
  const s = formatTr(start);
  if (!end) return `${s} – devam ediyor`;
  return `${s} → ${formatTr(end)}`;
}
function formatTr(d: string): string {
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'az önce';
  if (min < 60) return `${min} dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} sa önce`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} gün önce`;
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}
