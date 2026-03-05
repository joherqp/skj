import './globals.css';
import { Providers } from '@/components/shared/providers';
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
        <html lang="en">
            <body className="antialiased">
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
