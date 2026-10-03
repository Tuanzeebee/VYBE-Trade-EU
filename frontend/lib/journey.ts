// Hành trình seller (N1): siêu dữ liệu từng bước. Thứ tự và khoá khớp backend dashboard/journey.py.
import type { WorkspaceTabId } from '../components/SellerWorkspace';

export type StepKey = 'company' | 'products' | 'evidence' | 'verification' | 'market' | 'tariff' | 'requests' | 'services';

export const STEP_ORDER: StepKey[] = ['company', 'products', 'evidence', 'verification', 'market', 'tariff', 'requests', 'services'];

export const STEP_META: Record<StepKey, { label: string; hint: string; tab: WorkspaceTabId | null; href: string | null }> = {
  company: { label: 'Hồ sơ công ty', hint: 'Điền thông tin cơ bản để buyer biết bạn là ai.', tab: 'profile', href: null },
  products: { label: 'Sản phẩm', hint: 'Thêm sản phẩm bạn muốn bán.', tab: 'products', href: null },
  evidence: { label: 'Nhà máy và chứng nhận', hint: 'Tải chứng nhận để tăng độ tin cậy.', tab: 'licenses', href: null },
  verification: { label: 'Xác minh', hint: 'Gửi hồ sơ để được xác minh và hiện trong danh bạ.', tab: 'verification', href: null },
  market: { label: 'Chọn thị trường', hint: 'Xem thị trường phù hợp cho sản phẩm của bạn.', tab: 'report', href: null },
  tariff: { label: 'Tính thuế và xuất xứ', hint: 'Biết trước thuế nhập khẩu và giấy tờ xuất xứ.', tab: null, href: '/tools/tariff' },
  requests: { label: 'Request và báo giá', hint: 'Trả lời yêu cầu từ buyer.', tab: 'rfq', href: null },
  services: { label: 'Dịch vụ hỗ trợ', hint: 'Hải quan, logistics, kế toán thuế.', tab: null, href: '/tools/origin' },
};

export function nextAfter(current: StepKey): StepKey | null {
  const i = STEP_ORDER.indexOf(current);
  return i >= 0 && i < STEP_ORDER.length - 1 ? STEP_ORDER[i + 1] : null;
}

export function stepForTab(tab: WorkspaceTabId): StepKey | null {
  return STEP_ORDER.find((k) => STEP_META[k].tab === tab) ?? null;
}
