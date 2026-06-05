export const POSITIONS = ['Müdür', 'Uzman', 'Mühendis', 'Teknisyen', 'Stajyer'] as const;
export type Position = (typeof POSITIONS)[number];

export type Role = 'admin' | 'member';

export type User = {
  id: number;
  username: string;
  sicil: string | null;
  email: string | null;
  full_name: string;
  position: Position | null;
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
