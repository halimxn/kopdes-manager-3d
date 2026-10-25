import type { Metadata, Viewport } from 'next';
import './globals.css';
import { themeBootScript } from '@/lib/theme';

export const metadata: Metadata = {
  title: { default: 'Kopdes Manager', template: '%s · Kopdes Manager' },
  description: 'Ruang kerja manajer koperasi: tugas, proyek, agenda, dan pencatatan usaha.',
};
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ebeae4' },
    { media: '(prefers-color-scheme: dark)', color: '#121310' },
  ],
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" data-theme="light" data-accent="sage" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
