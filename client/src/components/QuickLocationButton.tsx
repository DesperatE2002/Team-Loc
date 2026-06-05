import { useState } from 'react';
import { api } from '../api';
import { findCountry } from '../countries';

type Status =
  | { kind: 'idle' }
  | { kind: 'locating' }
  | { kind: 'saving' }
  | { kind: 'success'; text: string }
  | { kind: 'error'; text: string };

type Resolved = {
  country_code: string;
  country_name: string;
  city: string | null;
  is_domestic: boolean;
  lat: number;
  lng: number;
};

/**
 * Tarayıcının GPS'ini kullanarak tek dokunuşla anlık konumu günceller.
 * Telefondan kullanım için tasarlanmıştır: butona bas → konum izni → kaydet.
 */
export default function QuickLocationButton({
  onUpdated,
  className,
  label = 'Konumumu Şimdi Paylaş',
  variant = 'primary',
}: {
  onUpdated?: () => void | Promise<void>;
  className?: string;
  label?: string;
  variant?: 'primary' | 'light';
}) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const busy = status.kind === 'locating' || status.kind === 'saving';

  async function run() {
    if (!('geolocation' in navigator)) {
      setStatus({ kind: 'error', text: 'Cihazın konum servisini desteklemiyor.' });
      return;
    }
    setStatus({ kind: 'locating' });
    try {
      const pos = await getPosition();
      setStatus({ kind: 'saving' });
      const resolved = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      await api('/api/trips/quick-location', {
        method: 'POST',
        body: JSON.stringify(resolved),
      });
      const place = resolved.city ? `${resolved.country_name} · ${resolved.city}` : resolved.country_name;
      setStatus({ kind: 'success', text: `Konumun güncellendi: ${place}` });
      await onUpdated?.();
      window.setTimeout(() => setStatus({ kind: 'idle' }), 4000);
    } catch (err) {
      setStatus({ kind: 'error', text: messageFor(err) });
    }
  }

  const base =
    variant === 'light'
      ? 'inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-soft transition hover:bg-brand-50 disabled:opacity-60'
      : 'btn-primary inline-flex items-center justify-center gap-2';

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button type="button" onClick={run} disabled={busy} className={`${base} ${className ?? ''}`}>
        <PinIcon spinning={busy} />
        {status.kind === 'locating'
          ? 'Konum alınıyor…'
          : status.kind === 'saving'
            ? 'Kaydediliyor…'
            : label}
      </button>
      {status.kind === 'success' && (
        <span className="text-xs font-medium text-emerald-600">✓ {status.text}</span>
      )}
      {status.kind === 'error' && (
        <span className="text-xs font-medium text-red-600">{status.text}</span>
      )}
    </div>
  );
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    });
  });
}

async function reverseGeocode(lat: number, lng: number): Promise<Resolved> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&addressdetails=1&accept-language=tr&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('geocode');
    const data = (await res.json()) as {
      address?: Record<string, string>;
    };
    const a = data.address ?? {};
    const code = (a.country_code ?? '').toUpperCase();
    const known = code ? findCountry(code) : undefined;
    const city =
      a.city || a.town || a.village || a.municipality || a.county || a.state || null;
    return {
      country_code: code || 'XX',
      country_name: known?.name || a.country || 'Bilinmeyen konum',
      city,
      is_domestic: code === 'TR',
      lat,
      lng,
    };
  } catch {
    // Ters geocoding başarısızsa yine de koordinatı kaydet (harita iğnesi yine de düşsün).
    return {
      country_code: 'XX',
      country_name: 'Konum',
      city: null,
      is_domestic: false,
      lat,
      lng,
    };
  }
}

function messageFor(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as GeolocationPositionError).code;
    if (code === 1) return 'Konum izni reddedildi. Tarayıcı ayarlarından izin verebilirsin.';
    if (code === 2) return 'Konum alınamadı. Sinyal/servis kapalı olabilir.';
    if (code === 3) return 'Konum zaman aşımına uğradı, tekrar dene.';
  }
  return err instanceof Error ? err.message : 'Konum güncellenemedi.';
}

function PinIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${spinning ? 'animate-pulse' : ''}`}
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}
