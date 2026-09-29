import { act, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGES, LanguageProvider, useLanguage } from '@/context/LanguageContext';

const replace = vi.fn();

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => window.location.pathname,
  useRouter: () => ({ push: vi.fn(), replace, prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

let api: ReturnType<typeof useLanguage> | undefined;

function Probe() {
  api = useLanguage();
  return <p>{api.tr('Tất cả thị trường')}</p>;
}

function renderWith(locale: 'vi' | 'en') {
  return render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

describe('LanguageContext nối với next-intl', () => {
  beforeEach(() => {
    replace.mockClear();
    api = undefined;
  });

  it('chỉ còn hai ngôn ngữ vi và en (ngôn ngữ thứ 3 là P2)', () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(['vi', 'en']);
  });

  it('ngôn ngữ lấy từ locale của URL, tr() dịch theo catalog cũ', () => {
    renderWith('en');
    expect(api?.language).toBe('en');
    expect(screen.getByText('All markets')).toBeInTheDocument();
  });

  it('người đã đăng nhập: đổi ngôn ngữ lưu preferred_language lên server', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/en/suppliers');
    renderWith('en');
    act(() => api?.setLanguage('vi'));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const request = fetchMock.mock.calls[0] as unknown as [Request];
    expect(request[0].method).toBe('PATCH');
    expect(new URL(request[0].url).pathname).toBe('/api/me');
    expect(await request[0].json()).toEqual({ preferred_language: 'vi' });
    vi.unstubAllGlobals();
  });

  it('khách (401) hoặc lỗi mạng khi lưu ngôn ngữ không làm hỏng việc đổi ngôn ngữ', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))));
    window.history.replaceState(null, '', '/en/suppliers');
    renderWith('en');
    act(() => api?.setLanguage('vi'));
    expect(replace).toHaveBeenCalled();
    await Promise.resolve();
    vi.unstubAllGlobals();
  });

  it('đổi ngôn ngữ chuyển sang route của locale kia, giữ đường dẫn và query', () => {
    window.history.replaceState(null, '', '/en/suppliers?q=rice');
    renderWith('en');
    act(() => api?.setLanguage('vi'));
    expect(replace).toHaveBeenCalledWith('/vi/suppliers?q=rice');
  });
});
