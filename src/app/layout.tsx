import type { Metadata } from 'next';
import '@fontsource-variable/manrope';
import './globals.css';
import '../styles/token.css';
import '../styles/dasar.css';
import '../styles/komponen.css';
import '../styles/kerangka.css';
import '../styles/halaman.css';
export const metadata: Metadata = {
  title: 'Dunia Koperasi · Ruang kerja',
  description: 'Ruang kerja pribadi manajer koperasi: rencana, koordinasi, kesiapan, dan laporan.',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('hub-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.classList.remove('dark');document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';}var c=localStorage.getItem('hub-color-style')||'sky';document.documentElement.setAttribute('data-theme-color',c);}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
