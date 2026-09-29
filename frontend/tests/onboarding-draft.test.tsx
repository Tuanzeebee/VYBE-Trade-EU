import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SellerOnboarding from '@/components/SellerOnboarding';
import { WorkspaceRoute } from '@/components/routes/AccountRoutes';
import { LanguageProvider } from '@/context/LanguageContext';
import type { DemoUser } from '@/lib/demoAuth';
import { emptyDraft, type ProductDraft } from '@/lib/productsApi';

const nav = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => window.location.pathname,
  useRouter: () => ({ push: nav.push, replace: nav.replace, prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const ACCOUNT: DemoUser = {
  id: 'u-1', name: 'Nguyễn A', email: 'a@congtya.vn', company: 'Công ty A', role: 'seller', onboardingCompleted: false,
};
const RICE = { code: '100630', formatted: '1006.30', name_vi: 'Gạo xát', name_en: 'Semi-milled or wholly milled rice' };
const product: ProductDraft = { ...emptyDraft(), name: 'Gạo thơm', hs: RICE, priceMin: '480', priceMax: '560' };

function renderWizard(props: Partial<React.ComponentProps<typeof SellerOnboarding>>) {
  render(
    <NextIntlClientProvider locale="vi" messages={{}}>
      <LanguageProvider>
        <SellerOnboarding account={ACCOUNT} onLogout={vi.fn()} onNavigateHome={vi.fn()} {...props} />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

// Gửi form trực tiếp: các ô bắt buộc khác của bước 1 không liên quan tới việc lưu nháp.
const submitStepOne = () => {
  const taxInput = screen.getByPlaceholderText('Nhập mã số thuế');
  fireEvent.change(taxInput, { target: { value: '0312345678' } });
  fireEvent.submit(taxInput.closest('form')!);
};

describe('A2 — wizard lưu nháp từng bước', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    nav.replace.mockReset();
  });

  it('bước 1: bấm Tiếp tục lưu công ty lên server rồi mới sang bước 2', async () => {
    const onSaveCompany = vi.fn().mockResolvedValue(undefined);
    renderWizard({ initialStep: 1, onSaveCompany });
    submitStepOne();
    await screen.findByRole('button', { name: /Thêm sản phẩm/ });
    expect(onSaveCompany).toHaveBeenCalledTimes(1);
    expect(onSaveCompany.mock.calls[0][0]).toMatchObject({ companyName: 'Công ty A', taxCode: '0312345678' });
  });

  it('bước 1: lưu lỗi thì ở lại bước 1 và báo lỗi', async () => {
    const onSaveCompany = vi.fn().mockRejectedValue(new Error('Không kết nối được máy chủ. Vui lòng thử lại.'));
    renderWizard({ initialStep: 1, onSaveCompany });
    submitStepOne();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không kết nối được máy chủ');
    expect(screen.queryByRole('button', { name: /Thêm sản phẩm/ })).not.toBeInTheDocument();
  });

  it('bước 2: bấm Tiếp tục lưu sản phẩm lên server rồi mới sang bước 3', async () => {
    const onSaveProducts = vi.fn().mockResolvedValue(undefined);
    renderWizard({ initialStep: 2, initialProducts: [product], onSaveProducts });
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục \(Tải lên giấy phép\)/ }));
    await waitFor(() => expect(onSaveProducts).toHaveBeenCalledTimes(1));
    expect(onSaveProducts.mock.calls[0][0]).toHaveLength(1);
    expect(await screen.findByText(/Tải lên giấy phép & chứng nhận/)).toBeInTheDocument();
  });

  it('bước 2: sản phẩm chưa hợp lệ thì không gọi server', () => {
    const onSaveProducts = vi.fn();
    renderWizard({ initialStep: 2, initialProducts: [], onSaveProducts });
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục \(Tải lên giấy phép\)/ }));
    expect(onSaveProducts).not.toHaveBeenCalled();
  });

  it('bước 3 là bằng chứng thật (C6): có form nộp, không còn giấy phép/chứng chỉ mẫu hay OCR', async () => {
    renderWizard({ initialStep: 3 });
    expect(await screen.findByRole('button', { name: 'Nộp bằng chứng' })).toBeInTheDocument();
    for (const fake of [/HACCP Codex/, /ISO 22000/, /OCR/, /L2 Enhanced/, /0314892345/]) {
      expect(screen.queryByText(fake)).not.toBeInTheDocument();
    }
  });
});

describe('A2 — tài khoản exporter chưa có công ty luôn bị đưa tới wizard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    nav.replace.mockReset();
  });

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  function openWorkspace(company: unknown) {
    localStorage.setItem('vybe_profiles_v2', JSON.stringify({ 'u-1': { onboardingCompleted: true, onboardingVersion: 2 } }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async (req: Request) => {
        const path = new URL(req.url).pathname;
        if (path === '/api/me') return json(200, { id: 'u-1', email: 'a@x.vn', role: 'exporter', preferred_language: 'vi' });
        if (path === '/api/me/company') return company ? json(200, company) : json(404, {});
        return json(404, {});
      }),
    );
    window.history.replaceState(null, '', '/vi/exporter');
    render(
      <NextIntlClientProvider locale="vi" messages={{}}>
        <LanguageProvider><WorkspaceRoute /></LanguageProvider>
      </NextIntlClientProvider>,
    );
  }

  it('chưa có công ty trên server → chuyển tới /exporter/profile?step=1', async () => {
    openWorkspace(null);
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith(expect.stringMatching(/\/exporter\/profile\?step=1$/)));
  });

  it('đã có công ty → ở lại workspace, không chuyển hướng', async () => {
    openWorkspace({ id: 'c-1', legal_name: 'Công ty B' });
    await screen.findAllByText(/Hồ sơ/);
    await new Promise((r) => setTimeout(r, 50));
    expect(nav.replace).not.toHaveBeenCalled();
  });
});
