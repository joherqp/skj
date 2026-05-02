#!/bin/bash

# Script to prepare distribution folder for SKJ Client
# This script copies production build files to 'skj-client' folder

TARGET_DIR="skj-client"

echo "🚀 Mempersiapkan folder distribusi: $TARGET_DIR..."

# 1. Pastikan build sudah dilakukan
if [ ! -d ".next" ]; then
    echo "❌ Error: Folder '.next' tidak ditemukan. Jalankan 'npm run build' terlebih dahulu."
    exit 1
fi

# 2. Buat folder target (bersihkan jika sudah ada)
if [ -d "$TARGET_DIR" ]; then
    echo "⚠️  Menghapus folder $TARGET_DIR yang sudah ada..."
    rm -rf "$TARGET_DIR"
fi
mkdir -p "$TARGET_DIR"

# 3. Salin file yang diperlukan
echo "📦 Menyalin file produksi..."
cp -R .next "$TARGET_DIR/"
cp -R public "$TARGET_DIR/"
cp package.json "$TARGET_DIR/"
cp package-lock.json "$TARGET_DIR/"
cp next.config.mjs "$TARGET_DIR/"

# Salin .env.local sebagai referensi (opsional, ganti nama jadi .env)
if [ -f ".env.local" ]; then
    cp .env.local "$TARGET_DIR/.env.example"
    echo "📝 .env.local disalin sebagai .env.example (silakan sesuaikan di server)."
fi

# 4. Buat instruksi menjalankan aplikasi
cat <<EOF > "$TARGET_DIR/RUN_INSTRUCTIONS.md"
# Instruksi Menjalankan SKJ Client

Folder ini berisi hasil build produksi aplikasi JBROCK (SKJ). Anda tidak memerlukan folder \`src\` untuk menjalankan aplikasi ini di server.

## Prasyarat
- Node.js (Versi 18 atau lebih baru direkomendasikan)
- NPM atau PM2

## Langkah-langkah Menjalankan

1. **Persiapkan Environment Variables**
   - Salin file \`.env.example\` menjadi \`.env\`.
   - Pastikan variabel \`NEXT_PUBLIC_SUPABASE_URL\` dan \`NEXT_PUBLIC_SUPABASE_ANON_KEY\` sudah sesuai dengan database produksi.

2. **Instal Dependensi Produksi**
   Jalankan perintah berikut di dalam folder ini:
   \`\`\`bash
   npm install --production
   \`\`\`

3. **Jalankan Aplikasi**
   Anda bisa menggunakan NPM langsung:
   \`\`\`bash
   npm start
   \`\`\`
   
   Atau menggunakan **PM2** (Direkomendasikan untuk Server):
   \`\`\`bash
   pm2 start npm --name "skj-client" -- start
   \`\`\`

## Catatan
Aplikasi akan berjalan di port default 3000. Jika ingin mengubah port, gunakan:
\`\`\`bash
PORT=8080 npm start
\`\`\`
EOF

echo "✅ Selesai! Folder '$TARGET_DIR' siap didistribusikan."
echo "💡 Instruksi penggunaan tersedia di: $TARGET_DIR/RUN_INSTRUCTIONS.md"
