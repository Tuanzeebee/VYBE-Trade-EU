import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-jakarta',
});

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
    <html lang="vi" className={jakarta.variable}>
      <body className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-600 selection:text-white antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
