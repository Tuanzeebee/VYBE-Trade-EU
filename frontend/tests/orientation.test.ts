import { describe, expect, it } from 'vitest';
import { budgetLabel, budgetRequired, validateStep, type FormValues } from '@/lib/orientation';

const base: FormValues = {
  productId: '',
  targetMarket: '',
  orientation: null,
  otherText: '',
  expectedRevenue: '',
  annualVolume: '',
  budget: '',
  productionRegion: '',
};
const v = (over: Partial<FormValues>): FormValues => ({ ...base, ...over });

describe('orientation (N5)', () => {
  it('nhãn ngân sách theo hướng bán', () => {
    expect(budgetLabel('own_brand')).toBe('Ngân sách làm thương hiệu');
    expect(budgetLabel('bulk')).toBe('Ngân sách bán hàng');
    expect(budgetLabel('oem')).toBe('Ngân sách bán hàng');
    expect(budgetLabel('other')).toBe('Ngân sách bán hàng');
  });

  it('chỉ thương hiệu riêng bắt buộc ngân sách', () => {
    expect(budgetRequired('own_brand')).toBe(true);
    expect(budgetRequired('oem')).toBe(false);
    expect(budgetRequired('bulk')).toBe(false);
  });

  it('bước 1 cần sản phẩm, thị trường và hướng bán; "khác" cần mô tả', () => {
    expect(validateStep(1, v({}))).not.toBeNull();
    expect(validateStep(1, v({ productId: 'p1', targetMarket: 'DE' }))).not.toBeNull();
    expect(validateStep(1, v({ productId: 'p1', orientation: 'bulk' }))).not.toBeNull(); // thiếu thị trường
    expect(validateStep(1, v({ productId: 'p1', targetMarket: 'DE', orientation: 'bulk' }))).toBeNull();
    expect(validateStep(1, v({ productId: 'p1', targetMarket: 'DE', orientation: 'other', otherText: '  ' }))).not.toBeNull();
    expect(validateStep(1, v({ productId: 'p1', targetMarket: 'DE', orientation: 'other', otherText: 'Bán cho nhà máy' }))).toBeNull();
  });

  it('bước 2 cần doanh thu > 0; thương hiệu riêng cần thêm ngân sách', () => {
    expect(validateStep(2, v({ orientation: 'bulk', expectedRevenue: '' }))).not.toBeNull();
    expect(validateStep(2, v({ orientation: 'bulk', expectedRevenue: '0' }))).not.toBeNull();
    expect(validateStep(2, v({ orientation: 'bulk', expectedRevenue: '1,5 tỷ' }))).not.toBeNull();
    expect(validateStep(2, v({ orientation: 'bulk', expectedRevenue: '100.000' }))).toBeNull();
    expect(validateStep(2, v({ orientation: 'own_brand', expectedRevenue: '100000', budget: '' }))).not.toBeNull();
    expect(validateStep(2, v({ orientation: 'own_brand', expectedRevenue: '100000', budget: '5000' }))).toBeNull();
  });

  it('bước 3 không có điều kiện riêng', () => {
    expect(validateStep(3, v({}))).toBeNull();
  });
});
