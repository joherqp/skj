'use client';
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";

import { ConnectionIndicator } from "@/components/shared/ConnectionIndicator";

import { LocationTracker } from '@/components/features/components/LocationTracker';
import { useAuth } from "@/contexts/AuthContext";

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export const MainLayout = ({ children, title, className }: MainLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (!isLoading && !isAuthenticated) return null;

  return (
    <div className="flex min-h-screen w-full bg-gray-50 overflow-x-hidden">
      {mounted && isLoading && isAuthenticated && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[70] rounded-full bg-amber-100 text-amber-900 px-3 py-1 text-xs shadow">
          Memeriksa sesi...
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
          <BottomNav onMenuClick={() => setIsSidebarOpen(true)} />
        </div>
      </div>
    </div>
  );
};
