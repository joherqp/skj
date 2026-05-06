'use client';

import { AuthProvider } from "@/contexts/AuthContext";
import { DatabaseProvider } from "@/contexts/DatabaseContext";
import { Toaster } from "@/components/ui/sonner";

import { PwaManager } from "./PwaManager";

import { QueryProvider } from "./QueryProvider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <QueryProvider>
            <AuthProvider>
                <DatabaseProvider>
                    {children}
                    <PwaManager />
                    <Toaster position="top-center" richColors />
                </DatabaseProvider>
            </AuthProvider>
        </QueryProvider>
    );
}
