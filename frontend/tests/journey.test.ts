import { describe, expect, it } from 'vitest';
import { nextAfter, stepForTab, STEP_META, STEP_ORDER } from '@/lib/journey';

describe('journey', () => {
  it('có đủ 9 bước theo thứ tự cố định và mỗi bước có đích', () => {
    expect(STEP_ORDER).toEqual(['company', 'products', 'evidence', 'verification', 'market', 'tariff', 'origin', 'requests', 'services']);
    for (const key of STEP_ORDER) {
      const meta = STEP_META[key];
      expect(meta.tab !== null || meta.href !== null).toBe(true);
    }
  });

  it('mỗi bước có đích riêng: không hai bước nào cùng mở một trang', () => {
    const targets = STEP_ORDER.map((k) => STEP_META[k].tab ?? STEP_META[k].href);
    expect(new Set(targets).size).toBe(STEP_ORDER.length);
  });

  it('tên và đích khớp nhau: thuế, xuất xứ, báo cáo thị trường, dịch vụ', () => {
    expect(STEP_META.market.label).toBe('Báo cáo thị trường');
    expect(STEP_META.tariff).toMatchObject({ label: 'Tính thuế', href: '/tools/tariff' });
    expect(STEP_META.origin).toMatchObject({ label: 'Xuất xứ và EUR.1', href: '/tools/origin' });
    expect(STEP_META.services.label).toBe('Dịch vụ hỗ trợ');
    expect(STEP_META.services.href).toBe('/suppliers?kind=services'); // nhà cung cấp dịch vụ, không phải công cụ xuất xứ
  });

  it('nextAfter trả bước kế tiếp, và null ở bước cuối', () => {
    expect(nextAfter('tariff')).toBe('origin');
    expect(nextAfter('company')).toBe('products');
    expect(nextAfter('requests')).toBe('services');
    expect(nextAfter('services')).toBeNull();
  });

  it('nhãn không chứa "AI" hay "tuân thủ"', () => {
    for (const key of STEP_ORDER) {
      expect(STEP_META[key].label).not.toMatch(/\bAI\b|tuân thủ/i);
    }
  });

  it('stepForTab ánh xạ tab về bước, tab ngoài hành trình → null', () => {
    expect(stepForTab('profile')).toBe('company');
    expect(stepForTab('licenses')).toBe('evidence');
    expect(stepForTab('messages')).toBeNull();
    expect(stepForTab('billing')).toBeNull();
  });
});
