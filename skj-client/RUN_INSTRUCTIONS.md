# Instruksi Menjalankan SKJ Client

Folder ini berisi hasil build produksi aplikasi JBROCK (SKJ). Anda tidak memerlukan folder `src` untuk menjalankan aplikasi ini di server.

## Prasyarat
- Node.js (Versi 18 atau lebih baru direkomendasikan)
- NPM atau PM2

## Langkah-langkah Menjalankan

1. **Persiapkan Environment Variables**
   - Salin file `.env.example` menjadi `.env`.
   - Pastikan variabel `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` sudah sesuai dengan database produksi.

2. **Instal Dependensi Produksi**
   Jalankan perintah berikut di dalam folder ini:
   ```bash
   npm install --production
   ```

3. **Jalankan Aplikasi**
   Anda bisa menggunakan NPM langsung:
   ```bash
   npm start
   ```
   
   Atau menggunakan **PM2** (Direkomendasikan untuk Server):
   ```bash
   pm2 start npm --name "skj-client" -- start
   ```

## Catatan
Aplikasi akan berjalan di port default 3000. Jika ingin mengubah port, gunakan:
```bash
PORT=8080 npm start
```
