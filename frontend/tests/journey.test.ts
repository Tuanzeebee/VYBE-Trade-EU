import { describe, expect, it } from 'vitest';
import { nextAfter, stepForTab, STEP_META, STEP_ORDER } from '@/lib/journey';

describe('journey', () => {
  it('có đủ 8 bước theo thứ tự cố định và mỗi bước có đích', () => {
    expect(STEP_ORDER).toEqual(['company', 'products', 'evidence', 'verification', 'market', 'tariff', 'requests', 'services']);
    for (const key of STEP_ORDER) {
      const meta = STEP_META[key];
      expect(meta.tab !== null || meta.href !== null).toBe(true);
    }
  });

  it('nextAfter trả bước kế tiếp, và null ở bước cuối', () => {
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
