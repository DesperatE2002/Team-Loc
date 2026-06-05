import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import type { TeamMember } from '../types';
import { findCountry, flagFor } from '../countries';

type Props = {
  team: TeamMember[];
};

type Point = {
  key: string;
  lat: number;
  lng: number;
  members: TeamMember[];
  countryCode: string;
  countryName: string;
  isDomestic: boolean;
};

const PALETTE = [
  '#2f63f5', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6',
  '#0ea5e9', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c),
  );
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;');
}

function avatarMarkup(member: TeamMember, size = 40, position = ''): string {
  const bg = colorFor(member.full_name);
  const inner = member.avatar_url
    ? `<img src="${escapeAttr(member.avatar_url)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />`
    : escapeHtml(initials(member.full_name));
  return `
    <div style="
      ${position}
      width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;
      background:${bg};color:#fff;font-weight:700;font-size:${Math.round(size * 0.38)}px;
      display:flex;align-items:center;justify-content:center;
      border:3px solid #fff;box-shadow:0 4px 10px rgba(15,23,42,.25);
      font-family:Inter,system-ui,sans-serif;
    ">${inner}</div>
  `;
}

function makeIcon(point: Point): L.DivIcon {
  const main = point.members[0];
  const extra = point.members.length - 1;
  const initialsText = escapeHtml(initials(main.full_name));
  const labelBg = colorFor(main.full_name);
  const html = `
    <div style="position:relative;display:flex;align-items:center;gap:6px;width:max-content;">
      <div style="position:relative;width:48px;height:48px;flex-shrink:0;">
        ${avatarMarkup(main, 40, 'position:absolute;top:4px;left:4px;')}
        ${
          extra > 0
            ? `<div style="
                position:absolute;top:-4px;right:-4px;
                min-width:22px;height:22px;padding:0 6px;border-radius:11px;
                background:#0f172a;color:#fff;font-size:11px;font-weight:700;
                display:flex;align-items:center;justify-content:center;
                border:2px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.3);
                font-family:Inter,system-ui,sans-serif;
              ">+${extra}</div>`
            : ''
        }
      </div>
      <div style="
        background:${labelBg};color:#fff;font-weight:700;font-size:13px;
        padding:4px 10px;border-radius:9999px;letter-spacing:0.5px;
        border:2px solid #fff;box-shadow:0 3px 8px rgba(15,23,42,.25);
        font-family:Inter,system-ui,sans-serif;line-height:1;white-space:nowrap;
      ">${initialsText}</div>
    </div>
  `;
  return L.divIcon({
    className: 'team-avatar-marker',
    html,
    iconSize: [110, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -20],
  });
}

export default function TeamMap({ team }: Props) {
  const points = useMemo<Point[]>(() => {
    const groups = new Map<string, Point>();
    for (const m of team) {
      const trip = m.current_trip;
      let lat: number | null = null;
      let lng: number | null = null;
      let code = 'TR';
      let name = 'Türkiye';
      let isDomestic = true;
      if (trip) {
        code = trip.country_code;
        name = trip.country_name;
        isDomestic = trip.is_domestic === 1;
        if (trip.lat != null && trip.lng != null) {
          lat = trip.lat;
          lng = trip.lng;
        } else {
          const c = findCountry(trip.country_code);
          if (c) {
            lat = c.lat;
            lng = c.lng;
          }
        }
      } else {
        const c = findCountry('TR')!;
        lat = c.lat;
        lng = c.lng;
      }
      if (lat == null || lng == null) continue;
      const key = `${code}|${lat.toFixed(2)}|${lng.toFixed(2)}`;
      const existing = groups.get(key);
      if (existing) {
        existing.members.push(m);
      } else {
        groups.set(key, {
          key,
          lat,
          lng,
          members: [m],
          countryCode: code,
          countryName: name,
          isDomestic,
        });
      }
    }
    return [...groups.values()];
  }, [team]);

  return (
    <div className="h-[500px] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-soft">
      <MapContainer center={[35, 25]} zoom={3} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((p) => (
          <CircleMarker
            key={p.key + '-halo'}
            center={[p.lat, p.lng]}
            radius={28}
            pathOptions={{
              color: p.isDomestic ? '#16a34a' : '#2f63f5',
              fillColor: p.isDomestic ? '#16a34a' : '#2f63f5',
              fillOpacity: 0.12,
              weight: 1.5,
            }}
          />
        ))}
        {points.map((p) => (
          <Marker key={p.key} position={[p.lat, p.lng]} icon={makeIcon(p)}>
            <Popup>
              <div className="space-y-2 min-w-[200px]">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="text-lg">{flagFor(p.countryCode)}</span>
                  <span>{p.countryName}</span>
                </div>
                <ul className="space-y-2">
                  {p.members.map((m) => (
                    <li key={m.id} className="flex items-start gap-2">
                      <div
                        className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full text-white text-xs font-bold"
                        style={{ background: colorFor(m.full_name) }}
                      >
                        {m.avatar_url ? (
                          <img
                            src={m.avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initials(m.full_name)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm leading-tight">
                          {m.full_name}
                        </div>
                        {m.position && (
                          <div className="text-[11px] text-slate-500">{m.position}</div>
                        )}
                        {m.current_trip?.city && (
                          <div className="text-[11px] text-slate-500">
                            {m.current_trip.city}
                          </div>
                        )}
                        {m.current_trip?.status_message && (
                          <div className="text-[11px] italic text-slate-600 mt-0.5">
                            “{m.current_trip.status_message}”
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
