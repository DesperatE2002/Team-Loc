// Bu modül, diğer tüm importlardan ÖNCE yüklenmeli ki DATABASE_URL gibi
// environment değişkenleri db.ts import edilmeden önce hazır olsun.
// (ESM importları, dosya gövdesindeki kodlardan önce çalışır.)
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Kök .env dosyasını yükle (mono-repo). Vercel'de bu dosya olmaz;
// orada değişkenler zaten process.env içinde gelir.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
