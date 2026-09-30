'use client';

// Bảng xếp hạng nước EU theo (thuế nhập khẩu + VAT nhập khẩu). Nước chưa có dữ liệu đã duyệt KHÔNG hiện số.
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { EU_COUNTRIES } from '../lib/tariffApi';
import type { MarketsResult } from '../lib/marketsApi';

const LANGUAGES: Record<string, string> = { de: 'Tiếng Đức', fr: 'Tiếng Pháp', nl: 'Tiếng Hà Lan' };
const NAMES = Object.fromEntries(EU_COUNTRIES.map((c) => [c.code, c.name]));

export default function MarketRanking({ data }: { data: MarketsResult }) {
  const { tr, language } = useLanguage();
  const money = (value: string) =>
    new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'vi-VN', { style: 'currency', currency: 'EUR' }).format(Number(value));
  const pick = (vi: string | null, en: string | null) => (language === 'en' ? en || vi : vi);
  const ranked = data.rows.filter((r) => r.status === 'ranked');
  const missing = data.rows.filter((r) => r.status === 'no_data');

  if (data.status === 'unsupported') {
    return <p className="mt-6 text-base font-semibold text-slate-800">{tr('Mã HS này chưa được hỗ trợ. Vui lòng liên hệ để được tư vấn.')}</p>;
  }
  if (data.status === 'needs_review') {
    return (
      <p className="mt-6 text-base font-semibold text-amber-800">
        {tr('Trường hợp này cần kiểm tra thêm (ví dụ hạn ngạch hoặc thuế tuyệt đối), nên chúng tôi không đưa ra con số.')}
      </p>
    );
  }
  return (
    <section aria-label={tr('Thị trường nên xuất')} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-extrabold text-slate-900">{tr('Thị trường nên xuất')}</h2>
      <p className="mt-1 text-sm text-slate-600">
        {data.basis === 'evfta'
          ? tr('Tính theo thuế ưu đãi EVFTA (hàng đạt quy tắc xuất xứ, có C/O).')
          : tr('Tính theo thuế MFN vì chưa xác nhận hàng đạt quy tắc xuất xứ.')}
      </p>
      {ranked.length === 0 ? (
        <p className="mt-4 text-sm text-slate-700">{tr('Chưa có dữ liệu VAT đã duyệt cho mã HS này.')}</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {ranked.map((row) => (
            <li key={row.country} className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-900">
                {row.rank}. {NAMES[row.country] ?? row.country}
              </p>
              <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold text-slate-500">{tr('Thuế nhập khẩu')}</dt>
                  <dd className="font-semibold text-slate-900">{row.duty ? money(row.duty) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">
                    {tr('VAT nhập khẩu')} ({Number(row.vat_rate)}%)
                  </dt>
                  <dd className="font-semibold text-slate-900">{row.vat ? money(row.vat) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">{tr('Tổng')}</dt>
                  <dd className="font-bold text-[#083832]">{row.total ? money(row.total) : '—'}</dd>
                </div>
              </dl>
              {row.label_languages && (
                <p className="mt-2 text-xs text-slate-600">
                  {tr('Ngôn ngữ nhãn bắt buộc')}: {tr(LANGUAGES[row.label_languages] ?? row.label_languages)}
                </p>
              )}
              {pick(row.note, row.note_en) && <p className="mt-1 text-xs text-slate-600">{pick(row.note, row.note_en)}</p>}
            </li>
          ))}
        </ol>
      )}
      {missing.length > 0 && (
        <p className="mt-4 text-xs text-slate-500">
          {tr('Chưa có dữ liệu cho')} {missing.length} {tr('nước EU còn lại; chúng tôi không đoán số liệu.')}
        </p>
      )}
      <p className="mt-4 text-xs text-slate-500">
        {tr('VAT nhập khẩu thường được khấu trừ với nhà nhập khẩu đã đăng ký VAT; thuế nhập khẩu thì không được khấu trừ.')}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {tr('Kết quả chỉ mang tính tham khảo, không thay thế tư vấn pháp lý hoặc xác nhận của cơ quan hải quan.')}
      </p>
    </section>
  );
}
