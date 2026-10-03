// Trang phương pháp điểm tín nhiệm (U23, ADR-0004): giải thích ba thành phần, tiêu chí và trọng số
// đang dùng (lấy từ API), các nguyên tắc. Render phía server.
import React from 'react';
import { translateText, type Locale } from '../i18n/translate';
import { fetchTrustCriteria } from '../lib/trustApi';

const COMPONENTS: { key: string; title: string; body: string }[] = [
  {
    key: 'documents',
    title: 'Giấy tờ đã kiểm (khoảng 35%)',
    body: 'Pháp lý doanh nghiệp, cấp xác minh, chứng nhận còn hạn và bằng chứng xuất khẩu đã được đội ngũ VYBE Trade đối chiếu.',
  },
  {
    key: 'automated',
    title: 'Kiểm tự động (khoảng 15%)',
    body: 'Email theo tên miền công ty, tuổi tên miền, website có tên công ty, đối chiếu sổ đăng ký (VIES, GLEIF, Cổng đăng ký doanh nghiệp) và địa chỉ.',
  },
  {
    key: 'behaviour',
    title: 'Hành vi trên nền tảng (khoảng 50%)',
    body: 'Tỷ lệ và tốc độ trả lời tin nhắn của buyer, tỷ lệ yêu cầu báo giá được báo giá, trong 90 ngày gần nhất.',
  },
];

const PRINCIPLES = [
  'Chỉ chấm dữ kiện kiểm chứng được; thông tin tự khai được gắn nhãn và không tính điểm.',
  'Tiêu chí và trọng số là dữ liệu có người duyệt; tiêu chí chưa duyệt không được dùng.',
  'Doanh nghiệp có dưới 3 hội thoại hoặc yêu cầu báo giá trong 90 ngày được gắn nhãn "Mới trên nền tảng" và chưa chấm phần hành vi.',
  'Điểm không phải chứng nhận hay xếp hạng tín dụng, không quyết định việc xác minh và không dùng để xếp thứ tự danh bạ.',
  'Doanh nghiệp luôn xem được điểm và từng thành phần của mình trong khu vực quản lý.',
];

export default async function TrustScoreMethod({ locale }: { locale: Locale }) {
  const t = (vi: string) => translateText(vi, locale);
  const criteria = (await fetchTrustCriteria()) ?? [];
  return (
    <main className="mx-auto max-w-4xl px-5 py-12 text-left sm:px-8">
      <h1 className="text-3xl font-extrabold text-slate-900">{t('Phương pháp tính điểm tín nhiệm')}</h1>
      <p className="mt-3 text-slate-600">
        {t('Điểm tín nhiệm (0–100) giúp buyer đánh giá nhanh một nhà cung cấp. Điểm do hệ thống VYBE Trade tính theo phương pháp dưới đây và luôn đi kèm điểm thành phần, ngày tính.')}
      </p>
      <section aria-label={t('Ba thành phần')} className="mt-8 grid gap-4 md:grid-cols-3">
        {COMPONENTS.map((component) => (
          <div key={component.key} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900">{t(component.title)}</h2>
            <p className="mt-2 text-sm text-slate-600">{t(component.body)}</p>
            <ul className="mt-3 space-y-1 text-xs text-slate-700">
              {criteria
                .filter((c) => c.component === component.key)
                .map((c) => (
                  <li key={c.fact_key} className="flex justify-between gap-2">
                    <span>{locale === 'en' ? c.label_en : c.label_vi}</span>
                    <span className="shrink-0 font-semibold">{Number(c.weight).toFixed(0)}</span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>
      {criteria.length === 0 && <p className="mt-4 text-sm text-slate-500">{t('Tiêu chí đang chờ bộ phận pháp lý duyệt.')}</p>}
      {criteria.some((c) => c.draft) && <p className="mt-4 text-xs font-semibold text-amber-700">{t('Tiêu chí đang là bản nháp minh hoạ, chờ duyệt.')}</p>}
      <section aria-label={t('Nguyên tắc')} className="mt-10">
        <h2 className="text-xl font-bold text-slate-900">{t('Nguyên tắc')}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
          {PRINCIPLES.map((p) => (
            <li key={p}>{t(p)}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
