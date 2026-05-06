-- Supabase Schema Auto-Generated from MCP

CREATE TABLE IF NOT EXISTS public.area (
  id uuid,
  nama text,
  kota text,
  created_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.cabang (
  id uuid,
  nama text,
  alamat text,
  kota text,
  telepon text,
  area_id uuid,
  created_at timestamp with time zone,
  koordinat text
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid,
  username text,
  nama text,
  email text,
  telepon text,
  roles text[],
  cabang_id uuid,
  karyawan_id uuid,
  kode_unik text,
  avatar_url text,
  is_active boolean,
  email_verified boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  start_date timestamp with time zone,
  end_date timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.karyawan (
  id uuid,
  nama text,
  posisi text,
  telepon text,
  status text,
  user_account_id uuid,
  cabang_id uuid,
  alamat text,
  provinsi text,
  kota text,
  kecamatan text,
  kelurahan text,
  kode_pos text,
  koordinat text,
  created_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.kategori (
  id uuid,
  nama text,
  deskripsi text,
  created_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.satuan (
  id uuid,
  nama text,
  simbol text,
  created_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.barang (
  id uuid,
  kode text,
  nama text,
  kategori_id uuid,
  satuan_id uuid,
  harga_jual numeric,
  harga_beli numeric,
  stok numeric,
  min_stok numeric,
  gambar_url text,
  is_active boolean,
  multi_satuan jsonb,
  created_at timestamp with time zone,
  created_by uuid,
  updated_at timestamp with time zone,
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.kategori_pelanggan (
  id uuid,
  nama text,
  diskon numeric,
  created_at timestamp with time zone,
  program_diskon jsonb
);

CREATE TABLE IF NOT EXISTS public.pelanggan (
  id uuid,
  kode text,
  nama text,
  alamat text,
  lokasi jsonb,
  telepon text,
  email text,
  kategori_id uuid,
  sales_id uuid,
  cabang_id uuid,
  limit_kredit numeric,
  sisa_kredit numeric,
  is_active boolean,
  created_at timestamp with time zone,
  created_by uuid,
  updated_at timestamp with time zone,
  updated_by uuid,
  no_rekening text,
  nama_bank text,
  nama_pemilik text
);

CREATE TABLE IF NOT EXISTS public.penjualan (
  id uuid,
  nomor_nota text,
  tanggal timestamp with time zone,
  pelanggan_id uuid,
  sales_id uuid,
  cabang_id uuid,
  items jsonb,
  subtotal numeric,
  diskon numeric,
  total numeric,
  metode_pembayaran text,
  status text,
  lokasi jsonb,
  catatan text,
  created_at timestamp with time zone,
  created_by uuid,
  updated_at timestamp with time zone,
  updated_by uuid,
  persetujuan_id uuid,
  bukti_pembayaran text,
  is_lunas boolean,
  tanggal_pelunasan timestamp with time zone,
  bayar numeric,
  kembalian numeric
);

CREATE TABLE IF NOT EXISTS public.rekening_bank (
  id uuid,
  nama_bank text,
  nomor_rekening text,
  atas_nama text,
  is_tunai boolean,
  created_at timestamp with time zone,
  cabang text,
  assigned_user_id uuid
);

CREATE TABLE IF NOT EXISTS public.setoran (
  id uuid,
  nomor_setoran text,
  tanggal timestamp with time zone,
  sales_id uuid,
  cabang_id uuid,
  jumlah numeric,
  rekening_id uuid,
  bukti_url text,
  status text,
  disetujui_oleh uuid,
  catatan text,
  created_at timestamp with time zone,
  created_by uuid,
  updated_at timestamp with time zone,
  updated_by uuid,
  persetujuan_id uuid
);

CREATE TABLE IF NOT EXISTS public.absensi (
  id uuid,
  user_id uuid,
  tanggal timestamp with time zone,
  check_in timestamp with time zone,
  check_out timestamp with time zone,
  lokasi_check_in jsonb,
  lokasi_check_out jsonb,
  status text,
  keterangan text,
  created_at timestamp with time zone,
  foto_check_in text,
  foto_check_out text
);

CREATE TABLE IF NOT EXISTS public.harga (
  id uuid,
  barang_id uuid,
  satuan_id uuid,
  cabang_id uuid,
  kategori_pelanggan_ids text[],
  harga numeric,
  min_qty numeric,
  tanggal_efektif timestamp with time zone,
  status text,
  disetujui_oleh uuid,
  created_at timestamp with time zone,
  persetujuan_id uuid,
  grosir jsonb
);

CREATE TABLE IF NOT EXISTS public.stok_pengguna (
  id uuid,
  user_id uuid,
  barang_id uuid,
  jumlah numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.permintaan_barang (
  id uuid,
  nomor_permintaan text,
  tanggal timestamp with time zone,
  dari_cabang_id uuid,
  ke_cabang_id uuid,
  items jsonb,
  status text,
  dibuat_oleh uuid,
  disetujui_oleh uuid,
  catatan text,
  created_at timestamp with time zone,
  persetujuan_id uuid
);

CREATE TABLE IF NOT EXISTS public.mutasi_barang (
  id uuid,
  nomor_mutasi text,
  tanggal timestamp with time zone,
  dari_cabang_id uuid,
  ke_cabang_id uuid,
  items jsonb,
  status text,
  keterangan text,
  created_at timestamp with time zone,
  created_by uuid,
  updated_at timestamp with time zone,
  updated_by uuid,
  persetujuan_id uuid
);

CREATE TABLE IF NOT EXISTS public.penyesuaian_stok (
  id uuid,
  nomor_penyesuaian text,
  tanggal timestamp with time zone,
  cabang_id uuid,
  barang_id uuid,
  stok_tercatat numeric,
  stok_fisik numeric,
  selisih numeric,
  alasan text,
  keterangan text,
  status text,
  created_at timestamp with time zone,
  created_by uuid,
  updated_at timestamp with time zone,
  updated_by uuid,
  persetujuan_id uuid
);

CREATE TABLE IF NOT EXISTS public.notifikasi (
  id uuid,
  user_id uuid,
  judul text,
  pesan text,
  jenis text,
  dibaca boolean,
  tanggal timestamp with time zone,
  link text
);

CREATE TABLE IF NOT EXISTS public.persetujuan (
  id uuid,
  jenis text,
  referensi_id uuid,
  status text,
  diajukan_oleh uuid,
  target_role text,
  target_cabang_id uuid,
  target_user_id uuid,
  tanggal_pengajuan timestamp with time zone,
  disetujui_oleh uuid,
  tanggal_persetujuan timestamp with time zone,
  catatan text,
  data jsonb
);

CREATE TABLE IF NOT EXISTS public.profil_perusahaan (
  id uuid,
  nama text,
  alamat text,
  telepon text,
  email text,
  website text,
  deskripsi text,
  logo_url text,
  updated_at timestamp with time zone,
  updated_by uuid,
  config jsonb
);

CREATE TABLE IF NOT EXISTS public.reimburse (
  id uuid,
  user_id uuid,
  tanggal timestamp with time zone,
  kategori text,
  keterangan text,
  jumlah numeric,
  status text,
  bukti_url text,
  metode_pembayaran text,
  disetujui_oleh uuid,
  disetujui_pada timestamp with time zone,
  dibayar_pada timestamp with time zone,
  keperluan text,
  catatan_penolakan text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  updated_by uuid,
  persetujuan_id uuid
);

CREATE TABLE IF NOT EXISTS public.promo (
  id uuid,
  nama text,
  kode text,
  tipe text,
  nilai numeric,
  syarat_jumlah numeric,
  syarat_barang_id uuid,
  bonus_produk_id uuid,
  bonus_produk_ids text[],
  bonus_jumlah numeric,
  mekanisme_bonus text,
  berlaku_mulai timestamp with time zone,
  berlaku_sampai timestamp with time zone,
  is_kelipatan boolean,
  aktif boolean,
  keterangan text,
  cabang_id uuid,
  created_at timestamp with time zone,
  created_by uuid,
  updated_at timestamp with time zone,
  updated_by uuid,
  max_apply integer,
  min_qty integer,
  scope text,
  target_produk_ids text[],
  metode_kelipatan text
);

CREATE TABLE IF NOT EXISTS public.saldo_pengguna (
  id uuid,
  user_id uuid,
  saldo numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.petty_cash (
  id uuid,
  tanggal timestamp with time zone,
  tipe text,
  jenis text,
  kategori text,
  keterangan text,
  jumlah numeric,
  saldo_akhir numeric,
  reimburse_id uuid,
  bukti_url text,
  created_by uuid,
  created_at timestamp with time zone,
  cabang_id uuid,
  pengguna_anggaran uuid
);

CREATE TABLE IF NOT EXISTS public.user_locations (
  id uuid,
  user_id uuid,
  latitude double precision,
  longitude double precision,
  timestamp timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.sales_targets (
  id uuid,
  user_id uuid,
  target_amount numeric,
  current_amount numeric,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  is_active boolean,
  is_looping boolean,
  created_at timestamp with time zone,
  created_by uuid,
  updated_at timestamp with time zone,
  updated_by uuid,
  jenis text,
  target_type text,
  nilai numeric,
  scope text,
  cabang_id uuid,
  sales_id uuid
);

CREATE TABLE IF NOT EXISTS public.sales_target_history (
  id uuid,
  target_id uuid,
  amount numeric,
  tanggal timestamp with time zone,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS public.pembayaran_penjualan (
  id uuid,
  penjualan_id uuid,
  jumlah numeric,
  tanggal timestamp with time zone,
  metode_pembayaran text,
  lokasi jsonb,
  catatan text,
  bayar numeric,
  kembalian numeric,
  created_by uuid,
  created_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.restock (
  id uuid,
  nomor_restock text,
  tanggal timestamp with time zone,
  barang_id uuid,
  jumlah numeric,
  satuan_id uuid,
  konversi numeric,
  cabang_id uuid,
  penerima_id uuid,
  dibuat_oleh uuid,
  disetujui_oleh uuid,
  status text,
  keterangan text,
  persetujuan_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.kunjungan (
  id uuid,
  user_id uuid,
  pelanggan_id uuid,
  nama_pelanggan text,
  tipe text,
  tanggal timestamp with time zone,
  lokasi jsonb,
  keterangan text,
  foto text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.riwayat_pelanggan (
  id uuid,
  pelanggan_id uuid,
  user_id uuid,
  tanggal timestamp with time zone,
  aksi text,
  keterangan text,
  data_sebelumnya jsonb,
  data_baru jsonb,
  created_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text UNIQUE NOT NULL,
  p256dh text,
  auth text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
