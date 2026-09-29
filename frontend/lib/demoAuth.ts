// Auth thật qua backend (/api/auth/*, /api/me). Giữ nguyên tên hàm và kiểu DemoUser
// để các component prototype không phải đổi. Phân quyền thật nằm ở server; bản chụp user
// lưu ở localStorage chỉ để render lần đầu, luôn được kiểm lại bằng refreshSession().
import type { components } from './api/schema';

type UserOut = components['schemas']['UserOut'];

export type Role = 'buyer' | 'seller' | 'admin';
export type DemoUser = {
  id: string;
  name: string;
  email: string;
  company: string;
  role: Role;
  onboardingCompleted: boolean;
  onboardingVersion?: number;
  profile?: Record<string, string>;
};

export const ROLE_LABELS: Record<Role, string> = { buyer: 'Buyer', seller: 'Seller', admin: 'Admin' };

const SESSION_KEY = 'evfta_session_user_v1';
// Hồ sơ onboarding vẫn lưu trên trình duyệt tới khi hồ sơ công ty có API (B1/A2).
const ONBOARDING_KEY = 'evfta_onboarding_v1';

type Onboarding = Pick<DemoUser, 'onboardingCompleted' | 'onboardingVersion' | 'profile'>;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
}

function onboardingOf(id: string): Onboarding {
  return readJson<Record<string, Onboarding>>(ONBOARDING_KEY, {})[id] ?? { onboardingCompleted: false };
}

function fromApi(u: UserOut): DemoUser {
  const onboarding = onboardingOf(u.id);
  return {
    id: u.id,
    name: onboarding.profile?.contactName?.trim() || u.name,
    email: u.email,
    company: onboarding.profile?.companyName?.trim() || u.company_name || '',
    role: u.role === 'exporter' ? 'seller' : u.role,
    ...onboarding,
  };
}

function remember(user: DemoUser | null): DemoUser | null {
  if (typeof window !== 'undefined') {
    if (user) writeJson(SESSION_KEY, user);
    else localStorage.removeItem(SESSION_KEY);
  }
  return user;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new Error('Không kết nối được máy chủ. Vui lòng thử lại.');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? 'Đã có lỗi xảy ra. Vui lòng thử lại.');
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/** Bản chụp user lần gần nhất (đồng bộ, để render ban đầu). Không dùng để phân quyền. */
export function getSession(): DemoUser | null {
  return readJson<DemoUser | null>(SESSION_KEY, null);
}

/** Hỏi server phiên còn hiệu lực không; null nếu đã hết/không có. */
export async function refreshSession(): Promise<DemoUser | null> {
  try {
    return remember(fromApi(await api<UserOut>('/api/me')));
  } catch {
    return remember(null);
  }
}

export function logout(): void {
  remember(null);
  void fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined);
}

export async function login(email: string, password: string): Promise<DemoUser> {
  const user = await api<UserOut>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
  return remember(fromApi(user)) as DemoUser;
}

export async function register(input: {
  name: string; email: string; company: string; role: 'buyer' | 'seller'; password: string; consent: boolean;
}): Promise<DemoUser> {
  if (!['buyer', 'seller'].includes(input.role)) throw new Error('Chỉ được đăng ký tài khoản Buyer hoặc Seller.');
  if (!input.consent) throw new Error('Vui lòng đồng ý Điều khoản và Chính sách bảo mật.');
  const language = typeof window !== 'undefined' ? localStorage.getItem('vybe_language') : null;
  const user = await api<UserOut>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email.trim(),
      password: input.password,
      name: input.name.trim(),
      company_name: input.company.trim(),
      role: input.role === 'seller' ? 'exporter' : 'buyer',
      preferred_language: language === 'vi' || !language ? 'vi' : 'en',
      consent_accepted: true,
    }),
  });
  return remember(fromApi(user)) as DemoUser;
}

/** Danh sách tài khoản cho AdminDashboard (server chỉ trả cho admin). */
export async function fetchUsers(): Promise<DemoUser[]> {
  return (await api<UserOut[]>('/api/admin/users')).map(fromApi);
}

export function completeOnboarding(id: string, profile: Record<string, string>): DemoUser {
  const user = getSession();
  if (!user || user.id !== id) throw new Error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
  if (user.role === 'admin') throw new Error('Admin không có Company Onboarding.');
  if (user.onboardingCompleted && user.onboardingVersion === 2) return user;
  const required = user.role === 'buyer'
    ? ['companyName', 'country', 'region', 'companySize', 'contactName', 'contactEmail', 'interest', 'quantity', 'frequency', 'minTrustLevel']
    : ['companyName', 'country', 'interest', 'taxCode', 'contactEmail'];
  if (required.some((field) => !profile[field]?.trim()) || profile.agreeCommitment !== 'true') {
    throw new Error('Vui lòng hoàn tất thông tin các bước và xác nhận cam kết trước khi gửi hồ sơ.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.contactEmail.trim())) throw new Error('Email liên hệ không hợp lệ.');
  if (user.role === 'buyer' && (!Number.isFinite(Number(profile.quantity)) || Number(profile.quantity) <= 0 ||
    !['L1', 'L2', 'L3'].includes(profile.minTrustLevel))) {
    throw new Error('Khối lượng mua phải lớn hơn 0 và cấp độ xác minh phải hợp lệ.');
  }
  if (user.role === 'seller') {
    let products: unknown;
    try { products = JSON.parse(profile.products || ''); } catch { /* handled below */ }
    if (!Array.isArray(products) || !products.length || products.some((p) => typeof p?.name !== 'string' || !p.name.trim())) {
      throw new Error('Doanh nghiệp cần ít nhất một sản phẩm có tên hợp lệ.');
    }
  }
  const onboarding: Onboarding = { profile, onboardingCompleted: true, onboardingVersion: 2 };
  writeJson(ONBOARDING_KEY, { ...readJson<Record<string, Onboarding>>(ONBOARDING_KEY, {}), [id]: onboarding });
  const updated = { ...user, ...onboarding, company: profile.companyName.trim(), name: profile.contactName?.trim() || user.name };
  return remember(updated) as DemoUser;
}

export function getUserPage(user: DemoUser): 'onboarding' | 'workspace' | 'buyer-directory' | 'admin' {
  if (user.role === 'admin') return 'admin';
  if (!user.onboardingCompleted || user.onboardingVersion !== 2) return 'onboarding';
  return user.role === 'seller' ? 'workspace' : 'buyer-directory';
}
