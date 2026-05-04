export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      absensi: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          foto_check_in: string | null
          foto_check_out: string | null
          id: string
          keterangan: string | null
          lokasi_check_in: Json | null
          lokasi_check_out: Json | null
          status: string | null
          tanggal: string
          user_id: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          foto_check_in?: string | null
          foto_check_out?: string | null
          id?: string
          keterangan?: string | null
          lokasi_check_in?: Json | null
          lokasi_check_out?: Json | null
          status?: string | null
          tanggal: string
          user_id: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          foto_check_in?: string | null
          foto_check_out?: string | null
          id?: string
          keterangan?: string | null
          lokasi_check_in?: Json | null
          lokasi_check_out?: Json | null
          status?: string | null
          tanggal?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "absensi_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      area: {
        Row: {
          created_at: string | null
          id: string
          kota: string
          nama: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          kota: string
          nama: string
        }
        Update: {
          created_at?: string | null
          id?: string
          kota?: string
          nama?: string
        }
        Relationships: []
      }
      barang: {
        Row: {
          created_at: string | null
          created_by: string | null
          gambar_url: string | null
          harga_beli: number
          harga_jual: number
          id: string
          is_active: boolean | null
          kategori_id: string
          kode: string
          min_stok: number | null
          multi_satuan: Json | null
          nama: string
          satuan_id: string
          stok: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          gambar_url?: string | null
          harga_beli: number
          harga_jual: number
          id?: string
          is_active?: boolean | null
          kategori_id: string
          kode: string
          min_stok?: number | null
          multi_satuan?: Json | null
          nama: string
          satuan_id: string
          stok?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          gambar_url?: string | null
          harga_beli?: number
          harga_jual?: number
          id?: string
          is_active?: boolean | null
          kategori_id?: string
          kode?: string
          min_stok?: number | null
          multi_satuan?: Json | null
          nama?: string
          satuan_id?: string
          stok?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barang_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barang_kategori_id_fkey"
            columns: ["kategori_id"]
            isOneToOne: false
            referencedRelation: "kategori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barang_satuan_id_fkey"
            columns: ["satuan_id"]
            isOneToOne: false
            referencedRelation: "satuan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barang_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cabang: {
        Row: {
          alamat: string
          area_id: string | null
          created_at: string | null
          id: string
          koordinat: string | null
          kota: string
          nama: string
          telepon: string
        }
        Insert: {
          alamat: string
          area_id?: string | null
          created_at?: string | null
          id?: string
          koordinat?: string | null
          kota: string
          nama: string
          telepon: string
        }
        Update: {
          alamat?: string
          area_id?: string | null
          created_at?: string | null
          id?: string
          koordinat?: string | null
          kota?: string
          nama?: string
          telepon?: string
        }
        Relationships: [
          {
            foreignKeyName: "cabang_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
        ]
      }
      harga: {
        Row: {
          barang_id: string
          cabang_id: string | null
          created_at: string | null
          disetujui_oleh: string | null
          grosir: Json | null
          harga: number
          id: string
          kategori_pelanggan_ids: string[] | null
          min_qty: number | null
          persetujuan_id: string | null
          satuan_id: string
          status: string | null
          tanggal_efektif: string
        }
        Insert: {
          barang_id: string
          cabang_id?: string | null
          created_at?: string | null
          disetujui_oleh?: string | null
          grosir?: Json | null
          harga: number
          id?: string
          kategori_pelanggan_ids?: string[] | null
          min_qty?: number | null
          persetujuan_id?: string | null
          satuan_id: string
          status?: string | null
          tanggal_efektif: string
        }
        Update: {
          barang_id?: string
          cabang_id?: string | null
          created_at?: string | null
          disetujui_oleh?: string | null
          grosir?: Json | null
          harga?: number
          id?: string
          kategori_pelanggan_ids?: string[] | null
          min_qty?: number | null
          persetujuan_id?: string | null
          satuan_id?: string
          status?: string | null
          tanggal_efektif?: string
        }
        Relationships: [
          {
            foreignKeyName: "harga_khusus_barang_id_fkey"
            columns: ["barang_id"]
            isOneToOne: false
            referencedRelation: "barang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harga_khusus_cabang_id_fkey"
            columns: ["cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harga_khusus_disetujui_oleh_fkey"
            columns: ["disetujui_oleh"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harga_khusus_persetujuan_id_fkey"
            columns: ["persetujuan_id"]
            isOneToOne: false
            referencedRelation: "persetujuan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harga_khusus_satuan_id_fkey"
            columns: ["satuan_id"]
            isOneToOne: false
            referencedRelation: "satuan"
            referencedColumns: ["id"]
          },
        ]
      }
      karyawan: {
        Row: {
          alamat: string | null
          cabang_id: string
          created_at: string | null
          id: string
          kecamatan: string | null
          kelurahan: string | null
          kode_pos: string | null
          koordinat: string | null
          kota: string | null
          nama: string
          posisi: string
          provinsi: string | null
          status: string | null
          telepon: string
          user_account_id: string | null
        }
        Insert: {
          alamat?: string | null
          cabang_id: string
          created_at?: string | null
          id?: string
          kecamatan?: string | null
          kelurahan?: string | null
          kode_pos?: string | null
          koordinat?: string | null
          kota?: string | null
          nama: string
          posisi: string
          provinsi?: string | null
          status?: string | null
          telepon: string
          user_account_id?: string | null
        }
        Update: {
          alamat?: string | null
          cabang_id?: string
          created_at?: string | null
          id?: string
          kecamatan?: string | null
          kelurahan?: string | null
          kode_pos?: string | null
          koordinat?: string | null
          kota?: string | null
          nama?: string
          posisi?: string
          provinsi?: string | null
          status?: string | null
          telepon?: string
          user_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "karyawan_cabang_id_fkey"
            columns: ["cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
        ]
      }
      kategori: {
        Row: {
          created_at: string | null
          deskripsi: string | null
          id: string
          nama: string
        }
        Insert: {
          created_at?: string | null
          deskripsi?: string | null
          id?: string
          nama: string
        }
        Update: {
          created_at?: string | null
          deskripsi?: string | null
          id?: string
          nama?: string
        }
        Relationships: []
      }
      kategori_pelanggan: {
        Row: {
          created_at: string | null
          diskon: number | null
          id: string
          nama: string
          program_diskon: Json | null
        }
        Insert: {
          created_at?: string | null
          diskon?: number | null
          id?: string
          nama: string
          program_diskon?: Json | null
        }
        Update: {
          created_at?: string | null
          diskon?: number | null
          id?: string
          nama?: string
          program_diskon?: Json | null
        }
        Relationships: []
      }
      kunjungan: {
        Row: {
          created_at: string | null
          foto: string | null
          id: string
          keterangan: string | null
          lokasi: Json | null
          nama_pelanggan: string | null
          pelanggan_id: string | null
          tanggal: string
          tipe: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          foto?: string | null
          id?: string
          keterangan?: string | null
          lokasi?: Json | null
          nama_pelanggan?: string | null
          pelanggan_id?: string | null
          tanggal: string
          tipe: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          foto?: string | null
          id?: string
          keterangan?: string | null
          lokasi?: Json | null
          nama_pelanggan?: string | null
          pelanggan_id?: string | null
          tanggal?: string
          tipe?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kunjungan_pelanggan_id_fkey"
            columns: ["pelanggan_id"]
            isOneToOne: false
            referencedRelation: "pelanggan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kunjungan_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mutasi_barang: {
        Row: {
          created_at: string | null
          created_by: string | null
          dari_cabang_id: string
          id: string
          items: Json
          ke_cabang_id: string
          keterangan: string | null
          nomor_mutasi: string
          persetujuan_id: string | null
          status: string | null
          tanggal: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dari_cabang_id: string
          id?: string
          items: Json
          ke_cabang_id: string
          keterangan?: string | null
          nomor_mutasi: string
          persetujuan_id?: string | null
          status?: string | null
          tanggal: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dari_cabang_id?: string
          id?: string
          items?: Json
          ke_cabang_id?: string
          keterangan?: string | null
          nomor_mutasi?: string
          persetujuan_id?: string | null
          status?: string | null
          tanggal?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mutasi_barang_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutasi_barang_dari_cabang_id_fkey"
            columns: ["dari_cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutasi_barang_ke_cabang_id_fkey"
            columns: ["ke_cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutasi_barang_persetujuan_id_fkey"
            columns: ["persetujuan_id"]
            isOneToOne: false
            referencedRelation: "persetujuan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutasi_barang_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifikasi: {
        Row: {
          dibaca: boolean | null
          id: string
          jenis: string | null
          judul: string
          link: string | null
          pesan: string
          tanggal: string | null
          user_id: string
        }
        Insert: {
          dibaca?: boolean | null
          id?: string
          jenis?: string | null
          judul: string
          link?: string | null
          pesan: string
          tanggal?: string | null
          user_id: string
        }
        Update: {
          dibaca?: boolean | null
          id?: string
          jenis?: string | null
          judul?: string
          link?: string | null
          pesan?: string
          tanggal?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifikasi_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pelanggan: {
        Row: {
          alamat: string
          cabang_id: string
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          kategori_id: string
          kode: string
          limit_kredit: number | null
          lokasi: Json | null
          nama: string
          nama_bank: string | null
          nama_pemilik: string | null
          no_rekening: string | null
          sales_id: string
          sisa_kredit: number | null
          telepon: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          alamat: string
          cabang_id: string
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          kategori_id: string
          kode: string
          limit_kredit?: number | null
          lokasi?: Json | null
          nama: string
          nama_bank?: string | null
          nama_pemilik?: string | null
          no_rekening?: string | null
          sales_id: string
          sisa_kredit?: number | null
          telepon: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          alamat?: string
          cabang_id?: string
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          kategori_id?: string
          kode?: string
          limit_kredit?: number | null
          lokasi?: Json | null
          nama?: string
          nama_bank?: string | null
          nama_pemilik?: string | null
          no_rekening?: string | null
          sales_id?: string
          sisa_kredit?: number | null
          telepon?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pelanggan_cabang_id_fkey"
            columns: ["cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pelanggan_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pelanggan_kategori_id_fkey"
            columns: ["kategori_id"]
            isOneToOne: false
            referencedRelation: "kategori_pelanggan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pelanggan_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pelanggan_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pembayaran_penjualan: {
        Row: {
          bayar: number | null
          catatan: string | null
          created_at: string | null
          created_by: string | null
          id: string
          jumlah: number
          kembalian: number | null
          lokasi: Json | null
          metode_pembayaran: string
          penjualan_id: string | null
          tanggal: string | null
        }
        Insert: {
          bayar?: number | null
          catatan?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          jumlah: number
          kembalian?: number | null
          lokasi?: Json | null
          metode_pembayaran: string
          penjualan_id?: string | null
          tanggal?: string | null
        }
        Update: {
          bayar?: number | null
          catatan?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          jumlah?: number
          kembalian?: number | null
          lokasi?: Json | null
          metode_pembayaran?: string
          penjualan_id?: string | null
          tanggal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pembayaran_penjualan_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pembayaran_penjualan_penjualan_id_fkey"
            columns: ["penjualan_id"]
            isOneToOne: false
            referencedRelation: "penjualan"
            referencedColumns: ["id"]
          },
        ]
      }
      penjualan: {
        Row: {
          bayar: number | null
          bukti_pembayaran: string | null
          cabang_id: string
          catatan: string | null
          created_at: string | null
          created_by: string | null
          diskon: number | null
          id: string
          is_lunas: boolean | null
          items: Json
          kembalian: number | null
          lokasi: Json | null
          metode_pembayaran: string
          nomor_nota: string
          pelanggan_id: string
          persetujuan_id: string | null
          sales_id: string
          status: string | null
          subtotal: number
          tanggal: string
          tanggal_pelunasan: string | null
          total: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          bayar?: number | null
          bukti_pembayaran?: string | null
          cabang_id: string
          catatan?: string | null
          created_at?: string | null
          created_by?: string | null
          diskon?: number | null
          id?: string
          is_lunas?: boolean | null
          items: Json
          kembalian?: number | null
          lokasi?: Json | null
          metode_pembayaran: string
          nomor_nota: string
          pelanggan_id: string
          persetujuan_id?: string | null
          sales_id: string
          status?: string | null
          subtotal: number
          tanggal: string
          tanggal_pelunasan?: string | null
          total: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          bayar?: number | null
          bukti_pembayaran?: string | null
          cabang_id?: string
          catatan?: string | null
          created_at?: string | null
          created_by?: string | null
          diskon?: number | null
          id?: string
          is_lunas?: boolean | null
          items?: Json
          kembalian?: number | null
          lokasi?: Json | null
          metode_pembayaran?: string
          nomor_nota?: string
          pelanggan_id?: string
          persetujuan_id?: string | null
          sales_id?: string
          status?: string | null
          subtotal?: number
          tanggal?: string
          tanggal_pelunasan?: string | null
          total?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "penjualan_cabang_id_fkey"
            columns: ["cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penjualan_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penjualan_pelanggan_id_fkey"
            columns: ["pelanggan_id"]
            isOneToOne: false
            referencedRelation: "pelanggan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penjualan_persetujuan_id_fkey"
            columns: ["persetujuan_id"]
            isOneToOne: false
            referencedRelation: "persetujuan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penjualan_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penjualan_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      penyesuaian_stok: {
        Row: {
          alasan: string
          barang_id: string
          cabang_id: string
          created_at: string | null
          created_by: string | null
          id: string
          keterangan: string | null
          nomor_penyesuaian: string
          persetujuan_id: string | null
          selisih: number
          status: string | null
          stok_fisik: number
          stok_tercatat: number
          tanggal: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          alasan: string
          barang_id: string
          cabang_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          keterangan?: string | null
          nomor_penyesuaian: string
          persetujuan_id?: string | null
          selisih: number
          status?: string | null
          stok_fisik: number
          stok_tercatat: number
          tanggal: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          alasan?: string
          barang_id?: string
          cabang_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          keterangan?: string | null
          nomor_penyesuaian?: string
          persetujuan_id?: string | null
          selisih?: number
          status?: string | null
          stok_fisik?: number
          stok_tercatat?: number
          tanggal?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "penyesuaian_stok_barang_id_fkey"
            columns: ["barang_id"]
            isOneToOne: false
            referencedRelation: "barang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penyesuaian_stok_cabang_id_fkey"
            columns: ["cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penyesuaian_stok_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penyesuaian_stok_persetujuan_id_fkey"
            columns: ["persetujuan_id"]
            isOneToOne: false
            referencedRelation: "persetujuan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penyesuaian_stok_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      permintaan_barang: {
        Row: {
          catatan: string | null
          created_at: string | null
          dari_cabang_id: string
          dibuat_oleh: string | null
          disetujui_oleh: string | null
          id: string
          items: Json
          ke_cabang_id: string
          nomor_permintaan: string
          persetujuan_id: string | null
          status: string | null
          tanggal: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string | null
          dari_cabang_id: string
          dibuat_oleh?: string | null
          disetujui_oleh?: string | null
          id?: string
          items: Json
          ke_cabang_id: string
          nomor_permintaan: string
          persetujuan_id?: string | null
          status?: string | null
          tanggal: string
        }
        Update: {
          catatan?: string | null
          created_at?: string | null
          dari_cabang_id?: string
          dibuat_oleh?: string | null
          disetujui_oleh?: string | null
          id?: string
          items?: Json
          ke_cabang_id?: string
          nomor_permintaan?: string
          persetujuan_id?: string | null
          status?: string | null
          tanggal?: string
        }
        Relationships: [
          {
            foreignKeyName: "permintaan_barang_dari_cabang_id_fkey"
            columns: ["dari_cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permintaan_barang_dibuat_oleh_fkey"
            columns: ["dibuat_oleh"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permintaan_barang_disetujui_oleh_fkey"
            columns: ["disetujui_oleh"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permintaan_barang_ke_cabang_id_fkey"
            columns: ["ke_cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permintaan_barang_persetujuan_id_fkey"
            columns: ["persetujuan_id"]
            isOneToOne: false
            referencedRelation: "persetujuan"
            referencedColumns: ["id"]
          },
        ]
      }
      persetujuan: {
        Row: {
          catatan: string | null
          data: Json | null
          diajukan_oleh: string
          disetujui_oleh: string | null
          id: string
          jenis: string
          referensi_id: string
          status: string | null
          tanggal_pengajuan: string | null
          tanggal_persetujuan: string | null
          target_cabang_id: string | null
          target_role: string | null
          target_user_id: string | null
        }
        Insert: {
          catatan?: string | null
          data?: Json | null
          diajukan_oleh: string
          disetujui_oleh?: string | null
          id?: string
          jenis: string
          referensi_id: string
          status?: string | null
          tanggal_pengajuan?: string | null
          tanggal_persetujuan?: string | null
          target_cabang_id?: string | null
          target_role?: string | null
          target_user_id?: string | null
        }
        Update: {
          catatan?: string | null
          data?: Json | null
          diajukan_oleh?: string
          disetujui_oleh?: string | null
          id?: string
          jenis?: string
          referensi_id?: string
          status?: string | null
          tanggal_pengajuan?: string | null
          tanggal_persetujuan?: string | null
          target_cabang_id?: string | null
          target_role?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "persetujuan_diajukan_oleh_fkey"
            columns: ["diajukan_oleh"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persetujuan_disetujui_oleh_fkey"
            columns: ["disetujui_oleh"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persetujuan_target_cabang_id_fkey"
            columns: ["target_cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persetujuan_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash: {
        Row: {
          bukti_url: string | null
          created_at: string | null
          created_by: string | null
          id: string
          jumlah: number
          kategori: string
          keterangan: string | null
          reimburse_id: string | null
          saldo_akhir: number
          tanggal: string | null
          tipe: string
        }
        Insert: {
          bukti_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          jumlah: number
          kategori: string
          keterangan?: string | null
          reimburse_id?: string | null
          saldo_akhir: number
          tanggal?: string | null
          tipe: string
        }
        Update: {
          bukti_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          jumlah?: number
          kategori?: string
          keterangan?: string | null
          reimburse_id?: string | null
          saldo_akhir?: number
          tanggal?: string | null
          tipe?: string
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profil_perusahaan: {
        Row: {
          alamat: string
          config: Json | null
          deskripsi: string | null
          email: string
          id: string
          logo_url: string | null
          nama: string
          telepon: string
          updated_at: string | null
          updated_by: string | null
          website: string | null
        }
        Insert: {
          alamat: string
          config?: Json | null
          deskripsi?: string | null
          email: string
          id?: string
          logo_url?: string | null
          nama: string
          telepon: string
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          alamat?: string
          config?: Json | null
          deskripsi?: string | null
          email?: string
          id?: string
          logo_url?: string | null
          nama?: string
          telepon?: string
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profil_perusahaan_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      promo: {
        Row: {
          aktif: boolean | null
          berlaku_mulai: string
          berlaku_sampai: string | null
          bonus_jumlah: number | null
          bonus_produk_id: string | null
          bonus_produk_ids: string[] | null
          cabang_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_kelipatan: boolean | null
          keterangan: string | null
          kode: string | null
          max_apply: number | null
          mekanisme_bonus: string | null
          metode_kelipatan: string | null
          min_qty: number | null
          nama: string
          nilai: number | null
          scope: string | null
          syarat_barang_id: string | null
          syarat_jumlah: number | null
          target_produk_ids: string[] | null
          tipe: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          aktif?: boolean | null
          berlaku_mulai: string
          berlaku_sampai?: string | null
          bonus_jumlah?: number | null
          bonus_produk_id?: string | null
          bonus_produk_ids?: string[] | null
          cabang_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_kelipatan?: boolean | null
          keterangan?: string | null
          kode?: string | null
          max_apply?: number | null
          mekanisme_bonus?: string | null
          metode_kelipatan?: string | null
          min_qty?: number | null
          nama: string
          nilai?: number | null
          scope?: string | null
          syarat_barang_id?: string | null
          syarat_jumlah?: number | null
          target_produk_ids?: string[] | null
          tipe: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          aktif?: boolean | null
          berlaku_mulai?: string
          berlaku_sampai?: string | null
          bonus_jumlah?: number | null
          bonus_produk_id?: string | null
          bonus_produk_ids?: string[] | null
          cabang_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_kelipatan?: boolean | null
          keterangan?: string | null
          kode?: string | null
          max_apply?: number | null
          mekanisme_bonus?: string | null
          metode_kelipatan?: string | null
          min_qty?: number | null
          nama?: string
          nilai?: number | null
          scope?: string | null
          syarat_barang_id?: string | null
          syarat_jumlah?: number | null
          target_produk_ids?: string[] | null
          tipe?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_bonus_produk_id_fkey"
            columns: ["bonus_produk_id"]
            isOneToOne: false
            referencedRelation: "barang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_cabang_id_fkey"
            columns: ["cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_syarat_barang_id_fkey"
            columns: ["syarat_barang_id"]
            isOneToOne: false
            referencedRelation: "barang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reimburse: {
        Row: {
          bukti_url: string | null
          catatan_penolakan: string | null
          created_at: string | null
          dibayar_pada: string | null
          disetujui_oleh: string | null
          disetujui_pada: string | null
          id: string
          jumlah: number
          kategori: string
          keperluan: string | null
          keterangan: string | null
          metode_pembayaran: string | null
          persetujuan_id: string | null
          status: string | null
          tanggal: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          bukti_url?: string | null
          catatan_penolakan?: string | null
          created_at?: string | null
          dibayar_pada?: string | null
          disetujui_oleh?: string | null
          disetujui_pada?: string | null
          id?: string
          jumlah: number
          kategori: string
          keperluan?: string | null
          keterangan?: string | null
          metode_pembayaran?: string | null
          persetujuan_id?: string | null
          status?: string | null
          tanggal?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          bukti_url?: string | null
          catatan_penolakan?: string | null
          created_at?: string | null
          dibayar_pada?: string | null
          disetujui_oleh?: string | null
          disetujui_pada?: string | null
          id?: string
          jumlah?: number
          kategori?: string
          keperluan?: string | null
          keterangan?: string | null
          metode_pembayaran?: string | null
          persetujuan_id?: string | null
          status?: string | null
          tanggal?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reimburse_disetujui_oleh_fkey"
            columns: ["disetujui_oleh"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reimburse_persetujuan_id_fkey"
            columns: ["persetujuan_id"]
            isOneToOne: false
            referencedRelation: "persetujuan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reimburse_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reimburse_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rekening_bank: {
        Row: {
          assigned_user_id: string | null
          atas_nama: string
          cabang: string | null
          created_at: string | null
          id: string
          is_tunai: boolean | null
          nama_bank: string
          nomor_rekening: string
        }
        Insert: {
          assigned_user_id?: string | null
          atas_nama: string
          cabang?: string | null
          created_at?: string | null
          id?: string
          is_tunai?: boolean | null
          nama_bank: string
          nomor_rekening: string
        }
        Update: {
          assigned_user_id?: string | null
          atas_nama?: string
          cabang?: string | null
          created_at?: string | null
          id?: string
          is_tunai?: boolean | null
          nama_bank?: string
          nomor_rekening?: string
        }
        Relationships: [
          {
            foreignKeyName: "rekening_bank_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      restock: {
        Row: {
          barang_id: string
          cabang_id: string | null
          created_at: string | null
          dibuat_oleh: string | null
          disetujui_oleh: string | null
          id: string
          jumlah: number
          keterangan: string | null
          konversi: number | null
          nomor_restock: string
          penerima_id: string | null
          persetujuan_id: string | null
          satuan_id: string | null
          status: string | null
          tanggal: string
          updated_at: string | null
        }
        Insert: {
          barang_id: string
          cabang_id?: string | null
          created_at?: string | null
          dibuat_oleh?: string | null
          disetujui_oleh?: string | null
          id?: string
          jumlah: number
          keterangan?: string | null
          konversi?: number | null
          nomor_restock: string
          penerima_id?: string | null
          persetujuan_id?: string | null
          satuan_id?: string | null
          status?: string | null
          tanggal?: string
          updated_at?: string | null
        }
        Update: {
          barang_id?: string
          cabang_id?: string | null
          created_at?: string | null
          dibuat_oleh?: string | null
          disetujui_oleh?: string | null
          id?: string
          jumlah?: number
          keterangan?: string | null
          konversi?: number | null
          nomor_restock?: string
          penerima_id?: string | null
          persetujuan_id?: string | null
          satuan_id?: string | null
          status?: string | null
          tanggal?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restock_barang_id_fkey"
            columns: ["barang_id"]
            isOneToOne: false
            referencedRelation: "barang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restock_cabang_id_fkey"
            columns: ["cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restock_dibuat_oleh_fkey"
            columns: ["dibuat_oleh"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restock_disetujui_oleh_fkey"
            columns: ["disetujui_oleh"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restock_penerima_id_fkey"
            columns: ["penerima_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restock_persetujuan_id_fkey"
            columns: ["persetujuan_id"]
            isOneToOne: false
            referencedRelation: "persetujuan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restock_satuan_id_fkey"
            columns: ["satuan_id"]
            isOneToOne: false
            referencedRelation: "satuan"
            referencedColumns: ["id"]
          },
        ]
      }
      riwayat_pelanggan: {
        Row: {
          aksi: string
          created_at: string | null
          data_baru: Json | null
          data_sebelumnya: Json | null
          id: string
          keterangan: string | null
          pelanggan_id: string
          tanggal: string
          user_id: string
        }
        Insert: {
          aksi: string
          created_at?: string | null
          data_baru?: Json | null
          data_sebelumnya?: Json | null
          id?: string
          keterangan?: string | null
          pelanggan_id: string
          tanggal?: string
          user_id: string
        }
        Update: {
          aksi?: string
          created_at?: string | null
          data_baru?: Json | null
          data_sebelumnya?: Json | null
          id?: string
          keterangan?: string | null
          pelanggan_id?: string
          tanggal?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "riwayat_pelanggan_pelanggan_id_fkey"
            columns: ["pelanggan_id"]
            isOneToOne: false
            referencedRelation: "pelanggan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riwayat_pelanggan_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saldo_pengguna: {
        Row: {
          created_at: string | null
          id: string
          saldo: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          saldo?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          saldo?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saldo_pengguna_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      riwayat_saldo_pengguna: {
        Row: {
          created_at: string | null
          id: string
          user_id: string | null
          tipe: string | null
          jumlah: number | null
          saldo_awal: number | null
          saldo_akhir: number | null
          keterangan: string | null
          referensi_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id?: string | null
          tipe?: string | null
          jumlah?: number | null
          saldo_awal?: number | null
          saldo_akhir?: number | null
          keterangan?: string | null
          referensi_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string | null
          tipe?: string | null
          jumlah?: number | null
          saldo_awal?: number | null
          saldo_akhir?: number | null
          keterangan?: string | null
          referensi_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "riwayat_saldo_pengguna_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_target_history: {
        Row: {
          amount: number
          created_by: string | null
          id: string
          tanggal: string | null
          target_id: string | null
        }
        Insert: {
          amount: number
          created_by?: string | null
          id?: string
          tanggal?: string | null
          target_id?: string | null
        }
        Update: {
          amount?: number
          created_by?: string | null
          id?: string
          tanggal?: string | null
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_target_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_target_history_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "sales_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_targets: {
        Row: {
          cabang_id: string | null
          created_at: string | null
          created_by: string | null
          current_amount: number | null
          end_date: string | null
          id: string
          is_active: boolean | null
          is_looping: boolean | null
          jenis: string | null
          nilai: number | null
          sales_id: string | null
          scope: string | null
          start_date: string
          target_amount: number
          target_type: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          cabang_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_amount?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_looping?: boolean | null
          jenis?: string | null
          nilai?: number | null
          sales_id?: string | null
          scope?: string | null
          start_date: string
          target_amount: number
          target_type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          cabang_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_amount?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_looping?: boolean | null
          jenis?: string | null
          nilai?: number | null
          sales_id?: string | null
          scope?: string | null
          start_date?: string
          target_amount?: number
          target_type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_targets_cabang_id_fkey"
            columns: ["cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_targets_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_targets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_targets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      satuan: {
        Row: {
          created_at: string | null
          id: string
          nama: string
          simbol: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nama: string
          simbol: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nama?: string
          simbol?: string
        }
        Relationships: []
      }
      setoran: {
        Row: {
          bukti_url: string | null
          cabang_id: string
          catatan: string | null
          created_at: string | null
          created_by: string | null
          disetujui_oleh: string | null
          id: string
          jumlah: number
          nomor_setoran: string
          persetujuan_id: string | null
          rekening_id: string
          sales_id: string
          status: string | null
          tanggal: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          bukti_url?: string | null
          cabang_id: string
          catatan?: string | null
          created_at?: string | null
          created_by?: string | null
          disetujui_oleh?: string | null
          id?: string
          jumlah: number
          nomor_setoran: string
          persetujuan_id?: string | null
          rekening_id: string
          sales_id: string
          status?: string | null
          tanggal: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          bukti_url?: string | null
          cabang_id?: string
          catatan?: string | null
          created_at?: string | null
          created_by?: string | null
          disetujui_oleh?: string | null
          id?: string
          jumlah?: number
          nomor_setoran?: string
          persetujuan_id?: string | null
          rekening_id?: string
          sales_id?: string
          status?: string | null
          tanggal?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "setoran_cabang_id_fkey"
            columns: ["cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setoran_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setoran_disetujui_oleh_fkey"
            columns: ["disetujui_oleh"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setoran_persetujuan_id_fkey"
            columns: ["persetujuan_id"]
            isOneToOne: false
            referencedRelation: "persetujuan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setoran_rekening_id_fkey"
            columns: ["rekening_id"]
            isOneToOne: false
            referencedRelation: "rekening_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setoran_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setoran_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stok_pengguna: {
        Row: {
          barang_id: string
          created_at: string | null
          id: string
          jumlah: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          barang_id: string
          created_at?: string | null
          id?: string
          jumlah: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          barang_id?: string
          created_at?: string | null
          id?: string
          jumlah?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stok_pengguna_barang_id_fkey"
            columns: ["barang_id"]
            isOneToOne: false
            referencedRelation: "barang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stok_pengguna_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locations: {
        Row: {
          id: string
          latitude: number
          longitude: number
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          latitude: number
          longitude: number
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          latitude?: number
          longitude?: number
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          cabang_id: string
          created_at: string | null
          email: string
          end_date: string | null
          id: string
          is_active: boolean | null
          karyawan_id: string | null
          nama: string
          roles: string[]
          start_date: string | null
          telepon: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          cabang_id: string
          created_at?: string | null
          email: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          karyawan_id?: string | null
          nama: string
          roles?: string[]
          start_date?: string | null
          telepon: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          cabang_id?: string
          created_at?: string | null
          email?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          karyawan_id?: string | null
          nama?: string
          roles?: string[]
          start_date?: string | null
          telepon?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_cabang_id_fkey"
            columns: ["cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_approval_status_check: {
        Row: {
          persetujuan_id: string | null
          persetujuan_status: string | null
          referensi_id: string | null
          sync_status: string | null
          table_name: string | null
          table_status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      normalize_approval_status: {
        Args: { raw_status: string; source_table: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
