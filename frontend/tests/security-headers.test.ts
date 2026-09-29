import { describe, expect, it } from 'vitest';
import config, { securityHeaders } from '../next.config.mjs';

describe('Header bảo mật của frontend (J8)', () => {
  it('áp cho mọi đường dẫn', async () => {
    const rules = (await config.headers?.()) ?? [];
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe('/:path*');
    const names = rules[0].headers.map((h: { key: string }) => h.key);
    expect(names).toEqual(expect.arrayContaining(['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy', 'Strict-Transport-Security']));
  });

  it('chống nhúng khung và đoán kiểu nội dung', () => {
    const value = (key: string) => securityHeaders.find((h: { key: string; value: string }) => h.key === key)?.value;
    expect(value('X-Frame-Options')).toBe('DENY');
    expect(value('X-Content-Type-Options')).toBe('nosniff');
    expect(value('Permissions-Policy')).toContain('camera=()');
  });

  it('không lộ tên framework', () => {
    expect(config.poweredByHeader).toBe(false);
  });
});
