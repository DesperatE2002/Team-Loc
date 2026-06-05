import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Kök .env dosyasını yükle (mono-repo)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = createApp();
const PORT = Number(process.env.PORT) || 3010;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] http://localhost:${PORT}`);
});

