import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HsCodePicker, { type HsCodeOption } from '@/components/HsCodePicker';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter/profile',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const RICE: HsCodeOption = {
  code: '100630',
  formatted: '1006.30',
  name_vi: 'Gạo xát',
  name_en: 'Semi-milled or wholly milled rice',
  chapter: '10',
  category: 'agriculture',
  supported: true,
};
const COFFEE: HsCodeOption = {
  code: '090111',
  formatted: '0901.11',
  name_vi: 'Cà phê nhân, chưa rang',
  name_en: 'Coffee, not roasted, not decaffeinated',
  chapter: '09',
  category: 'agriculture',
  supported: true,
};
const OTHER: HsCodeOption = { ...COFFEE, code: '090300', formatted: '0903.00', name_vi: 'Chè Mate', name_en: 'Maté', supported: false };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

let requested: string[] = [];

function serve(handler: (q: string) => Response | Promise<Response>) {
  requested = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const q = new URL(req.url).searchParams.get('q') ?? '';
      requested.push(q);
      return handler(q);
    }),
  );
}

function Harness({ locale = 'vi', initial = null, spy }: { locale?: 'vi' | 'en'; initial?: HsCodeOption | null; spy?: (v: HsCodeOption | null) => void }) {
  const [value, setValue] = useState<HsCodeOption | null>(initial);
  return (
    <NextIntlClientProvider locale={locale} messages={{}}>
      <LanguageProvider>
        <HsCodePicker
          label="Mã HS"
          value={value}
          onChange={(next) => {
            setValue(next);
            spy?.(next);
          }}
        />
      </LanguageProvider>
    </NextIntlClientProvider>
  );
}

const box = () => screen.getByRole('combobox', { name: /Mã HS|HS code/ }) as HTMLInputElement;
const type = (text: string) => fireEvent.change(box(), { target: { value: text } });
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('HsCodePicker', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('chờ 250ms sau lần gõ cuối rồi mới gọi API, chỉ một lần cho cả chuỗi gõ', async () => {
    serve(() => json(200, [RICE]));
    render(<Harness />);
    type('g');
    type('ga');
    type('gao');
    await sleep(100);
    expect(requested).toEqual([]);
    await screen.findByRole('option', { name: /1006\.30/ });
    expect(requested).toEqual(['gao']);
  });

  it('hiện mã có dấu chấm và tên theo ngôn ngữ giao diện (vi)', async () => {
    serve(() => json(200, [RICE, COFFEE]));
    render(<Harness />);
    type('a');
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('1006.30');
    expect(options[0]).toHaveTextContent('Gạo xát');
    expect(options[0]).not.toHaveTextContent('Semi-milled');
  });

  it('hiện tên tiếng Anh khi giao diện là en', async () => {
    serve(() => json(200, [RICE]));
    render(<Harness locale="en" />);
    type('rice');
    const [option] = await screen.findAllByRole('option');
    expect(option).toHaveTextContent('Semi-milled or wholly milled rice');
  });

  it('phân biệt mã đã hỗ trợ máy tính và chưa hỗ trợ', async () => {
    serve(() => json(200, [RICE, OTHER]));
    render(<Harness />);
    type('0');
    const [supported, unsupported] = await screen.findAllByRole('option');
    expect(supported).toHaveTextContent('Đã hỗ trợ máy tính');
    expect(unsupported).toHaveTextContent('Chưa hỗ trợ máy tính');
  });

  it('bấm chọn: gọi onChange với đúng mã, ô hiện "mã — tên", danh sách đóng', async () => {
    serve(() => json(200, [RICE, COFFEE]));
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    type('gao');
    fireEvent.click(await screen.findByRole('option', { name: /1006\.30/ }));
    expect(spy).toHaveBeenCalledWith(RICE);
    expect(box().value).toBe('1006.30 — Gạo xát');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('bàn phím: mũi tên xuống + Enter chọn dòng đang sáng, Escape đóng danh sách', async () => {
    serve(() => json(200, [RICE, COFFEE]));
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    type('a');
    await screen.findAllByRole('option');
    fireEvent.keyDown(box(), { key: 'ArrowDown' });
    fireEvent.keyDown(box(), { key: 'ArrowDown' });
    expect(box()).toHaveAttribute('aria-activedescendant', expect.stringContaining('090111'));
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(spy).toHaveBeenLastCalledWith(COFFEE);

    type('b');
    await screen.findAllByRole('option');
    fireEvent.keyDown(box(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('không có kết quả: báo rõ, không có danh sách trống', async () => {
    serve(() => json(200, []));
    render(<Harness />);
    type('zzz');
    expect(await screen.findByRole('status')).toHaveTextContent('Không tìm thấy mã HS phù hợp');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('lỗi mạng hoặc server: báo lỗi, gõ lại thì thử lại được', async () => {
    let fail = true;
    serve(() => (fail ? json(500, {}) : json(200, [RICE])));
    render(<Harness />);
    type('gao');
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được danh sách mã HS');
    fail = false;
    type('gao x');
    await screen.findByRole('option', { name: /1006\.30/ });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('xóa hết chữ: bỏ lựa chọn (onChange null), đóng danh sách, không gọi API cho chuỗi rỗng', async () => {
    serve(() => json(200, [RICE]));
    const spy = vi.fn();
    render(<Harness initial={RICE} spy={spy} />);
    expect(box().value).toBe('1006.30 — Gạo xát');
    type('');
    expect(spy).toHaveBeenCalledWith(null);
    await sleep(350);
    expect(requested).toEqual([]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('sửa chữ khi đang có lựa chọn thì lựa chọn cũ bị bỏ ngay', async () => {
    serve(() => json(200, [RICE]));
    const spy = vi.fn();
    render(<Harness initial={RICE} spy={spy} />);
    type('gạ');
    expect(spy).toHaveBeenCalledWith(null);
  });

  it('kết quả chậm của lần gõ trước không ghi đè kết quả của lần gõ sau', async () => {
    serve(async (q) => {
      if (q === 'g') {
        await sleep(500);
        return json(200, [COFFEE]);
      }
      return json(200, [RICE]);
    });
    render(<Harness />);
    type('g');
    await sleep(300); // yêu cầu 'g' đã bay, đang chờ 500ms
    type('gao');
    await screen.findByRole('option', { name: /1006\.30/ });
    await sleep(450); // yêu cầu 'g' trả về muộn
    expect(screen.queryByRole('option', { name: /0901\.11/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /1006\.30/ })).toBeInTheDocument();
  });

  it('ô nhập có nhãn, role combobox và khai báo danh sách gợi ý', () => {
    serve(() => json(200, []));
    render(<Harness />);
    expect(box()).toHaveAttribute('aria-autocomplete', 'list');
    expect(box()).toHaveAttribute('aria-expanded', 'false');
  });

  it('chỉ gửi chuỗi đã bỏ khoảng trắng đầu/cuối', async () => {
    serve(() => json(200, [RICE]));
    render(<Harness />);
    type('  1006.30  ');
    await waitFor(() => expect(requested).toEqual(['1006.30']));
  });
});
