import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SellerWorkspace from '@/components/SellerWorkspace';
import { LanguageProvider } from '@/context/LanguageContext';
import type { DemoUser } from '@/lib/demoAuth';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const ACCOUNT: DemoUser = {
  id: 'u-1',
  name: 'Nguyễn A',
  email: 'a@congtya.vn',
  company: 'Công ty A',
  role: 'seller',
  onboardingCompleted: true,
  onboardingVersion: 2,
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function serve() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      if (path === '/api/me/company/completeness') {
        return json(200, {
          score: '55.00',
          missing: [
            { field: 'description_en', group: 'intro', weight: '10.00' },
            { field: 'product_hs', group: 'products', weight: '10.00' },
          ],
        });
      }
      if (path === '/api/exporter/products') return json(200, []);
      throw new Error(`unexpected ${path}`);
    }),
  );
}

function renderWorkspace(tab: 'profile' | 'products', onNavigateOnboarding = vi.fn()) {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <SellerWorkspace
          account={ACCOUNT}
          initialTab={tab}
          onLogout={vi.fn()}
          onNavigateHome={vi.fn()}
          onNavigateOnboarding={onNavigateOnboarding}
        />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
  return { onNavigateOnboarding };
}

describe('SellerWorkspace — mức độ hoàn thiện hồ sơ (B3)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('tab Hồ sơ hiện phần trăm và việc cần bổ sung từ server', async () => {
    serve();
    renderWorkspace('profile');
    expect(await screen.findByText('55% hoàn thiện')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mô tả tiếng Anh (≥ 150 ký tự)' })).toBeInTheDocument();
  });

  it('bấm một việc còn thiếu mở form hồ sơ đúng bước (không truyền nhầm sự kiện chuột)', async () => {
    serve();
    const { onNavigateOnboarding } = renderWorkspace('profile');
    fireEvent.click(await screen.findByRole('button', { name: /Mô tả tiếng Anh/ }));
    fireEvent.click(screen.getByRole('button', { name: /Sản phẩm kèm mã HS/ }));
    expect(onNavigateOnboarding.mock.calls).toEqual([[1], [2]]);
  });

  it('nút "Thêm sản phẩm mới" ở tab Sản phẩm không truyền sự kiện chuột làm số bước', async () => {
    serve();
    const { onNavigateOnboarding } = renderWorkspace('products');
    fireEvent.click(await screen.findByRole('button', { name: /Thêm sản phẩm mới/ }));
    expect(onNavigateOnboarding).toHaveBeenCalledTimes(1);
    expect(onNavigateOnboarding.mock.calls[0]).toEqual([]);
  });

  it('thẻ hoàn thiện chỉ nằm ở tab Hồ sơ', async () => {
    serve();
    renderWorkspace('products');
    await screen.findByRole('button', { name: /Thêm sản phẩm mới/ });
    expect(screen.queryByText(/% hoàn thiện/)).not.toBeInTheDocument();
  });
});
