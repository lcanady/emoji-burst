import { Press_Start_2P } from 'next/font/google';
import { Metadata } from 'next';
import './globals.css';

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Emoji Burst! - A Fun Match-3 Game',
  description: 'Match colorful emoji in this addictive puzzle game! Chain together matches for high scores in this fun, mobile-friendly game.',
  keywords: ['game', 'puzzle', 'match-3', 'emoji', 'mobile game', 'browser game'],
  authors: [{ name: 'Frames v2 Demo' }],
  openGraph: {
    title: 'Emoji Burst!',
    description: 'Match colorful emoji in this addictive puzzle game!',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Emoji Burst Game Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Emoji Burst!',
    description: 'Match colorful emoji in this addictive puzzle game!',
    images: ['/og-image.png'],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: '#1a1a1a',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={pressStart2P.className}>
      <body>
        <div className="root-container">
          {children}
        </div>
      </body>
    </html>
  );
}
