import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'VYBE TRADE - Nền tảng B2B Tin cậy & Xác minh Nhà cung cấp Việt Nam',
  description: 'Nền tảng B2B với lớp xác minh tin cậy đa tầng L1 - L2 - L3, giúp buyer quốc tế tìm kiếm và hợp tác an toàn với các nhà cung cấp Việt Nam uy tín.',
  keywords: ['B2B', 'Vietnam exporters', 'Nông sản', 'Thủy sản', 'Xác minh nhà cung ứng', 'VYBE TRADE'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="min-h-screen bg-[#f8fafc] text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-blue-600 selection:text-white antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
