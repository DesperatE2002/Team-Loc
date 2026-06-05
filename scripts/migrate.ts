/**
 * Neon Postgres şemasını oluşturur (idempotent).
 * Local'den: npm run migrate
 * Vercel ilk deploy'dan sonra: vercel env pull .env && npm run migrate
 */
import 'dotenv/config';
import { ensureSchema } from '../server/src/db.js';

async function main() {
  console.log('[migrate] Neon\'a bağlanılıyor…');
  await ensureSchema();
  console.log('[migrate] Şema hazır ✓');
}

main().catch((err) => {
  console.error('[migrate] Hata:', err);
  process.exit(1);
});
