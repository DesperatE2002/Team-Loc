const TOKEN_KEY = 'ssh_location_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null): void {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(path, { ...options, headers });
  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const obj = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
    const baseMsg = (obj?.error as string | undefined) || `İstek başarısız (${res.status})`;
    const fieldErrors = extractFieldErrors(obj?.details);
    const fullMsg = fieldErrors ? `${baseMsg}: ${fieldErrors}` : baseMsg;
    throw new ApiError(fullMsg, res.status, data);
  }
  return data as T;
}

function extractFieldErrors(details: unknown): string | null {
  if (!details || typeof details !== 'object') return null;
  const fe = (details as { fieldErrors?: Record<string, string[]> }).fieldErrors;
  if (!fe) return null;
  const labels: Record<string, string> = {
    username: 'kullanıcı adı',
    email: 'e-posta',
    password: 'şifre',
    full_name: 'ad soyad',
    title: 'ünvan',
    country_code: 'ülke',
    country_name: 'ülke',
    start_date: 'başlangıç tarihi',
    end_date: 'bitiş tarihi',
  };
  const parts: string[] = [];
  for (const [k, msgs] of Object.entries(fe)) {
    if (!msgs || msgs.length === 0) continue;
    parts.push(`${labels[k] ?? k} (${humanize(k, msgs[0])})`);
  }
  return parts.length ? parts.join(', ') : null;
}

function humanize(field: string, msg: string): string {
  if (msg.includes('Invalid email')) return 'geçerli e-posta giriniz';
  if (msg.includes('String must contain at least')) {
    if (field === 'password') return 'en az 6 karakter';
    if (field === 'username') return 'en az 3 karakter';
    if (field === 'full_name') return 'en az 2 karakter';
    return 'çok kısa';
  }
  if (msg.includes('Invalid')) {
    if (field === 'username') return 'sadece harf, rakam, . _ - kullanın';
    return 'geçersiz';
  }
  return msg;
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
