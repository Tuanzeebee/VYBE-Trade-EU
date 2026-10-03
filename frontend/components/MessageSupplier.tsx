'use client';

// Nhắn tin trực tiếp cho nhà cung cấp, không cần gửi RFQ trước (U7). Đã có hội thoại với công ty này
// thì tin được gửi tiếp vào đó; xong chuyển sang trang tin nhắn và chọn sẵn hội thoại.
import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Link, useRouter } from '../i18n/navigation';
import { useDemoSession } from './app-shell/useDemoSession';
import { startConversation, type StartError } from '../lib/conversationsApi';

const ERRORS: Record<StartError, string> = {
  rate_limited: 'Bạn đã mở quá nhiều hội thoại mới hôm nay. Vui lòng thử lại vào ngày mai.',
  not_found: 'Nhà cung cấp này hiện không nhận tin nhắn.',
  company_required: 'Vui lòng hoàn thiện hồ sơ doanh nghiệp của bạn trước khi nhắn tin.',
  self: 'Bạn không thể nhắn tin cho chính công ty mình.',
  invalid: 'Vui lòng nhập nội dung tin nhắn.',
  unauthorized: 'Vui lòng đăng nhập để nhắn tin.',
  network: 'Không kết nối được máy chủ. Vui lòng thử lại.',
};

export default function MessageSupplier({ slug, supplierName }: { slug: string; supplierName: string }) {
  const { tr } = useLanguage();
  const router = useRouter();
  const { user, ready } = useDemoSession();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!ready) return null;
  if (!user) {
    return (
      <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
        {tr('Đăng nhập để nhắn tin')}
      </Link>
    );
  }
  if (user.role !== 'buyer' && user.role !== 'seller') return null;

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!body.trim()) return setError(ERRORS.invalid);
    setBusy(true);
    const outcome = await startConversation(slug, body.trim());
    setBusy(false);
    if (!outcome.ok) return setError(ERRORS[outcome.error]);
    router.push(`${user.role === 'buyer' ? '/buyer/messages' : '/exporter/messages'}?c=${outcome.data.id}`);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-[#083832] px-4 py-2 text-sm font-semibold text-white hover:bg-[#062924]"
      >
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
        {tr('Nhắn tin')}
      </button>
    );
  }

  return (
    <form onSubmit={send} aria-label={tr('Nhắn tin cho nhà cung cấp')} className="w-full space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
      <label htmlFor="direct-message" className="block text-xs font-semibold text-slate-700">
        {tr('Tin nhắn tới')} {supplierName}
      </label>
      <textarea
        id="direct-message"
        rows={3}
        maxLength={4000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={tr('Ví dụ: Chào anh chị, chúng tôi cần 2 container cá tra phi lê mỗi tháng, xin báo giá CIF Hamburg.')}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832]"
      />
      <p className="text-xs text-slate-500">{tr('Tin nhắn được dịch sang ngôn ngữ của người nhận.')}</p>
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {tr(error)}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="rounded-xl bg-[#083832] px-4 py-2 text-sm font-semibold text-white hover:bg-[#062924] disabled:opacity-60">
          {tr(busy ? 'Đang gửi...' : 'Gửi tin nhắn')}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
          {tr('Huỷ')}
        </button>
      </div>
    </form>
  );
}
