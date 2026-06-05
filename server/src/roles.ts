/** Uygulama rolleri. Sıralama yetki düzeyine göre (yüksekten düşüğe). */
export const ROLES = ['admin', 'mudur', 'tekniker', 'uzman'] as const;
export type Role = (typeof ROLES)[number];

/** Yönetici seviyesi roller — kullanıcı yönetimi yetkisine sahiptir. */
export const MANAGER_ROLES: readonly Role[] = ['admin', 'mudur'];

export function isManager(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'mudur';
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  mudur: 'Müdür',
  tekniker: 'Tekniker',
  uzman: 'Uzman',
};
