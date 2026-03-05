'use client';

import { AuthProvider } from "@/contexts/AuthContext";
import { DatabaseProvider } from "@/contexts/DatabaseContext";
import { Toaster } from "@/components/ui/sonner";
import { APIProvider } from "@vis.gl/react-google-maps";
import { PwaManager } from "./PwaManager";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
            <AuthProvider>
                <DatabaseProvider>
                    {children}
                    <PwaManager />
                    <Toaster position="top-center" richColors />
                </DatabaseProvider>
            </AuthProvider>
        </APIProvider>
    );
}
