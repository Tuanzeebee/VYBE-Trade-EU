// Điểm tín nhiệm seller (U23) dạng gọn, kèm biểu tượng (i): "do hệ thống VYBE Trade tính", liên kết
// trang phương pháp. Không dùng hook để render được phía server.
import React from 'react';
import { Info } from 'lucide-react';
import { Link } from '../i18n/navigation';
import { translateText, type Locale } from '../i18n/translate';
import type { TrustScore } from '../lib/trustApi';

export const TRUST_INFO = 'Điểm do hệ thống VYBE Trade tính theo phương pháp công bố tại /trust-score. Không phải chứng nhận hay xếp hạng tín dụng.';

export default function TrustScoreBadge({ trust, locale }: { trust: TrustScore; locale: Locale }) {
  const t = (vi: string) => translateText(vi, locale);
  if (trust.score === null || trust.score === undefined) return null;
  return (
    <span data-testid="trust-score" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800">
      {t('Điểm tín nhiệm')}: <strong className="text-[#083832]">{Number(trust.score).toFixed(0)}/100</strong>
      <abbr title={t(TRUST_INFO)} className="text-slate-600 no-underline">(*)</abbr>
      {trust.new_on_platform && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] text-sky-800">{t('Mới trên nền tảng')}</span>}
      <Link href="/trust-score" title={t(TRUST_INFO)} aria-label={t(TRUST_INFO)} className="text-slate-500 hover:text-slate-800">
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </span>
  );
}
