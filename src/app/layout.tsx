import './globals.css';
import { Providers } from '@/components/shared/providers';
import { HydrationBoundary } from '@/components/shared/HydrationBoundary';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
    title: 'CVSKJ - Sales & Distribution',
    description: 'Management System for CVSKJ',
    manifest: '/manifest.webmanifest',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'CVSKJ',
    },
    other: {
        google: 'notranslate',
    },
};

export const viewport: Viewport = {
    themeColor: '#0f172a',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" translate="no">
            <body className="antialiased">
                <HydrationBoundary>
                    <Providers>
                        {children}
                    </Providers>
                </HydrationBoundary>
            </body>
        </html>
    );
}
