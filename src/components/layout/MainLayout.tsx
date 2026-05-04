'use client';
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter, notFound } from "next/navigation";

import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { ConnectionIndicator } from "@/components/shared/ConnectionIndicator";
import { LocationTracker } from '@/components/features/components/LocationTracker';
import { useAuth } from "@/contexts/AuthContext";
import { useDatabase } from "@/contexts/DatabaseContext";
import { canAccessPath } from "@/lib/permissions";

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
}

const PREFETCH_ROUTES = [
  '/beranda',
  '/barang',
  '/pelanggan',
  '/penjualan',
  '/setoran',
  '/laporan',
  '/persetujuan',
  '/monitoring',
];

export const MainLayout = ({ children, className }: MainLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isLoading: isDbLoading, isInitialized: isDbInitialized } = useDatabase();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (!isAuthLoading && !isAuthenticated && pathname !== '/login') {
      const searchParams = new URLSearchParams();
      searchParams.set('redirectTo', pathname);
      router.replace(`/login?${searchParams.toString()}`);
    }
  }, [isAuthenticated, isAuthLoading, pathname, router, mounted]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const timeoutId = window.setTimeout(() => {
      PREFETCH_ROUTES.forEach((route) => {
        router.prefetch(route);
      });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [isAuthenticated, router]);

  // Check role-based access
  const isAuthorized = !isAuthenticated || canAccessPath(pathname, user?.roles || []);

  if (!isAuthLoading && !isAuthenticated && pathname !== '/login') return null;
  if (mounted && isAuthenticated && !isAuthorized) {
    notFound();
  }

  const showLoading = isAuthLoading || (isAuthenticated && isDbLoading && !isDbInitialized);

  return (
    <div className="flex min-h-screen w-full bg-gray-50 overflow-x-hidden">
      {mounted && showLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
          <p className="text-sm font-medium text-gray-600 animate-pulse">
            {isAuthLoading ? 'Memeriksa sesi...' : 'Memuat data...'}
          </p>
        </div>
      )}
      <LocationTracker />
      <ConnectionIndicator />

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="p-0 border-none w-[280px] sm:w-[320px] bg-transparent shadow-none">
          <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
          <Sidebar onClose={() => setIsSidebarOpen(false)} className="rounded-r-2xl h-full shadow-2xl" />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar (Fixed) */}
      <aside className={`hidden ${isDesktopCollapsed ? 'w-20' : 'w-64'} border-r bg-[#1a202c] lg:block fixed h-full z-30 transition-all duration-300`}>
        <Sidebar className="h-full border-r" isCollapsed={isDesktopCollapsed} />
      </aside>

      <div className={`flex flex-1 flex-col w-full transition-all duration-300 ${isDesktopCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>

        {/* Unified Header */}
        <Header
          onMenuClick={() => setIsSidebarOpen(true)}
          isDesktop={true}
          isSidebarCollapsed={isDesktopCollapsed}
          onSidebarToggle={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
        />

        {/* Main Content */}
        <main className={cn("flex-1 p-4 pt-20 pb-24 lg:pb-6 lg:p-6 lg:pt-20", className)}>
          {children}
        </main>

        {/* Mobile Bottom Nav (Hidden on Desktop) */}
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  );
};
