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
  salt?: string;
  passwordHash?: string;
};

export const ROLE_LABELS: Record<Role, string> = { buyer: 'Buyer', seller: 'Seller', admin: 'Admin' };
export const DEMO_PASSWORD = 'VybeDemo123!';
export const DEMO_USERS: DemoUser[] = [
  { id: 'demo-buyer', name: 'Alex Nguyen', email: 'buyer@vybe.demo', company: 'Global Foods Trading', role: 'buyer', onboardingCompleted: false },
  { id: 'demo-seller', name: 'Nguyễn Văn Trí', email: 'seller@vybe.demo', company: 'Công ty TNHH Nông Sản Việt', role: 'seller', onboardingCompleted: false },
  { id: 'demo-admin', name: 'VYBE Administrator', email: 'admin@vybe.demo', company: 'VYBE Trade', role: 'admin', onboardingCompleted: false },
];
const USERS_KEY = 'vybe_demo_users_v1';
const SESSION_KEY = 'vybe_demo_session_v1';

export function getUsers(): DemoUser[] {
  if (typeof window === 'undefined') return DEMO_USERS;
  const raw = localStorage.getItem(USERS_KEY);
  let saved: DemoUser[] = [];
  if (raw) {
    try {
      saved = JSON.parse(raw);
      if (!Array.isArray(saved) || !saved.every((u) => u &&
        (['id', 'name', 'email', 'company'] as const).every((key) => typeof u[key] === 'string') &&
        ['buyer', 'seller', 'admin'].includes(u.role) && typeof u.onboardingCompleted === 'boolean')) {
        throw new Error();
      }
    } catch {
      return DEMO_USERS;
    }
  }
  return [...DEMO_USERS.map((user) => saved.find((u) => u.id === user.id) || user),
    ...saved.filter((user) => !DEMO_USERS.some((u) => u.id === user.id))];
}

function saveUser(user: DemoUser): void {
  if (typeof window === 'undefined') return;
  const users = getUsers().map((u) => u.id === user.id ? user : u);
  if (!users.some((u) => u.id === user.id)) users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getSession(): DemoUser | null {
  if (typeof window === 'undefined') return null;
  const id = localStorage.getItem(SESSION_KEY);
  return id ? getUsers().find((user) => user.id === id) || null : null;
}

export function logout(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100_000, hash: 'SHA-256' }, key, 256);
  return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function login(email: string, password: string): Promise<DemoUser> {
  const user = getUsers().find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  const valid = user && (DEMO_USERS.some((u) => u.id === user.id)
    ? password === DEMO_PASSWORD
    : user.salt && user.passwordHash === await hashPassword(password, user.salt));
  if (!valid) throw new Error('Email hoặc mật khẩu không đúng.');
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, user.id);
  }
  return user;
}

export async function register(input: { name: string; email: string; company: string; role: 'buyer' | 'seller'; password: string }): Promise<DemoUser> {
  const email = input.email.trim().toLowerCase();
  if (!['buyer', 'seller'].includes(input.role)) throw new Error('Chỉ được đăng ký tài khoản Buyer hoặc Seller.');
  if (!input.name.trim() || !input.company.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Vui lòng nhập đầy đủ tên, doanh nghiệp và email hợp lệ.');
  }
  if (input.password.length < 8) throw new Error('Mật khẩu cần ít nhất 8 ký tự.');
  if (getUsers().some((user) => user.email.toLowerCase() === email)) throw new Error('Email này đã có tài khoản.');
  const salt = crypto.randomUUID();
  const passwordHash = await hashPassword(input.password, salt);
  if (getUsers().some((user) => user.email.toLowerCase() === email)) throw new Error('Email này đã có tài khoản.');
  const user: DemoUser = { id: crypto.randomUUID(), name: input.name.trim(), email,
    company: input.company.trim(), role: input.role, onboardingCompleted: false, salt, passwordHash };
  saveUser(user);
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, user.id);
  }
  return user;
}

export function completeOnboarding(id: string, profile: Record<string, string>): DemoUser {
  const user = getUsers().find((u) => u.id === id);
  if (!user || getSession()?.id !== id) throw new Error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
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
  const updated = { ...user, company: profile.companyName.trim(), name: profile.contactName?.trim() || user.name,
    profile, onboardingCompleted: true, onboardingVersion: 2 };
  saveUser(updated);
  return updated;
}

export function getUserPage(user: DemoUser): 'onboarding' | 'workspace' | 'buyer-directory' | 'admin' {
  if (user.role === 'admin') return 'admin';
  if (!user.onboardingCompleted || user.onboardingVersion !== 2) return 'onboarding';
  return user.role === 'seller' ? 'workspace' : 'buyer-directory';
}
