# SSH Location (Vercel + Neon)

SSH ekibi için konum/seyahat takip platformu. Üyeler kendi yurt içi / yurt dışı durumlarını günceller, yöneticiler ve ekip üyeleri panelden anlık olarak nerede kim olduğunu görür.

## Stack
- **Frontend:** React 19 + Vite + TypeScript + TailwindCSS + Leaflet
- **Backend:** Node.js + Express 5 + TypeScript + Neon Serverless Driver
- **DB:** Neon (Postgres)
- **Deploy:** Vercel

## Vercel Deploy (GitHub Repo ile)

1.  Bu projeyi kendi GitHub hesabınıza fork'layın veya push'layın.
2.  [Vercel](https://vercel.com/new)'de "Import Git Repository" ile projenizi seçin.
3.  **Environment Variables** kısmına `.env.example` dosyasındaki değişkenleri girin:
    -   `DATABASE_URL`: Neon projenizden aldığınız Postgres connection string.
    -   `JWT_SECRET`: Güçlü, rastgele bir string (örneğin `openssl rand -hex 32` ile üretebilirsiniz).
4.  "Deploy" butonuna tıklayın. Vercel otomatik olarak `npm run build` komutunu çalıştıracak, `api` ve `dist` klasörlerini algılayıp deploy edecektir.
5.  **İlk Deploy Sonrası Veritabanı Şemasını Oluşturma:**
    -   Deploy bittikten sonra, local'de projenize gelin.
    -   `vercel env pull` komutunu çalıştırarak Vercel'deki environment variable'ları `.env.local` dosyasına çekin.
    -   `npm run migrate` komutunu çalıştırarak Neon veritabanınızda tabloları oluşturun. Bu işlemi sadece bir kere yapmanız yeterli.

## Local Geliştirme

1.  **Bağımlılıklar:**
    ```powershell
    npm install
    ```
2.  **Environment:**
    -   `.env.example` dosyasını kopyalayıp `.env` adında yeni bir dosya oluşturun.
    -   `DATABASE_URL` ve `JWT_SECRET` değişkenlerini kendi Neon ve secret değerlerinizle doldurun.
3.  **Veritabanı Şeması:**
    -   Eğer daha önce oluşturmadıysanız, şemayı local'den Neon'a göndermek için:
    ```powershell
    npm run migrate
    ```
4.  **Geliştirme Sunucusu:**
    -   Client ve server'ı aynı anda başlatmak için:
    ```powershell
    npm run dev
    ```
    -   Client: `http://localhost:5180`
    -   Server API: `http://localhost:3010` (client tarafından proxy'lenir)

## Proje Yapısı

-   `client/`: Vite + React frontend uygulaması.
-   `server/`: Express backend uygulaması.
    -   `src/app.ts`: Express app'in oluşturulduğu yer. Hem local'de hem Vercel'de kullanılır.
    -   `src/index.ts`: Sadece local geliştirme için `app`'i dinleyen dosya.
-   `api/`: Vercel'in serverless fonksiyonları için giriş noktası.
    -   `index.ts`: Gelen tüm `/api/*` isteklerini `server/src/app.ts`'e yönlendirir.
-   `scripts/`: Yardımcı scriptler.
    -   `migrate.ts`: Veritabanı şemasını oluşturan script.
-   `dist/`: `npm run build` ile oluşturulan production-ready frontend asset'leri.
-   `vercel.json`: Vercel deploy ayarları.
-   `package.json`: Monorepo (workspaces) yapısı. Tüm bağımlılıklar kök `package.json`'da yönetilir.
