import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthPage from '@/components/AuthPage';
import { LanguageProvider } from '@/context/LanguageContext';

const registerMock = vi.fn();

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/register',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/demoAuth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/demoAuth')>()),
  register: (...args: unknown[]) => registerMock(...args),
}));

function renderAuth(mode: 'login' | 'register', initialRole?: 'buyer' | 'seller', locale: 'vi' | 'en' = 'vi') {
  const onAuthenticated = vi.fn();
  render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <LanguageProvider>
        <AuthPage
          mode={mode}
          initialRole={initialRole}
          onModeChange={vi.fn()}
          onAuthenticated={onAuthenticated}
          onNavigateHome={vi.fn()}
        />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
  return { onAuthenticated };
}

const field = (name: RegExp) => screen.getByLabelText(name) as HTMLInputElement;

describe('AuthPage với đăng nhập thật', () => {
  beforeEach(() => registerMock.mockReset());

  it('?type=exporter → vai trò Seller được chọn sẵn', () => {
    renderAuth('register', 'seller');
    expect((screen.getByRole('radio', { name: /Seller/ }) as HTMLInputElement).checked).toBe(true);
  });

  it('mặc định chọn Buyer như bản cũ', () => {
    renderAuth('register');
    expect((screen.getByRole('radio', { name: /Buyer/ }) as HTMLInputElement).checked).toBe(true);
  });

  it('mật khẩu tối thiểu 10 ký tự ở cả hai ô', () => {
    renderAuth('register');
    expect(field(/^Mật khẩu$/).minLength).toBe(10);
    expect(field(/Xác nhận mật khẩu/).minLength).toBe(10);
  });

  it('có ô số điện thoại và ô đồng ý điều khoản bắt buộc', () => {
    renderAuth('register');
    expect(field(/Số điện thoại/).type).toBe('tel');
    expect(screen.getByRole('checkbox', { name: /Điều khoản sử dụng/ })).toBeRequired();
  });

  it('trang đăng nhập không còn tài khoản demo', () => {
    renderAuth('login');
    expect(screen.queryByText(/Tài khoản trải nghiệm/)).not.toBeInTheDocument();
  });

  it('gửi đăng ký kèm consent, điện thoại, ngôn ngữ giao diện', async () => {
    registerMock.mockResolvedValue({ id: 'u-1' });
    const { onAuthenticated } = renderAuth('register', 'seller', 'en');
    fireEvent.change(field(/Full name|Họ và tên/), { target: { value: 'Nguyễn A' } });
    fireEvent.change(field(/Business name|Tên doanh nghiệp/), { target: { value: 'Công ty A' } });
    fireEvent.change(field(/Email/), { target: { value: 'a@x.vn' } });
    fireEvent.change(field(/Phone number|Số điện thoại/), { target: { value: '+84901234567' } });
    fireEvent.change(field(/^(Password|Mật khẩu)$/), { target: { value: 'mat-khau-du-dai' } });
    fireEvent.change(field(/Confirm password|Xác nhận mật khẩu/), { target: { value: 'mat-khau-du-dai' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.submit(screen.getByRole('checkbox').closest('form')!);
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalled());
    expect(registerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'seller',
        phone: '+84901234567',
        acceptTerms: true,
        language: 'en',
      }),
    );
  });
});
