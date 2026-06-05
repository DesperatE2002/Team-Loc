import './env.js';
import { createApp } from './app.js';

const app = createApp();
const PORT = Number(process.env.PORT) || 3010;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] http://localhost:${PORT}`);
});

