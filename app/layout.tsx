import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const hasValidClerkKey =
  typeof clerkPublishableKey === 'string' &&
  (clerkPublishableKey.startsWith('pk_test_') || clerkPublishableKey.startsWith('pk_live_')) &&
  clerkPublishableKey.length > 20 &&
  !clerkPublishableKey.includes('placeholder');

export const metadata: Metadata = {
  title: {
    default: 'Bomberman Online',
    template: '%s | Bomberman Online',
  },
  description:
    'A multiplayer Bomberman game with SNES-style graphics. Battle friends online, climb the leaderboards, and become the ultimate bomber!',
  keywords: ['bomberman', 'multiplayer', 'game', 'retro', 'SNES', 'online'],
  authors: [{ name: 'Bomberman Online Team' }],
  creator: 'Bomberman Online',
  publisher: 'Bomberman Online',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://bomberman.online',
    title: 'Bomberman Online',
    description: 'Battle friends online in this classic SNES-style Bomberman game!',
    siteName: 'Bomberman Online',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bomberman Online',
    description: 'Battle friends online in this classic SNES-style Bomberman game!',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1a1a2e',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appShell = (
    <html lang="en" className="dark">
      <head>
        {/* Pixel fonts from Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&family=Orbitron:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-retro-dark text-white antialiased">{children}</body>
    </html>
  );

  if (!hasValidClerkKey) {
    return appShell;
  }

  return <ClerkProvider publishableKey={clerkPublishableKey}>{appShell}</ClerkProvider>;
}
