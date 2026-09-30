// Phiên đăng nhập THẬT qua API (A1, ADR-0002: cookie HTTP-only). Giữ tên file, tên hàm và kiểu
// DemoUser để component cũ không phải sửa. Hồ sơ onboarding (tên, doanh nghiệp, profile) vẫn lưu
// trên trình duyệt theo id user thật cho tới khi có bảng companies (B1).
import { createApiClient } from './api/client';
import { getMyCompany } from './companyApi';
import { getMyProducts } from './productsApi';

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
export const MIN_PASSWORD_LENGTH = 10;

type ApiRole = 'exporter' | 'buyer' | 'admin';
type ApiUser = { id: string; email: string; role: ApiRole; preferred_language: 'vi' | 'en' };
type LocalProfile = Partial<Pick<DemoUser, 'name' | 'company' | 'onboardingCompleted' | 'onboardingVersion' | 'profile'>>;

const PROFILES_KEY = 'vybe_profiles_v2';
const SESSION_KEY = 'vybe_session_cache_v2';

const MESSAGES = {
  invalid: 'Email hoặc mật khẩu không đúng.',
  locked: 'Tài khoản tạm khóa 15 phút do đăng nhập sai nhiều lần.',
  taken: 'Email này đã có tài khoản.',
  password: 'Mật khẩu cần ít nhất 10 ký tự.',
  consent: 'Vui lòng đồng ý Điều khoản sử dụng và Chính sách bảo mật.',
  fields: 'Vui lòng nhập đầy đủ tên, doanh nghiệp và email hợp lệ.',
  network: 'Không kết nối được máy chủ. Vui lòng thử lại.',
  invalidInput: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.',
};

// Tạo client mỗi lần gọi để luôn dùng fetch hiện hành (test thay fetch toàn cục).
const api = () => createApiClient();

const toRole = (role: ApiRole): Role => (role === 'exporter' ? 'seller' : role);
const toApiRole = (role: 'buyer' | 'seller'): 'buyer' | 'exporter' => (role === 'seller' ? 'exporter' : 'buyer');

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readProfiles(): Record<string, LocalProfile> {
  try {
    const raw = storage()?.getItem(PROFILES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, LocalProfile>) : {};
  } catch {
    return {};
  }
}

function writeProfile(id: string, patch: LocalProfile): void {
  const profiles = readProfiles();
  profiles[id] = { ...profiles[id], ...patch };
  storage()?.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

function merge(apiUser: ApiUser): DemoUser {
  const local = readProfiles()[apiUser.id] ?? {};
  return {
    id: apiUser.id,
    email: apiUser.email,
    role: toRole(apiUser.role),
    name: local.name ?? apiUser.email.split('@')[0],
    company: local.company ?? '',
    onboardingCompleted: local.onboardingCompleted ?? false,
    onboardingVersion: local.onboardingVersion,
    profile: local.profile,
  };
}

function cacheSession(apiUser: ApiUser | null): void {
  if (apiUser) storage()?.setItem(SESSION_KEY, JSON.stringify(apiUser));
  else storage()?.removeItem(SESSION_KEY);
}

function errorMessage(status: number): string {
  if (status === 401) return MESSAGES.invalid;
  if (status === 423) return MESSAGES.locked;
  if (status === 409) return MESSAGES.taken;
  return MESSAGES.invalidInput;
}

/**
 * Cờ "đã onboarding" nằm ở trình duyệt nên mất khi đổi máy hoặc xóa cache. Nguồn sự thật là hồ sơ
 * công ty (và sản phẩm với exporter) trên server: đủ rồi thì không đưa lại vào wizard.
 */
async function syncOnboardingFromServer(apiUser: ApiUser): Promise<void> {
  if (apiUser.role === 'admin') return;
  const local = readProfiles()[apiUser.id];
  if (local?.onboardingCompleted && local.onboardingVersion === 2) return;
  const company = await getMyCompany();
  if (!company) return;
  // Exporter mới lưu công ty ở bước 1 của wizard (nháp): phải có thêm sản phẩm mới coi là đã onboarding.
  if (apiUser.role === 'exporter') {
    const products = await getMyProducts();
    if (!products?.length) return;
  }
  writeProfile(apiUser.id, {
    onboardingCompleted: true,
    onboardingVersion: 2,
    company: local?.company || company.legal_name,
  });
}

/** Hỏi server phiên hiện tại. Hết hạn hoặc không kết nối được → coi như chưa đăng nhập. */
export async function refreshSession(): Promise<DemoUser | null> {
  try {
    const { data, response } = await api().GET('/api/me');
    if (!response.ok || !data) {
      cacheSession(null);
      return null;
    }
    cacheSession(data as ApiUser);
    await syncOnboardingFromServer(data as ApiUser);
    return merge(data as ApiUser);
  } catch {
    return null;
  }
}

/** Phiên đã xác nhận gần nhất (đọc đồng bộ). Nguồn sự thật vẫn là cookie phía server. */
export function getSession(): DemoUser | null {
  try {
    const raw = storage()?.getItem(SESSION_KEY);
    return raw ? merge(JSON.parse(raw) as ApiUser) : null;
  } catch {
    return null;
  }
}

/** Người dùng đã đăng nhập trên trình duyệt này (màn admin cũ). Danh sách thật làm ở I5. */
export function getUsers(): DemoUser[] {
  const current = getSession();
  return current ? [current] : [];
}

async function loadMe(): Promise<DemoUser> {
  const user = await refreshSession();
  if (!user) throw new Error(MESSAGES.network);
  return user;
}

export async function login(email: string, password: string): Promise<DemoUser> {
  let response: Response;
  try {
    ({ response } = await api().POST('/api/auth/login', {
      body: { email: email.trim().toLowerCase(), password },
    }));
  } catch {
    throw new Error(MESSAGES.network);
  }
  if (!response.ok) throw new Error(errorMessage(response.status));
  return loadMe();
}

export async function register(input: {
  name: string;
  email: string;
  company: string;
  role: 'buyer' | 'seller';
  password: string;
  phone?: string;
  acceptTerms: boolean;
  language: 'vi' | 'en';
}): Promise<DemoUser> {
  const email = input.email.trim().toLowerCase();
  if (!input.name.trim() || !input.company.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(MESSAGES.fields);
  }
  if (input.password.length < MIN_PASSWORD_LENGTH || !input.password.trim()) throw new Error(MESSAGES.password);
  if (!input.acceptTerms) throw new Error(MESSAGES.consent);
  let response: Response;
  try {
    ({ response } = await api().POST('/api/auth/register', {
      body: {
        email,
        password: input.password,
        role: toApiRole(input.role),
        phone: input.phone?.trim() || null,
        preferred_language: input.language,
        accept_terms: true,
      },
    }));
  } catch {
    throw new Error(MESSAGES.network);
  }
  if (!response.ok) throw new Error(errorMessage(response.status));
  const user = await loadMe();
  writeProfile(user.id, { name: input.name.trim(), company: input.company.trim() });
  return merge({ id: user.id, email: user.email, role: toApiRole(input.role), preferred_language: input.language });
}

export async function logout(): Promise<void> {
  cacheSession(null);
  try {
    await api().POST('/api/auth/logout');
  } catch {
    // Phiên phía trình duyệt đã xóa; cookie hết hạn theo thời gian nếu server không nhận được.
  }
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
  writeProfile(id, {
    company: profile.companyName.trim(),
    name: profile.contactName?.trim() || user.name,
    profile,
    onboardingCompleted: true,
    onboardingVersion: 2,
  });
  return getSession() ?? user;
}

export function getUserPage(user: DemoUser): 'onboarding' | 'workspace' | 'buyer-directory' | 'admin' {
  if (user.role === 'admin') return 'admin';
  if (!user.onboardingCompleted || user.onboardingVersion !== 2) return 'onboarding';
  return user.role === 'seller' ? 'workspace' : 'buyer-directory';
}
