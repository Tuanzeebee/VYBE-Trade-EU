// Huy hiệu xác minh công khai (U20, ADR-0004): MỘT huy hiệu "Đã xác minh" kèm tên cấp; tooltip ghi ai
// kiểm, phạm vi, ngày duyệt và hạn. Không dùng hook để render được phía server.
import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { translateText, type Locale } from '../i18n/translate';

export const TIER_LABELS: Record<number, string> = { 0: 'Chưa xác minh', 1: 'Cơ bản', 2: 'Nâng cao', 3: 'Chuyên sâu' };
export const TIER_SCOPES: Record<number, string> = {
  1: 'Phạm vi: pháp lý doanh nghiệp (đăng ký kinh doanh, người đại diện).',
  2: 'Phạm vi: năng lực (chứng nhận đối chiếu tổ chức cấp, bằng chứng xuất khẩu).',
  3: 'Phạm vi: đánh giá nhà máy của bên thứ ba.',
};

export function tierTooltip(tier: number, locale: Locale, reviewedAt?: string | null, expiresAt?: string | null): string {
  const t = (vi: string) => translateText(vi, locale);
  const date = (iso: string) => new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'medium' }).format(new Date(iso));
  return [
    t('Kiểm bởi đội ngũ VYBE Trade'),
    reviewedAt ? `${t('Ngày duyệt')}: ${date(reviewedAt)}` : null,
    expiresAt ? `${t('Hiệu lực đến')}: ${date(expiresAt)}` : null,
    TIER_SCOPES[tier] ? t(TIER_SCOPES[tier]) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function TierBadge({
  tier,
  locale,
  reviewedAt,
  expiresAt,
}: {
  tier: number;
  locale: Locale;
  reviewedAt?: string | null;
  expiresAt?: string | null;
}) {
  const t = (vi: string) => translateText(vi, locale);
  const level = Math.min(Math.max(tier, 1), 3);
  return (
    <span
      data-testid="verified-badge"
      title={tierTooltip(level, locale, reviewedAt, expiresAt)}
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900"
    >
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{t('Đã xác minh')}</span>
      <span data-testid="verified-tier" className="font-semibold">
        · {t(TIER_LABELS[level])}
      </span>
    </span>
  );
}
