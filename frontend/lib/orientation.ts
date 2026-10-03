// Hướng bán hàng (N5): nhãn ngân sách và kiểm từng bước của form go-to-market. Hàm thuần.
import { moneyInput } from './marketReportApi';

export type Orientation = 'bulk' | 'oem' | 'own_brand' | 'other';

export type FormValues = {
  productId: string;
  targetMarket: string; // 'EU' | mã nước | '' (chưa biết)
  orientation: Orientation | null;
  otherText: string;
  expectedRevenue: string;
  annualVolume: string;
  budget: string;
};

export const ORIENTATION_LABELS: Record<Orientation, string> = {
  bulk: 'Bán thô, giao tại kho',
  oem: 'OEM (sản xuất cho nhãn khác)',
  own_brand: 'Thương hiệu riêng',
  other: 'Khác (tự điền)',
};

export function budgetLabel(o: Orientation): string {
  return o === 'own_brand' ? 'Ngân sách làm thương hiệu' : 'Ngân sách bán hàng';
}

export function budgetRequired(o: Orientation): boolean {
  return o === 'own_brand';
}

const positive = (s: string): boolean => {
  const amount = moneyInput(s);
  return typeof amount === 'string' && Number(amount) > 0;
};

/** null = hợp lệ; ngược lại là thông báo lỗi tiếng Việt. */
export function validateStep(step: 1 | 2 | 3, v: FormValues): string | null {
  if (step === 1) {
    if (!v.productId) return 'Chọn sản phẩm.';
    if (!v.orientation) return 'Chọn định hướng bán hàng.';
    if (v.orientation === 'other' && !v.otherText.trim()) return 'Mô tả định hướng bán hàng của bạn.';
    return null;
  }
  if (step === 2) {
    if (!positive(v.expectedRevenue)) return 'Nhập doanh thu xuất khẩu dự kiến (EUR/năm).';
    if (v.orientation && budgetRequired(v.orientation) && !positive(v.budget)) return 'Nhập ngân sách làm thương hiệu (EUR/năm).';
    return null;
  }
  return null;
}
