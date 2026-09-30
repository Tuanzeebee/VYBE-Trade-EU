// Ánh xạ các "trang" của app/page.tsx cũ (điều hướng bằng state) sang route thật dưới app/[locale]/.
// Đường dẫn trả về chưa gắn locale — router của next-intl (i18n/navigation.ts) tự thêm.
import { DEFAULT_SELLER_DETAIL } from '../components/BuyerSellerDetail';
import { getUserPage, type DemoUser } from './demoAuth';

export type LegacyPage =
  | 'home'
  | 'product'
  | 'onboarding'
  | 'seller-profile'
  | 'workspace'
  | 'buyer-directory'
  | 'buyer-seller-detail'
  | 'pricing'
  | 'solutions'
  | 'about'
  | 'login'
  | 'register'
  | 'admin';

export type DirectoryNav = 'suppliers' | 'buyer';

export interface DirectoryQuery {
  q: string;
  category: string | null;
  market: string;
  level: string;
  nav: DirectoryNav;
}

export const DEFAULT_MARKET = 'Tất cả thị trường';
export const DEFAULT_LEVEL = 'all';

// Mỗi mục của workspace exporter là một trang riêng. overview nằm ở gốc /exporter.
const WORKSPACE_PATHS: Record<string, string> = {
  overview: '/exporter',
  profile: '/exporter/company',
  products: '/exporter/products',
  licenses: '/exporter/certificates',
  verification: '/exporter/verification',
  rfq: '/exporter/rfqs',
  messages: '/exporter/messages',
  notifications: '/exporter/notifications',
  viewers: '/exporter/profile-views',
};

export const PROTECTED_PAGES: LegacyPage[] = ['workspace', 'onboarding', 'seller-profile', 'admin'];

/** Giữ nguyên quy tắc setCurrentPage của app/page.tsx cũ: trang được phép hiển thị cho user này. */
export function resolvePage(page: LegacyPage, user: DemoUser | null): LegacyPage {
  if (PROTECTED_PAGES.includes(page) && !user) return 'login';
  if (!user) return page;
  const home = getUserPage(user);
  if (home === 'onboarding') return 'onboarding';
  if (
    page === 'onboarding' ||
    ((page === 'workspace' || page === 'seller-profile') && user.role !== 'seller') ||
    (page === 'admin' && user.role !== 'admin')
  ) {
    return home;
  }
  return page;
}

interface HrefOptions {
  user?: DemoUser | null;
  supplierId?: string;
  rfq?: boolean;
  directory?: Partial<DirectoryQuery>;
  tab?: string;
  /** Bước của form hồ sơ seller cần mở (1 = công ty, 2 = sản phẩm, 3 = giấy phép). */
  step?: number;
  productService?: 'ai-trust' | 'verification';
}

function withQuery(path: string, params: Record<string, string | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function hrefFor(page: LegacyPage, options: HrefOptions = {}): string {
  switch (page) {
    case 'home':
      return '/';
    case 'product':
      return options.productService === 'verification' ? '/products/verification' : '/products';
    case 'onboarding':
      return options.user?.role === 'buyer' ? '/buyer/onboarding' : '/exporter/onboarding';
    case 'seller-profile':
      return withQuery('/exporter/profile', { step: options.step ? String(options.step) : null });
    case 'workspace':
      return options.tab && WORKSPACE_PATHS[options.tab] ? WORKSPACE_PATHS[options.tab] : '/exporter';
    case 'buyer-directory': {
      const d = options.directory ?? {};
      return withQuery('/suppliers', {
        q: d.q,
        category: d.category,
        market: d.market === DEFAULT_MARKET ? null : d.market,
        level: d.level === DEFAULT_LEVEL ? null : d.level,
        nav: d.nav === 'buyer' ? 'buyer' : null,
      });
    }
    case 'buyer-seller-detail':
      return withQuery(`/suppliers/${encodeURIComponent(options.supplierId ?? DEFAULT_SELLER_DETAIL.id)}`, {
        rfq: options.rfq ? '1' : null,
      });
    default:
      return `/${page}`;
  }
}

export function parseDirectoryQuery(params: URLSearchParams) {
  return {
    initialSearchTerm: params.get('q') ?? '',
    initialCategory: params.get('category'),
    initialMarket: params.get('market') ?? DEFAULT_MARKET,
    initialLevel: params.get('level') ?? DEFAULT_LEVEL,
    nav: (params.get('nav') === 'buyer' ? 'buyer' : 'suppliers') as DirectoryNav,
  };
}

/** Ngược của hrefFor — Header dùng để tô sáng mục đang xem. */
export function pageForPath(pathname: string): LegacyPage {
  const [first = '', second] = pathname.split('/').filter(Boolean);
  switch (first) {
    case '':
      return 'home';
    case 'suppliers':
      return second ? 'buyer-seller-detail' : 'buyer-directory';
    case 'products':
      return 'product';
    case 'exporter':
      if (second === 'onboarding') return 'onboarding';
      return second === 'profile' ? 'seller-profile' : 'workspace';
    case 'buyer':
      return second === 'onboarding' ? 'onboarding' : 'buyer-directory';
    case 'solutions':
    case 'about':
    case 'pricing':
    case 'login':
    case 'register':
    case 'admin':
      return first;
    default:
      return 'home';
  }
}

/** /register?type=buyer|exporter chọn sẵn vai trò; giá trị khác (kể cả admin) bỏ qua. */
export function roleFromType(type: string | null | undefined): 'buyer' | 'seller' | undefined {
  if (type === 'exporter' || type === 'seller') return 'seller';
  if (type === 'buyer') return 'buyer';
  return undefined;
}
