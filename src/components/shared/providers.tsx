'use client';

import { AuthProvider } from "@/contexts/AuthContext";
import { DatabaseProvider } from "@/contexts/DatabaseContext";
import { Toaster } from "@/components/ui/sonner";

import { PwaManager } from "./PwaManager";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <DatabaseProvider>
                {children}
                <PwaManager />
                <Toaster position="top-center" richColors />
            </DatabaseProvider>
        </AuthProvider>
    );
}
