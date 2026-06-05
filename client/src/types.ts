/** Uygulama rolleri (yetki düzeyine göre yüksekten düşüğe). */
export const ROLES = ['admin', 'mudur', 'tekniker', 'uzman'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  mudur: 'Müdür',
  tekniker: 'Tekniker',
  uzman: 'Uzman',
};

export function roleLabel(role: string | null | undefined): string {
  if (!role) return 'Kullanıcı';
  return ROLE_LABELS[role as Role] ?? role;
}

/** Yönetici seviyesi roller (admin / müdür) — kullanıcı yönetimi yetkisi. */
export function isManager(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'mudur';
}

export type User = {
  id: number;
  username: string;
  sicil: string | null;
  email: string | null;
  full_name: string;
  position: string | null;
  avatar_url: string | null;
  role: Role;
  created_at: string;
};

export type AdminUser = User & { trip_count: number };

export type Trip = {
  id: number;
  user_id: number;
  country_code: string;
  country_name: string;
  city: string | null;
  is_domestic: 0 | 1;
  status_message: string | null;
  start_date: string;
  end_date: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  updated_at: string;
  user_full_name?: string;
  user_username?: string;
};

export type TeamMember = User & { current_trip: Trip | null };
