'use client';

// Khung riêng cho buyer đã đăng nhập: sidebar (desktop), thanh menu dưới (điện thoại 390px), header gọn.
// Guest hoặc role khác giữ khung công khai cũ; buyer chưa có hồ sơ công ty bị đưa tới onboarding.
import { BrandMark } from '../BrandMark';
import React, { useEffect, useState } from 'react';
import {
  Bell,
  Bot,
  Building2,
  Calculator,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Search,
  UserRound,
  Globe,
} from 'lucide-react';
import LanguageSelect from '../LanguageSelect';
import NotificationBell from '../NotificationBell';
import { PublicShell } from './PublicShell';
import { useDemoSession } from './useDemoSession';
import { useLanguage } from '../../context/LanguageContext';
import { Link, usePathname, useRouter } from '../../i18n/navigation';
import { logout } from '../../lib/demoAuth';
import { getMyCompany } from '../../lib/companyApi';

export const BUYER_NAV = [
  { href: '/buyer', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/suppliers', label: 'Tìm nhà cung cấp', icon: Search },
  { href: '/buyer/rfqs', label: 'Yêu cầu báo giá', icon: FileText },
  { href: '/buyer/messages', label: 'Tin nhắn', icon: MessageSquare },
  { href: '/buyer/notifications', label: 'Thông báo', icon: Bell },
  { href: '/buyer/profile', label: 'Hồ sơ công ty', icon: Building2 },
  { href: '/account', label: 'Tài khoản của tôi', icon: UserRound },
] as const;

const TOOLS = [
  { href: '/tools/tariff', label: 'Công cụ tính thuế', icon: Calculator },
  { href: '/tools/market-insights', label: 'Gợi ý thị trường EU', icon: Globe },
  { href: '/copilot', label: 'Trợ lý AI tuân thủ', icon: Bot },
] as const;

const isActive = (pathname: string, href: string) =>
  href === '/buyer' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

function Brand() {
  const { tr } = useLanguage();
  return (
    <Link href="/buyer" className="flex items-center gap-2.5 select-none">
      <BrandMark className="h-7 w-7" />
      <span className="leading-none">
        <span className="block text-lg font-bold uppercase tracking-wide text-[#0f172a]">{tr('VYBE TRADE')}</span>
        <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-teal-800">{tr('BUYER WORKSPACE')}</span>
      </span>
    </Link>
  );
}

export function BuyerShell({ children }: { children: React.ReactNode }) {
  const { tr } = useLanguage();
  const { user, ready } = useDemoSession();
  const pathname = usePathname();
  const router = useRouter();
  const [companyName, setCompanyName] = useState<string | null>(null);
  const buyer = ready && user?.role === 'buyer' ? user : null;

  useEffect(() => {
    if (buyer && !buyer.onboardingCompleted) router.replace('/buyer/onboarding');
  }, [buyer, router]);

  useEffect(() => {
    if (!buyer) return;
    let active = true;
    getMyCompany().then((c) => active && setCompanyName(c?.legal_name ?? null));
    return () => {
      active = false;
    };
  }, [buyer]);

  if (!ready) return null;
  if (!buyer) return <PublicShell>{children}</PublicShell>;
  if (!buyer.onboardingCompleted) return null;

  const handleLogout = () => {
    void logout();
    router.push('/login');
  };
  const displayName = companyName ?? buyer.company ?? buyer.email;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-['Plus_Jakarta_Sans',sans-serif] text-slate-900">
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-200/80 bg-white md:flex xl:w-72">
        <div className="p-5 sm:p-6">
          <div className="mb-8">
            <Brand />
          </div>
          <nav aria-label={tr('Menu buyer')} className="space-y-1.5">
            {BUYER_NAV.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${
                    active ? 'bg-[#e6f4f2] text-[#0d766e]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 stroke-[2] ${active ? 'text-[#0d766e]' : 'text-slate-500'}`} />
                  <span>{tr(label)}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-6">
            <p className="mb-2 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{tr('Công cụ tuân thủ')}</p>
            <div className="space-y-1.5">
              {TOOLS.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                  <Icon className="h-4 w-4 stroke-[2] text-slate-500" />
                  <span>{tr(label)}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="m-4 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-teal-50/40 p-4">
          <p className="truncate text-xs font-bold text-slate-900">{displayName}</p>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">{buyer.email}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-md">
          <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 sm:px-8">
            <div className="md:hidden">
              <Brand />
            </div>
            <div className="ml-auto flex items-center gap-2.5 sm:gap-3.5">
              <LanguageSelect />
              <NotificationBell />
              <button
                type="button"
                onClick={handleLogout}
                aria-label={tr('Đăng xuất')}
                className="flex h-9 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tr('Đăng xuất')}</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 pb-20 md:pb-0">{children}</div>

        <nav aria-label={tr('Menu buyer')} className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white md:hidden">
          {BUYER_NAV.filter((i) => i.href !== '/account').map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold ${active ? 'text-[#0d766e]' : 'text-slate-600'}`}
              >
                <Icon className="h-5 w-5" />
                <span className="max-w-full truncate">{tr(label)}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
