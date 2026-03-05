// User and Auth Types
export type UserRole = 'admin' | 'owner' | 'gudang' | 'leader' | 'sales' | 'staff' | 'finance' | 'driver';

export interface User {
    id: string;
    username: string;
    nama: string;
    email: string;
    telepon: string;
    roles: UserRole[];
    cabangId: string;
    karyawanId?: string;
    avatarUrl?: string;
    isActive: boolean;
    createdAt: Date;
}

export interface Lokasi {
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
    alamat?: string;
}

export interface Cabang {
    id: string;
    nama: string;
    alamat: string;
    kota: string;
    telepon: string;
}

// Attendance
export interface Absensi {
    id: string;
    userId: string;
    tanggal: Date;
    checkIn?: Date;
    checkOut?: Date;
    lokasiCheckIn?: Lokasi;
    lokasiCheckOut?: Lokasi;
    status: 'hadir' | 'izin' | 'sakit' | 'alpha';
    fotoCheckIn?: string;
    fotoCheckOut?: string;
    keterangan?: string;
}

// Product Types
export interface Kategori {
    id: string;
    nama: string;
    deskripsi?: string;
}

export interface Satuan {
    id: string;
    nama: string;
    simbol: string;
}

export interface Barang {
    id: string;
    nama: string;
    kode?: string;
    kategoriId: string;
    satuanId: string;
    hargaBeli: number;
    hargaJual: number;
    foto?: string;
    deskripsi?: string;
    minStok?: number;
    isActive?: boolean;
    stok?: number;
}

// Customer Types
export interface KategoriPelanggan {
    id: string;
    nama: string;
    diskon?: number;
}

export interface Pelanggan {
    id: string;
    kode: string;
    nama: string;
    alamat?: string;
    telepon?: string;
    kategoriId: string;
    areaId: string;
    limitKredit?: number;
    sisaHutang: number;
    namaPemilik?: string;
    email?: string;
    lokasi?: Lokasi;
    salesId?: string;
    cabangId?: string;
    isActive?: boolean;
    createdAt?: Date;
}

export interface Area {
    id: string;
    nama: string;
    cabangId?: string;
    kota?: string;
}

// Sales Types
export interface Penjualan {
    id: string;
    transaksi: string;
    tanggal: Date;
    pelangganId: string;
    salesId: string;
    status: 'draft' | 'pending' | 'lunas' | 'batal';
    total: number;
    dibayar: number;
    sisa: number;
    metodePembayaran: 'tunai' | 'transfer' | 'tempo';
    jatuhTempo?: Date;
    lokasi?: Lokasi;
    keterangan?: string;
    catatan?: string;
    nomorNota?: string;
    cabangId?: string;
    items: PenjualanItem[];
    createdAt?: Date;
    createdBy?: string;
}

export interface PenjualanItem {
    id: string;
    barangId: string;
    jumlah: number;
    satuanId: string;
    harga: number;
    diskon?: number;
    subtotal: number;
}

// Deposit Types
export interface Setoran {
    id: string;
    tanggal: Date;
    userId: string;
    jumlah: number;
    rekeningBankId?: string;
    buktiTransfer?: string;
    status: 'pending' | 'diterima' | 'ditolak' | 'disetujui';
    keterangan?: string;
    nomorSetoran?: string;
    cabangId?: string;
    createdAt?: Date;
}

// Employee Types
export interface Karyawan {
    id: string;
    nama: string;
    jabatan?: string;
    telepon?: string;
    cabangId?: string;
    status: 'aktif' | 'nonaktif';
}

// Notification Types
export interface Notifikasi {
    id: string;
    userId: string;
    judul: string;
    pesan: string;
    jenis: 'info' | 'warning' | 'success' | 'error';
    dibaca: boolean;
    link?: string;
    tanggal: Date;
}

// Approval Types
export interface Persetujuan {
    id: string;
    jenis: string;
    data: Record<string, unknown>;
    diajukanOleh: string;
    disetujuiOleh?: string;
    status: 'pending' | 'disetujui' | 'ditolak';
    keterangan?: string;
    tanggalPengajuan: Date;
    tanggalPersetujuan?: Date;
}

// Reimburse Types
export interface Reimburse {
    id: string;
    userId: string;
    tanggal: Date;
    jenis: 'bbm' | 'tol' | 'parkir' | 'lainnya';
    jumlah: number;
    keterangan?: string;
    bukti?: string;
    status: 'pending' | 'disetujui' | 'ditolak' | 'dibayar';
}

// Petty Cash Types
export interface PettyCash {
    id: string;
    tanggal: Date;
    jenis: 'pemasukan' | 'pengeluaran';
    kategori: string;
    jumlah: number;
    saldoAkhir: number;
    keterangan?: string;
    bukti?: string;
    userId: string;
}

// Harga Types
export interface Harga {
    id: string;
    barangId: string;
    kategoriPelangganId?: string;
    harga: number;
    satuanId?: string;
    cabangId?: string;
}
