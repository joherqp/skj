'use client';
import { useState, useEffect, useRef } from 'react';
import { Menu, Bell, User, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, cleanCompanyName } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useDatabase } from '@/contexts/DatabaseContext';
import { usePathname, useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { playNotificationSound } from '@/lib/notificationSound';

interface HeaderProps {
  onMenuClick: () => void;
  isDesktop?: boolean;
  isSidebarCollapsed?: boolean;
  onSidebarToggle?: () => void;
}

export function Header({
  onMenuClick,
  isDesktop = false,
  isSidebarCollapsed = false,
  onSidebarToggle
}: HeaderProps) {
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  const { 
    notifikasi, 
    markNotifikasiRead, 
    markAllNotifikasiRead, 
    refresh, 
    isRefreshing, 
    profilPerusahaan, 
    dbMode,
    isLoading: isDbLoading,
    isInitialized
  } = useDatabase();
  const router = useRouter();
  const pathname = usePathname();

  // Connection status
  const [isOnline, setIsOnline] = useState(true);

  // Application readiness
  const isAppReady = !isAuthLoading && !isDbLoading && isInitialized && !!user;
  const isAppFullyReady = isAppReady && !isRefreshing && isOnline;

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getPageTitle = () => {
    const path = pathname;
    let title = 'CVSKJ';
    if (path.startsWith('/beranda')) title = 'Beranda';
    else if (path.startsWith('/absensi')) title = 'Absensi';
    else if (path.startsWith('/barang')) title = 'Barang';
    else if (path.startsWith('/pelanggan')) title = 'Pelanggan';
    else if (path.startsWith('/penjualan')) title = 'Penjualan';
    else if (path.startsWith('/setoran')) title = 'Setoran';
    else if (path.startsWith('/persetujuan')) title = 'Kotak Masuk';
    else if (path.startsWith('/laporan')) title = 'Laporan';
    else if (path.startsWith('/monitoring')) title = 'Monitoring';
    else if (path.startsWith('/pengaturan')) title = 'Pengaturan';
    else if (path.startsWith('/profil')) title = 'Profil';
    else if (path.startsWith('/notifikasi')) title = 'Notifikasi';
    else if (path.startsWith('/reimburse')) title = 'Reimburse';
    else if (path.startsWith('/petty-cash')) title = 'Kas Kecil';
    else title = cleanCompanyName(profilPerusahaan?.nama) || 'CVSKJ';

    return title.toUpperCase();
  };

  const normalizedCompanyName = cleanCompanyName(profilPerusahaan?.nama);
  const companyName = !normalizedCompanyName || normalizedCompanyName.toLowerCase() === 'loading...'
    ? 'CVSKJ'
    : normalizedCompanyName;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Filter notifications for current user
  const allUserNotifikasi = notifikasi
    .filter(n => n.userId === user?.id)
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  // Count unread
  const unreadCount = allUserNotifikasi.filter(n => !n.dibaca).length;
  const prevUnreadRef = useRef(0);

  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      playNotificationSound();
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  // Show top 5 unread in dropdown
  const recentNotifikasi = allUserNotifikasi.filter(n => !n.dibaca).slice(0, 5);

  const handleNotifClick = (id: string, link?: string) => {
    markNotifikasiRead(id);
    if (link) router.push(link);
  };

  return (
    <div className={`
      fixed top-0 z-40 bg-white border-b px-4 h-16 flex items-center justify-between shadow-sm transition-all duration-300
      left-0 ${isSidebarCollapsed ? 'lg:left-20' : 'lg:left-64'}
      right-0
    `}>
      <div className="flex items-center gap-3">
        {/* Mobile Toggle */}
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden -ml-2">
          <Menu className="w-5 h-5 text-gray-700" />
        </Button>

        {/* Desktop Toggle */}
        <Button variant="ghost" size="icon" onClick={onSidebarToggle} className="hidden lg:flex text-gray-500 hover:text-gray-900">
          {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </Button>

        <div
          onClick={() => refresh()}
          className={cn(
            "w-9 h-9 logo-round transition-all cursor-pointer",
            isRefreshing && "animate-spin"
          )}
          style={isRefreshing ? { animationDuration: '3s' } : undefined}
          title="Klik untuk memuat ulang data"
        >
          <span className="logo-text text-sm">SKJ</span>
        </div>

        {/* SSR-safe title: same markup on server and client */}
        <h1 className="font-semibold text-lg text-gray-800 truncate max-w-[140px] xs:max-w-[180px] sm:max-w-none">
          <span className="truncate inline-flex items-center gap-2" suppressHydrationWarning>
            {dbMode === 'demo' && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-amber-100 text-amber-800 border-amber-200">
                DEMO
              </span>
            )}
            <span className="sm:hidden">{getPageTitle()}</span>
            <span className="hidden sm:inline">
              {companyName} <span className="font-normal text-gray-500">- {getPageTitle()}</span>
            </span>
          </span>
        </h1>
      </div>

      <div className="flex items-center gap-0 xs:gap-1 sm:gap-2">

        {/* Notification Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-gray-500 hover:bg-gray-100 rounded-full">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-screen sm:w-[350px] p-0 mt-1">
            <DropdownMenuLabel className="px-4 py-3 border-b flex justify-between items-center bg-gray-50/50">
              <span>Notifikasi ({unreadCount})</span>
              {unreadCount > 0 && (
                <span
                  className="text-xs text-primary cursor-pointer hover:underline font-normal"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllNotifikasiRead();
                  }}
                >
                  Tandai semua dibaca
                </span>
              )}
            </DropdownMenuLabel>
            <div className="max-h-[60vh] overflow-y-auto">
              {recentNotifikasi.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center text-muted-foreground gap-2">
                  <Bell className="w-8 h-8 opacity-20" />
                  <span className="text-sm">Tidak ada notifikasi</span>
                </div>
              ) : (
                recentNotifikasi.map(n => (
                  <DropdownMenuItem
                    key={n.id}
                    className="px-4 py-3 border-b last:border-0 cursor-pointer items-start gap-3 transition-colors hover:bg-muted/50 focus:bg-muted/50"
                    onClick={() => handleNotifClick(n.id, n.link)}
                  >
                    <div className={`w-2.5 h-2.5 mt-1.5 rounded-full flex-shrink-0 ring-2 ring-white ${n.jenis === 'success' ? 'bg-green-500' :
                      n.jenis === 'error' ? 'bg-red-500' :
                        n.jenis === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm font-semibold leading-tight text-foreground">{n.judul}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                          {new Date(n.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {n.pesan}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            <div className="p-2 border-t bg-gray-50/50 text-center flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs flex-1 h-8 hover:bg-transparent text-primary"
                onClick={() => router.push('/notifikasi')}
              >
                Lihat Semua Notifikasi
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded-full transition-colors border border-transparent hover:border-gray-200 ml-1">
              <div className="relative">
                <Avatar className="w-8 h-8 bg-teal-600 border border-teal-700/20">
                  <AvatarFallback className="bg-teal-600 text-white text-xs font-semibold">
                    {user?.nama?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {/* Red Indicator if not fully ready (Offline, Loading, or Refreshing) */}
                {!isAppFullyReady && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
                  </span>
                )}
                {/* Active/Ready Indicator */}
                {isAppFullyReady && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm" />
                )}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium leading-none text-gray-700">
                  {isAuthLoading ? 'Memuat...' : (user?.nama || 'User')}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5">
                  {isAuthLoading ? 'Staff' : (user?.roles?.[0] || 'Staff')}
                </p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>Akun Saya</span>
                {!isAppReady && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] font-normal text-red-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      Sesi belum siap
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-[10px] text-blue-600 hover:text-blue-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        refresh();
                      }}
                    >
                      Coba Lagi
                    </Button>
                  </div>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profil')} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Keluar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status Indicator Dot */}
        <div
          className={cn(
            "w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm flex-shrink-0 ml-2 transition-colors duration-300",
            isAppFullyReady ? 'bg-green-500' : 'bg-red-500'
          )}
          title={
            isAppFullyReady 
              ? "Aplikasi Siap & Terhubung" 
              : !isOnline 
                ? "Terputus (Offline)" 
                : isRefreshing 
                  ? "Sedang Memuat Ulang Data..." 
                  : "Sesi Belum Siap"
          }
        />
      </div>
    </div>
  );
}
