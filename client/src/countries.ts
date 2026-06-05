/**
 * Yaygın ülkeler için isim, kod, koordinat ve bayrak emojisi.
 * Kullanıcılar formdan bunlardan birini seçer; özel ülke için "Diğer" opsiyonu da var.
 */
export type Country = {
  code: string;
  name: string;
  emoji: string;
  lat: number;
  lng: number;
  domestic?: boolean;
};

export const COUNTRIES: Country[] = [
  { code: 'TR', name: 'Türkiye', emoji: '🇹🇷', lat: 39.9334, lng: 32.8597, domestic: true },
  { code: 'DE', name: 'Almanya', emoji: '🇩🇪', lat: 51.1657, lng: 10.4515 },
  { code: 'FR', name: 'Fransa', emoji: '🇫🇷', lat: 46.2276, lng: 2.2137 },
  { code: 'IT', name: 'İtalya', emoji: '🇮🇹', lat: 41.8719, lng: 12.5674 },
  { code: 'ES', name: 'İspanya', emoji: '🇪🇸', lat: 40.4637, lng: -3.7492 },
  { code: 'NL', name: 'Hollanda', emoji: '🇳🇱', lat: 52.1326, lng: 5.2913 },
  { code: 'BE', name: 'Belçika', emoji: '🇧🇪', lat: 50.5039, lng: 4.4699 },
  { code: 'GB', name: 'Birleşik Krallık', emoji: '🇬🇧', lat: 55.3781, lng: -3.4360 },
  { code: 'CH', name: 'İsviçre', emoji: '🇨🇭', lat: 46.8182, lng: 8.2275 },
  { code: 'AT', name: 'Avusturya', emoji: '🇦🇹', lat: 47.5162, lng: 14.5501 },
  { code: 'PL', name: 'Polonya', emoji: '🇵🇱', lat: 51.9194, lng: 19.1451 },
  { code: 'CZ', name: 'Çekya', emoji: '🇨🇿', lat: 49.8175, lng: 15.4730 },
  { code: 'SE', name: 'İsveç', emoji: '🇸🇪', lat: 60.1282, lng: 18.6435 },
  { code: 'NO', name: 'Norveç', emoji: '🇳🇴', lat: 60.4720, lng: 8.4689 },
  { code: 'FI', name: 'Finlandiya', emoji: '🇫🇮', lat: 61.9241, lng: 25.7482 },
  { code: 'DK', name: 'Danimarka', emoji: '🇩🇰', lat: 56.2639, lng: 9.5018 },
  { code: 'GR', name: 'Yunanistan', emoji: '🇬🇷', lat: 39.0742, lng: 21.8243 },
  { code: 'BG', name: 'Bulgaristan', emoji: '🇧🇬', lat: 42.7339, lng: 25.4858 },
  { code: 'RO', name: 'Romanya', emoji: '🇷🇴', lat: 45.9432, lng: 24.9668 },
  { code: 'HU', name: 'Macaristan', emoji: '🇭🇺', lat: 47.1625, lng: 19.5033 },
  { code: 'RU', name: 'Rusya', emoji: '🇷🇺', lat: 61.5240, lng: 105.3188 },
  { code: 'UA', name: 'Ukrayna', emoji: '🇺🇦', lat: 48.3794, lng: 31.1656 },
  { code: 'AZ', name: 'Azerbaycan', emoji: '🇦🇿', lat: 40.1431, lng: 47.5769 },
  { code: 'GE', name: 'Gürcistan', emoji: '🇬🇪', lat: 42.3154, lng: 43.3569 },
  { code: 'IR', name: 'İran', emoji: '🇮🇷', lat: 32.4279, lng: 53.6880 },
  { code: 'IQ', name: 'Irak', emoji: '🇮🇶', lat: 33.2232, lng: 43.6793 },
  { code: 'SY', name: 'Suriye', emoji: '🇸🇾', lat: 34.8021, lng: 38.9968 },
  { code: 'SA', name: 'Suudi Arabistan', emoji: '🇸🇦', lat: 23.8859, lng: 45.0792 },
  { code: 'AE', name: 'BAE', emoji: '🇦🇪', lat: 23.4241, lng: 53.8478 },
  { code: 'QA', name: 'Katar', emoji: '🇶🇦', lat: 25.3548, lng: 51.1839 },
  { code: 'IL', name: 'İsrail', emoji: '🇮🇱', lat: 31.0461, lng: 34.8516 },
  { code: 'EG', name: 'Mısır', emoji: '🇪🇬', lat: 26.8206, lng: 30.8025 },
  { code: 'MA', name: 'Fas', emoji: '🇲🇦', lat: 31.7917, lng: -7.0926 },
  { code: 'ZA', name: 'Güney Afrika', emoji: '🇿🇦', lat: -30.5595, lng: 22.9375 },
  { code: 'US', name: 'ABD', emoji: '🇺🇸', lat: 37.0902, lng: -95.7129 },
  { code: 'CA', name: 'Kanada', emoji: '🇨🇦', lat: 56.1304, lng: -106.3468 },
  { code: 'MX', name: 'Meksika', emoji: '🇲🇽', lat: 23.6345, lng: -102.5528 },
  { code: 'BR', name: 'Brezilya', emoji: '🇧🇷', lat: -14.2350, lng: -51.9253 },
  { code: 'AR', name: 'Arjantin', emoji: '🇦🇷', lat: -38.4161, lng: -63.6167 },
  { code: 'CN', name: 'Çin', emoji: '🇨🇳', lat: 35.8617, lng: 104.1954 },
  { code: 'JP', name: 'Japonya', emoji: '🇯🇵', lat: 36.2048, lng: 138.2529 },
  { code: 'KR', name: 'Güney Kore', emoji: '🇰🇷', lat: 35.9078, lng: 127.7669 },
  { code: 'IN', name: 'Hindistan', emoji: '🇮🇳', lat: 20.5937, lng: 78.9629 },
  { code: 'PK', name: 'Pakistan', emoji: '🇵🇰', lat: 30.3753, lng: 69.3451 },
  { code: 'ID', name: 'Endonezya', emoji: '🇮🇩', lat: -0.7893, lng: 113.9213 },
  { code: 'TH', name: 'Tayland', emoji: '🇹🇭', lat: 15.8700, lng: 100.9925 },
  { code: 'VN', name: 'Vietnam', emoji: '🇻🇳', lat: 14.0583, lng: 108.2772 },
  { code: 'AU', name: 'Avustralya', emoji: '🇦🇺', lat: -25.2744, lng: 133.7751 },
  { code: 'NZ', name: 'Yeni Zelanda', emoji: '🇳🇿', lat: -40.9006, lng: 174.8860 },
];

export function findCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code.toUpperCase());
}

export function flagFor(code: string): string {
  return findCountry(code)?.emoji ?? '🌍';
}
