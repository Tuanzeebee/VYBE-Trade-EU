import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completeOnboarding,
  getSession,
  getUserPage,
  login,
  logout,
  refreshSession,
  register,
} from '@/lib/demoAuth';

type Handler = (req: Request) => Response | Promise<Response>;

const json = (status: number, body: unknown) =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const ME = { id: 'u-1', email: 'seller@x.vn', role: 'exporter', preferred_language: 'vi' };
let calls: Request[] = [];

function serve(routes: Record<string, Handler>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      calls.push(req);
      const key = `${req.method} ${new URL(req.url).pathname}`;
      const handler = routes[key];
      if (!handler) throw new Error(`unexpected ${key}`);
      return handler(req);
    }),
  );
}

describe('phiên đăng nhập thật qua API', () => {
  beforeEach(() => {
    calls = [];
  });
  afterEach(() => vi.unstubAllGlobals());

  it('login thành công: exporter hiển thị là seller, lưu phiên để đọc đồng bộ', async () => {
    serve({ 'POST /api/auth/login': () => json(200, { status: 'ok' }), 'GET /api/me': () => json(200, ME) });
    const user = await login('Seller@x.vn', 'mat-khau-du-dai');
    expect(user).toMatchObject({ id: 'u-1', email: 'seller@x.vn', role: 'seller', onboardingCompleted: false });
    expect(getSession()?.id).toBe('u-1');
    expect(calls[0].credentials).toBe('include');
  });

  it.each([
    [401, 'invalid_credentials', 'Email hoặc mật khẩu không đúng.'],
    [423, 'account_locked', 'Tài khoản tạm khóa 15 phút do đăng nhập sai nhiều lần.'],
  ])('login lỗi %i → thông báo tiếng Việt rõ ràng', async (status, code, message) => {
    serve({ 'POST /api/auth/login': () => json(status, { error: { code, message: 'x' } }) });
    await expect(login('a@x.vn', 'sai-mat-khau')).rejects.toThrow(message);
    expect(getSession()).toBeNull();
  });

  it('register: seller gửi lên là exporter, kèm consent, điện thoại, ngôn ngữ; giữ tên và công ty', async () => {
    serve({ 'POST /api/auth/register': () => json(201, { status: 'ok' }), 'GET /api/me': () => json(200, ME) });
    const user = await register({
      name: 'Nguyễn A',
      company: 'Công ty A',
      email: 'seller@x.vn',
      phone: '+84901234567',
      password: 'mat-khau-du-dai',
      role: 'seller',
      acceptTerms: true,
      language: 'en',
    });
    const body = await calls[0].clone().json();
    expect(body).toEqual({
      email: 'seller@x.vn',
      password: 'mat-khau-du-dai',
      role: 'exporter',
      phone: '+84901234567',
      preferred_language: 'en',
      accept_terms: true,
    });
    expect(user).toMatchObject({ name: 'Nguyễn A', company: 'Công ty A', role: 'seller' });
  });

  it.each([
    [{ password: 'ngan-9-kt' }, 'Mật khẩu cần ít nhất 10 ký tự.'],
    [{ password: '          ' }, 'Mật khẩu cần ít nhất 10 ký tự.'],
    [{ acceptTerms: false }, 'Vui lòng đồng ý Điều khoản sử dụng và Chính sách bảo mật.'],
    [{ company: ' ' }, 'Vui lòng nhập đầy đủ tên, doanh nghiệp và email hợp lệ.'],
  ])('register chặn ở client trước khi gọi API: %o', async (patch, message) => {
    serve({});
    const input = {
      name: 'A',
      company: 'C',
      email: 'a@x.vn',
      password: 'mat-khau-du-dai',
      role: 'buyer' as const,
      acceptTerms: true,
      language: 'vi' as const,
      ...patch,
    };
    await expect(register(input)).rejects.toThrow(message);
    expect(calls).toHaveLength(0);
  });

  it('register trùng email → thông báo có sẵn', async () => {
    serve({ 'POST /api/auth/register': () => json(409, { error: { code: 'email_taken', message: 'x' } }) });
    await expect(
      register({
        name: 'A',
        company: 'C',
        email: 'a@x.vn',
        password: 'mat-khau-du-dai',
        role: 'buyer',
        acceptTerms: true,
        language: 'vi',
      }),
    ).rejects.toThrow('Email này đã có tài khoản.');
  });

  it('refreshSession: phiên hết hạn (401) → null và xóa bộ nhớ phiên', async () => {
    serve({ 'POST /api/auth/login': () => json(200, {}), 'GET /api/me': () => json(200, ME) });
    await login('seller@x.vn', 'mat-khau-du-dai');
    serve({ 'GET /api/me': () => json(401, { error: { code: 'unauthenticated', message: 'x' } }) });
    expect(await refreshSession()).toBeNull();
    expect(getSession()).toBeNull();
  });

  it('refreshSession: không kết nối được máy chủ → coi như chưa đăng nhập', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('network'))));
    expect(await refreshSession()).toBeNull();
  });

  it('logout gọi API và xóa phiên phía trình duyệt', async () => {
    serve({ 'POST /api/auth/login': () => json(200, {}), 'GET /api/me': () => json(200, ME) });
    await login('seller@x.vn', 'mat-khau-du-dai');
    serve({ 'POST /api/auth/logout': () => new Response(null, { status: 204 }) });
    await logout();
    expect(calls.at(-1)?.url).toMatch(/\/api\/auth\/logout$/);
    expect(getSession()).toBeNull();
  });

  it('onboarding vẫn lưu trên trình duyệt theo id user thật (tới B1), sau đó vào workspace', async () => {
    serve({ 'POST /api/auth/login': () => json(200, {}), 'GET /api/me': () => json(200, ME) });
    const user = await login('seller@x.vn', 'mat-khau-du-dai');
    expect(getUserPage(user)).toBe('onboarding');
    const done = completeOnboarding(user.id, {
      companyName: 'Công ty A',
      country: 'VN',
      interest: 'rice',
      taxCode: '0312345678',
      contactEmail: 'a@x.vn',
      agreeCommitment: 'true',
      products: JSON.stringify([{ name: 'Gạo' }]),
    });
    expect(getUserPage(done)).toBe('workspace');
    expect(getSession()?.company).toBe('Công ty A');
  });
});
