import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VerificationPanel from '@/components/VerificationPanel';
import { LanguageProvider } from '@/context/LanguageContext';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/vi/exporter',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));

const company = (over: Record<string, unknown> = {}) => ({
  id: 'c-1',
  legal_name: 'Công ty A',
  verification_status: 'unverified',
  verification_level: 'basic',
  verified_at: null,
  expires_at: null,
  ...over,
});

const request = (over: Record<string, unknown> = {}) => ({
  id: 'r-1',
  company_id: 'c-1',
  status: 'pending',
  evidence_ids: [],
  submitted_at: '2026-09-29T08:00:00Z',
  reviewed_at: null,
  decision_reason: null,
  ...over,
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

let calls: { method: string; path: string }[] = [];

function serve(opts: { company?: unknown; company404?: boolean; requests?: unknown[]; submit?: () => Response } = {}) {
  calls = [];
  let status = (opts.company as { verification_status?: string } | undefined)?.verification_status;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const { pathname } = new URL(req.url);
      calls.push({ method: req.method, path: pathname });
      if (pathname === '/api/me/company') {
        if (opts.company404) return json(404, {});
        return json(200, { ...(opts.company as object), verification_status: status ?? 'unverified' });
      }
      if (pathname === '/api/exporter/verification-requests' && req.method === 'GET') return json(200, opts.requests ?? []);
      if (pathname === '/api/exporter/verification-requests' && req.method === 'POST') {
        const res = opts.submit ? opts.submit() : json(201, request());
        if (res.ok) status = 'pending';
        return res;
      }
      throw new Error(`unexpected ${req.method} ${pathname}`);
    }),
  );
}

function renderPanel(locale: 'vi' | 'en' = 'vi') {
  render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <LanguageProvider>
        <VerificationPanel />
      </LanguageProvider>
    </NextIntlClientProvider>,
  );
}

const submitButton = () => screen.queryByRole('button', { name: 'Gửi yêu cầu xác minh' });

describe('Trạng thái xác minh của exporter (I1, I2)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('chưa xác minh: hiện trạng thái và nút gửi yêu cầu', async () => {
    serve({ company: company() });
    renderPanel();
    expect(await screen.findByText('Chưa xác minh')).toBeInTheDocument();
    expect(submitButton()).toBeInTheDocument();
  });

  it('nói rõ: hoàn thiện hồ sơ và nộp bằng chứng không đồng nghĩa đã xác minh', async () => {
    serve({ company: company() });
    renderPanel();
    expect(await screen.findByText(/không đồng nghĩa đã xác minh/)).toBeInTheDocument();
  });

  it('gửi yêu cầu: gọi POST, đổi sang Đang chờ duyệt và ẩn nút', async () => {
    serve({ company: company() });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Gửi yêu cầu xác minh' }));
    expect(await screen.findByText('Đang chờ duyệt')).toBeInTheDocument();
    expect(calls.filter((c) => c.method === 'POST')).toEqual([{ method: 'POST', path: '/api/exporter/verification-requests' }]);
    expect(submitButton()).not.toBeInTheDocument();
  });

  it('đang chờ duyệt: không có nút gửi', async () => {
    serve({ company: company({ verification_status: 'pending' }), requests: [request()] });
    renderPanel();
    expect(await screen.findByText('Đang chờ duyệt')).toBeInTheDocument();
    expect(submitButton()).not.toBeInTheDocument();
  });

  it('đã xác minh: hiện ngày hết hạn, mức cơ bản và không có nút gửi', async () => {
    serve({ company: company({ verification_status: 'verified', verified_at: '2026-09-01T00:00:00Z', expires_at: '2027-09-01T00:00:00Z' }) });
    renderPanel();
    expect(await screen.findByText('Đã xác minh')).toBeInTheDocument();
    expect(screen.getByText(/Mức cơ bản/)).toBeInTheDocument();
    expect(screen.getByText(/2027/)).toBeInTheDocument();
    expect(submitButton()).not.toBeInTheDocument();
  });

  it('đã xác minh mức EVFTA: nói rõ đủ bằng chứng bắt buộc còn hạn', async () => {
    serve({ company: company({ verification_status: 'verified', verification_level: 'evfta_verified', expires_at: '2027-09-01T00:00:00Z' }) });
    renderPanel();
    expect(await screen.findByText(/EVFTA-verified/)).toBeInTheDocument();
  });

  it('bị từ chối: hiện lý do của quản trị viên và cho gửi lại', async () => {
    serve({
      company: company({ verification_status: 'rejected' }),
      requests: [request({ status: 'rejected', decision_reason: 'Sai mã số thuế', reviewed_at: '2026-09-30T00:00:00Z' })],
    });
    renderPanel();
    expect(await screen.findByText('Bị từ chối')).toBeInTheDocument();
    expect(screen.getByText(/Sai mã số thuế/)).toBeInTheDocument();
    expect(submitButton()).toBeInTheDocument();
  });

  it('được yêu cầu bổ sung: hiện lý do và cho gửi lại', async () => {
    serve({
      company: company({ verification_status: 'unverified' }),
      requests: [request({ status: 'info_requested', decision_reason: 'Bổ sung giấy phép', reviewed_at: '2026-09-30T00:00:00Z' })],
    });
    renderPanel();
    expect(await screen.findByText(/Bổ sung giấy phép/)).toBeInTheDocument();
    expect(screen.getByText('Cần bổ sung')).toBeInTheDocument();
    expect(submitButton()).toBeInTheDocument();
  });

  it('chỉ hiện lý do của yêu cầu gần nhất', async () => {
    serve({
      company: company({ verification_status: 'rejected' }),
      requests: [
        request({ id: 'r-2', status: 'rejected', decision_reason: 'Lý do mới', submitted_at: '2026-10-02T00:00:00Z' }),
        request({ id: 'r-1', status: 'info_requested', decision_reason: 'Lý do cũ', submitted_at: '2026-09-29T00:00:00Z' }),
      ],
    });
    renderPanel();
    expect(await screen.findByText(/Lý do mới/)).toBeInTheDocument();
    expect(screen.queryByText(/Lý do cũ/)).not.toBeInTheDocument();
  });

  it('gửi lỗi 409: hiện thông báo và không đổi trạng thái', async () => {
    serve({ company: company(), submit: () => json(409, {}) });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Gửi yêu cầu xác minh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('không gửi thêm được');
    expect(screen.getByText('Chưa xác minh')).toBeInTheDocument();
  });

  it('mất kết nối khi gửi: báo lỗi và cho thử lại', async () => {
    serve({
      company: company(),
      submit: () => {
        throw new TypeError('network');
      },
    });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Gửi yêu cầu xác minh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không kết nối được máy chủ');
    await waitFor(() => expect(submitButton()).toBeEnabled());
  });

  it('chưa có hồ sơ công ty: hướng dẫn tạo hồ sơ, không có nút gửi', async () => {
    serve({ company404: true });
    renderPanel();
    expect(await screen.findByRole('status')).toHaveTextContent('tạo hồ sơ doanh nghiệp');
    expect(submitButton()).not.toBeInTheDocument();
  });

  it('bản tiếng Anh dùng nhãn tiếng Anh', async () => {
    serve({ company: company() });
    renderPanel('en');
    expect(await screen.findByRole('button', { name: 'Submit verification request' })).toBeInTheDocument();
  });
});
