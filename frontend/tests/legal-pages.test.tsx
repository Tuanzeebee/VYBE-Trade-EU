import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import LegalPageView from '@/components/LegalPageView';
import { parseLegal, readLegalSource } from '@/lib/legalContent';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/terms',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="vi" messages={{}}>{ui}</NextIntlClientProvider>);

describe('Trang pháp lý (E4)', () => {
  it('thiếu nội dung: hiện thông báo đang hoàn thiện, không bịa điều khoản', () => {
    const dir = mkdtempSync(join(tmpdir(), 'legal-'));
    wrap(<LegalPageView page="terms" locale="vi" dir={dir} />);
    expect(screen.getByRole('status')).toHaveTextContent('đang được đội pháp lý hoàn thiện');
  });

  it('có file: render tiêu đề và đoạn văn; locale thiếu file rơi về tiếng Việt', () => {
    const dir = mkdtempSync(join(tmpdir(), 'legal-'));
    writeFileSync(join(dir, 'privacy.vi.md'), '# Phạm vi\n\nĐoạn một.\nvẫn đoạn một.\n\n## Mục nhỏ\n\nĐoạn hai.');
    expect(readLegalSource('privacy', 'en', dir)).toContain('Phạm vi');
    wrap(<LegalPageView page="privacy" locale="en" dir={dir} />);
    expect(screen.getByRole('heading', { name: 'Phạm vi' })).toBeInTheDocument();
    expect(screen.getByText('Đoạn một. vẫn đoạn một.')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('parseLegal không diễn giải HTML và bỏ dòng trống', () => {
    expect(parseLegal('\n\n<script>x</script>\n\n\n')).toEqual([{ kind: 'p', text: '<script>x</script>' }]);
    const { container } = wrap(<LegalPageView page="terms" locale="vi" dir="/không-có" />);
    expect(container.querySelector('script')).toBeNull();
  });
});

describe('Không còn liên kết trỏ #', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => (n === 'node_modules' || n.startsWith('.') ? [] : statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : n.endsWith('.tsx') ? [join(dir, n)] : []));
  it('không có href="#" trong components và app', () => {
    const bad = ['components', 'app'].flatMap(files).filter((f) => /href=(["'{`]+)#\1?\s*[}"'`]/.test(readFileSync(f, 'utf8')) || /href=["']#["']/.test(readFileSync(f, 'utf8')));
    expect(bad).toEqual([]);
  });
});
