'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">404</h1>
          <h2 className="text-xl font-semibold text-gray-700">Halaman Tidak Ditemukan</h2>
          <p className="text-gray-500">
            Maaf, halaman yang Anda cari tidak ada atau Anda tidak memiliki akses ke halaman ini.
          </p>
        </div>

        <div className="pt-4">
          <Link href="/beranda">
            <Button className="w-full sm:w-auto px-8 gap-2">
              <Home className="w-4 h-4" />
              Kembali ke Beranda
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
