import App from '@/app/app';
import { Chivo } from 'next/font/google';
import type { Metadata } from 'next';
import '../styles/globals.css';
import { PreloadResources } from '@/app/preload-resources';

const chivo = Chivo({
  weight: ['400', '600'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Async Classic Art Editor',
  description: 'Async Classic Art Editor',
  icons: {
    icon: [
      { url: '/logo/favicon.ico' },
      { url: '/logo/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={chivo.className}>
      <PreloadResources />
      <body>
        <App children={children} />
      </body>
    </html>
  );
}
