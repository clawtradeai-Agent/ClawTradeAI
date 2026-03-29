import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from '../components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ClawTrade AI - Autonomous Intelligence for On-Chain Trading',
  description: 'Multi-agent AI trading platform on Solana. Scan, analyze, and execute trades automatically.',
  keywords: ['solana', 'trading', 'ai', 'defi', 'crypto', 'jupiter'],
  metadataBase: new URL('https://clawtradeai.xyz'),
  openGraph: {
    title: 'ClawTrade AI - Autonomous Intelligence for On-Chain Trading',
    description: 'Multi-agent AI trading platform on Solana',
    url: 'https://clawtradeai.xyz',
    siteName: 'ClawTrade AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClawTrade AI',
    description: 'Multi-agent AI trading platform on Solana',
    creator: '@ClawtradeAISol',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-dark-950">
            <Navbar />
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
