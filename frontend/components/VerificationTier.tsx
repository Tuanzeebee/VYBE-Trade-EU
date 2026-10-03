'use client';

// Cấp xác minh của doanh nghiệp (U20, ADR-0004): cấp hiện tại, yêu cầu của từng cấp, gửi yêu cầu lên
// cấp. Cấp do quản trị viên quyết định; danh sách kiểm chỉ để bạn chuẩn bị hồ sơ.
import React, { useCallback, useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import { getTierOverview, requestTier, TIER_REQUEST_ERRORS, type TierOverview, type TierRequirement } from '../lib/verificationApi';
import { TIER_LABELS, TIER_SCOPES } from './TierBadge';

export const REQUIREMENT_STATES: Record<TierRequirement['state'], string> = {
  met: 'Đã đạt',
  pending: 'Đang chờ duyệt',
  missing: 'Chưa có',
  manual: 'Quản trị viên kiểm tay',
};
export const REQUIREMENT_TONES: Record<TierRequirement['state'], string> = {
  met: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  missing: 'bg-slate-100 text-slate-700',
  manual: 'bg-sky-100 text-sky-800',
};

export default function VerificationTier() {
  const { tr, language } = useLanguage();
  const [data, setData] = useState<TierOverview | null | undefined>(undefined);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => setData(await getTierOverview()), []);
  useEffect(() => {
    void load();
  }, [load]);

  if (!data) return null;
  const date = (iso: string) => new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'medium' }).format(new Date(iso));
  const tiers = [1, 2, 3].filter((tier) => data.requirements.some((r) => r.tier === tier));

  const ask = async () => {
    if (!data.next_tier) return;
    setMessage(null);
    setBusy(true);
    const result = await requestTier(data.next_tier);
    setBusy(false);
    setMessage(result.ok ? { ok: true, text: 'Đã gửi yêu cầu lên cấp. Quản trị viên sẽ đối chiếu hồ sơ của bạn.' } : { ok: false, text: result.error });
    await load();
  };

  return (
    <section aria-label={tr('Cấp xác minh')} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Layers className="h-4 w-4 text-[#083832]" aria-hidden="true" />
          {tr('Cấp xác minh')}
        </h3>
        <span data-testid="current-tier" className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
          {tr(TIER_LABELS[data.tier])}
        </span>
      </div>
      {data.tier >= 1 && (
        <p className="mt-2 text-xs text-slate-600">
          {TIER_SCOPES[data.tier] ? tr(TIER_SCOPES[data.tier]) : null}
          {data.tier_reviewed_at && ` · ${tr('Ngày duyệt')}: ${date(data.tier_reviewed_at)}`}
          {data.tier_expires_at && ` · ${tr('Hiệu lực đến')}: ${date(data.tier_expires_at)}`}
        </p>
      )}

      {tiers.map((tier) => {
        const achieved = tier <= data.tier;
        const list = (
          <ul className="mt-1 space-y-1">
            {data.requirements
              .filter((r) => r.tier === tier)
              .map((r) => (
                <li key={r.code} className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                  <span>{language === 'en' ? r.label_en : r.label_vi}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${REQUIREMENT_TONES[r.state]}`}>{tr(REQUIREMENT_STATES[r.state])}</span>
                  {!r.is_required && <span className="text-xs text-slate-500">{tr('không bắt buộc')}</span>}
                </li>
              ))}
          </ul>
        );
        // Cấp đã đạt thu gọn: người dùng chỉ cần nhìn việc còn phải làm cho cấp kế tiếp.
        return achieved ? (
          <details key={tier} className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-900">
              {tr(`Cấp ${TIER_LABELS[tier]}`)}
              <span className="ml-2 text-xs font-normal text-emerald-700">{tr('đã đạt')}</span>
            </summary>
            {list}
          </details>
        ) : (
          <div key={tier} className="mt-4">
            <p className="text-sm font-semibold text-slate-900">{tr(`Cấp ${TIER_LABELS[tier]}`)}</p>
            {list}
          </div>
        );
      })}
      {data.requirements.some((r) => !r.reviewed) && (
        <p className="mt-3 text-[11px] text-slate-500">{tr('Danh sách yêu cầu đang là bản nháp, chờ bộ phận pháp lý duyệt.')}</p>
      )}

      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`mt-3 rounded-xl p-3 text-sm ${message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>
          {tr(message.text)}
        </p>
      )}
      {data.next_tier && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy || data.request_error !== null}
            onClick={() => void ask()}
            className="rounded-xl bg-[#083832] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {tr(`Yêu cầu duyệt cấp ${TIER_LABELS[data.next_tier]}`)}
          </button>
          {data.request_error === 'entitlement_required' && (
            <Link href="/pricing" className="text-sm font-semibold text-teal-800 underline">
              {tr('Đặt mua gói duyệt Nâng cao')}
            </Link>
          )}
          {data.request_error && data.request_error !== 'entitlement_required' && (
            <span className="text-xs text-slate-600">{tr(TIER_REQUEST_ERRORS[data.request_error] ?? '')}</span>
          )}
        </div>
      )}
    </section>
  );
}
