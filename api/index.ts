// Vercel'in build sistemi bu dosyayı ve importlarını otomatik olarak derleyecektir.
// Bu sayede derlenmiş JS dosyalarına path ayarlaması yapmamıza gerek kalmaz.
import { createApp } from '../server/src/app.js';

const app = createApp();

export default app;
