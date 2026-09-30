import { describe, expect, it } from 'vitest';
import type { DemoUser } from '@/lib/demoAuth';
import {
  hrefFor,
  pageForPath,
  parseDirectoryQuery,
  resolvePage,
  roleFromType,
  type LegacyPage,
} from '@/lib/legacyNav';

const user = (role: DemoUser['role'], onboarded = true): DemoUser => ({
  id: `u-${role}`,
  name: 'N',
  email: `${role}@x.vn`,
  company: 'C',
  role,
  onboardingCompleted: onboarded,
  onboardingVersion: onboarded ? 2 : undefined,
});

describe('resolvePage — giữ nguyên logic setCurrentPage của app/page.tsx cũ', () => {
  it.each<LegacyPage>(['workspace', 'onboarding', 'seller-profile', 'admin'])(
    'khách vào trang cần đăng nhập %s → login',
    (page) => expect(resolvePage(page, null)).toBe('login'),
  );

  it.each<LegacyPage>(['home', 'buyer-directory', 'pricing', 'about', 'login'])(
    'khách vào trang công khai %s → giữ nguyên',
    (page) => expect(resolvePage(page, null)).toBe(page),
  );

  it('người dùng chưa onboarding luôn bị đưa về onboarding', () => {
    expect(resolvePage('home', user('seller', false))).toBe('onboarding');
    expect(resolvePage('buyer-directory', user('buyer', false))).toBe('onboarding');
  });

  it('buyer vào khu seller hoặc admin → trang của buyer', () => {
    expect(resolvePage('workspace', user('buyer'))).toBe('buyer-directory');
    expect(resolvePage('seller-profile', user('buyer'))).toBe('buyer-directory');
    expect(resolvePage('admin', user('buyer'))).toBe('buyer-directory');
  });

  it('seller vào admin → workspace; seller đã onboarding vào onboarding → workspace', () => {
    expect(resolvePage('admin', user('seller'))).toBe('workspace');
    expect(resolvePage('onboarding', user('seller'))).toBe('workspace');
  });

  it('admin vào admin → giữ nguyên; admin vào workspace → admin', () => {
    expect(resolvePage('admin', user('admin'))).toBe('admin');
    expect(resolvePage('workspace', user('admin'))).toBe('admin');
  });
});

describe('hrefFor — mỗi trang cũ có một URL (chưa gắn locale)', () => {
  it.each<[LegacyPage, string]>([
    ['home', '/'],
    ['solutions', '/solutions'],
    ['about', '/about'],
    ['pricing', '/pricing'],
    ['product', '/products'],
    ['buyer-directory', '/suppliers'],
    ['login', '/login'],
    ['register', '/register'],
    ['seller-profile', '/exporter/profile'],
    ['workspace', '/exporter'],
    ['admin', '/admin'],
  ])('%s → %s', (page, href) => expect(hrefFor(page)).toBe(href));

  it('onboarding theo vai trò', () => {
    expect(hrefFor('onboarding', { user: user('seller', false) })).toBe('/exporter/onboarding');
    expect(hrefFor('onboarding', { user: user('buyer', false) })).toBe('/buyer/onboarding');
  });

  it('chi tiết nhà cung cấp theo id, có cờ mở RFQ', () => {
    expect(hrefFor('buyer-seller-detail', { supplierId: 'viet-agri' })).toBe('/suppliers/viet-agri');
    expect(hrefFor('buyer-seller-detail', { supplierId: 'a b', rfq: true })).toBe('/suppliers/a%20b?rfq=1');
  });

  it('danh bạ mang bộ lọc từ trang chủ qua query, bỏ giá trị mặc định', () => {
    expect(
      hrefFor('buyer-directory', {
        directory: { q: 'gạo', category: 'agriculture', market: 'EU', level: 'L2', nav: 'buyer' },
      }),
    ).toBe('/suppliers?q=g%E1%BA%A1o&category=agriculture&market=EU&level=L2&nav=buyer');
    expect(
      hrefFor('buyer-directory', {
        directory: { q: '', category: null, market: 'Tất cả thị trường', level: 'all', nav: 'suppliers' },
      }),
    ).toBe('/suppliers');
  });

  it('hồ sơ seller mở đúng bước cần bổ sung (?step=)', () => {
    expect(hrefFor('seller-profile', { step: 2 })).toBe('/exporter/profile?step=2');
    expect(hrefFor('seller-profile', { step: 1 })).toBe('/exporter/profile?step=1');
    expect(hrefFor('seller-profile')).toBe('/exporter/profile');
  });

  it.each([
    [undefined, '/exporter'],
    ['overview', '/exporter'],
    ['profile', '/exporter/company'],
    ['products', '/exporter/products'],
    ['licenses', '/exporter/certificates'],
    ['verification', '/exporter/verification'],
    ['messages', '/exporter/messages'],
    ['notifications', '/exporter/notifications'],
  ])('mục workspace exporter %s là một trang riêng %s', (tab, href) => {
    expect(hrefFor('workspace', { tab })).toBe(href);
  });

  it('workspace giữ tab, sản phẩm chọn dịch vụ xác minh', () => {
    expect(hrefFor('workspace', { tab: 'rfq' })).toBe('/exporter/rfqs');
    expect(hrefFor('product', { productService: 'verification' })).toBe('/products/verification');
  });
});

describe('parseDirectoryQuery', () => {
  it('không có query → mặc định như app/page.tsx cũ', () => {
    expect(parseDirectoryQuery(new URLSearchParams(''))).toEqual({
      initialSearchTerm: '',
      initialCategory: null,
      initialMarket: 'Tất cả thị trường',
      initialLevel: 'all',
      nav: 'suppliers',
    });
  });

  it('đọc lại đúng bộ lọc đã gửi', () => {
    expect(parseDirectoryQuery(new URLSearchParams('q=rice&category=food&market=EU&level=L3&nav=buyer'))).toEqual({
      initialSearchTerm: 'rice',
      initialCategory: 'food',
      initialMarket: 'EU',
      initialLevel: 'L3',
      nav: 'buyer',
    });
  });
});

describe('pageForPath — Header tô sáng đúng mục', () => {
  it.each<[string, LegacyPage]>([
    ['/', 'home'],
    ['/suppliers', 'buyer-directory'],
    ['/suppliers/viet-agri', 'buyer-seller-detail'],
    ['/products', 'product'],
    ['/products/verification', 'product'],
    ['/pricing', 'pricing'],
    ['/solutions', 'solutions'],
    ['/about', 'about'],
    ['/admin', 'admin'],
    ['/exporter', 'workspace'],
    ['/exporter/profile', 'seller-profile'],
    ['/exporter/onboarding', 'onboarding'],
    ['/buyer/onboarding', 'onboarding'],
    ['/login', 'login'],
    ['/register', 'register'],
  ])('%s → %s', (path, page) => expect(pageForPath(path)).toBe(page));
});

describe('roleFromType — /register?type= chọn sẵn vai trò', () => {
  it.each([
    ['exporter', 'seller'],
    ['seller', 'seller'],
    ['buyer', 'buyer'],
    ['admin', undefined],
    [null, undefined],
  ] as const)('%s → %s', (type, role) => expect(roleFromType(type)).toBe(role));
});
