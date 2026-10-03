'use client';

// Nhu cầu mua hàng của buyer (U5) — hỏi SAU bước thông tin cơ bản, mọi ô đều tùy chọn. Dùng chung cho
// onboarding và trang "Hồ sơ công ty" của buyer. Chứng chỉ mong muốn là yêu cầu với NHÀ CUNG CẤP, không
// phải chứng chỉ buyer phải có (demo 30/9: buyer bị hiểu nhầm là phải nộp chứng chỉ).
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { COUNTRIES, INDUSTRIES } from '../lib/companyApi';
import { UNITS } from '../lib/productsApi';
import { FREQUENCIES, INCOTERMS, SUPPLIER_TIERS, WANTED_CERTIFICATES, type NeedsDraft } from '../lib/buyerNeedsApi';

const INPUT =
  'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832]';
const LABEL = 'block text-sm font-semibold text-slate-700';

interface Props {
  needs: NeedsDraft;
  onChange: (next: NeedsDraft) => void;
  /** Nhóm hàng quan tâm lưu ở công ty (sourcing_categories) — dạng nhãn, ngăn cách dấu phẩy. */
  interest: string;
  onInterestChange: (value: string) => void;
}

export default function BuyerNeedsForm({ needs, onChange, interest, onInterestChange }: Props) {
  const { tr } = useLanguage();
  const set = <K extends keyof NeedsDraft>(field: K, value: NeedsDraft[K]) => onChange({ ...needs, [field]: value });
  const interests = interest.split(', ').filter(Boolean);
  const toggleInterest = (label: string) =>
    onInterestChange((interests.includes(label) ? interests.filter((i) => i !== label) : [...interests, label]).join(', '));
  const toggleCert = (cert: string) =>
    set('certifications', needs.certifications.includes(cert) ? needs.certifications.filter((c) => c !== cert) : [...needs.certifications, cert]);

  // B11: chứng chỉ ngoài danh sách gợi ý ("Khác") — backend nhận chuỗi tự do, mỗi mục tối đa 64 ký tự.
  const parseOther = (text: string) => [...new Set(text.split(',').map((c) => c.trim().slice(0, 64)).filter(Boolean))];
  const otherCerts = needs.certifications.filter((c) => !WANTED_CERTIFICATES.includes(c));
  const [otherText, setOtherText] = useState(otherCerts.join(', '));
  // Hồ sơ tải về sau khi form đã dựng: đồng bộ ô nhập khi danh sách đổi từ bên ngoài.
  useEffect(() => {
    if (parseOther(otherText).join(', ') !== otherCerts.join(', ')) setOtherText(otherCerts.join(', '));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherCerts.join(', ')]);
  const changeOther = (text: string) => {
    setOtherText(text);
    set('certifications', [...needs.certifications.filter((c) => WANTED_CERTIFICATES.includes(c)), ...parseOther(text)]);
  };

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className={LABEL}>{tr('Nhóm hàng bạn cần')}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {INDUSTRIES.map((industry) => (
            <label key={industry.code} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold ${interests.includes(industry.label) ? 'border-[#083832] bg-teal-50 text-[#083832]' : 'border-slate-200 text-slate-600'}`}>
              <input type="checkbox" className="sr-only" checked={interests.includes(industry.label)} onChange={() => toggleInterest(industry.label)} />
              {tr(industry.label)}
            </label>
          ))}
        </div>
      </fieldset>

      <label className={LABEL}>
        {tr('Sản phẩm cụ thể')}
        <textarea rows={2} maxLength={2000} className={INPUT} value={needs.productsText} onChange={(e) => set('productsText', e.target.value)} placeholder={tr('Ví dụ: phi lê cá tra đông lạnh 120–170 g, đóng túi 1 kg')} />
      </label>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className={LABEL}>
          {tr('Khối lượng mỗi lần mua')}
          <input inputMode="decimal" className={INPUT} value={needs.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="40" />
        </label>
        <label className={LABEL}>
          {tr('Đơn vị')}
          <select className={INPUT} value={needs.quantityUnit} onChange={(e) => set('quantityUnit', e.target.value)}>
            {UNITS.map((u) => <option key={u.code} value={u.code}>{tr(u.label)}</option>)}
          </select>
        </label>
        <label className={LABEL}>
          {tr('Tần suất mua')}
          <select className={INPUT} value={needs.frequency} onChange={(e) => set('frequency', e.target.value)}>
            <option value="">{tr('Chọn')}</option>
            {FREQUENCIES.map((f) => <option key={f.code} value={f.code}>{tr(f.label)}</option>)}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className={LABEL}>{tr('Chứng chỉ bạn yêu cầu ở nhà cung cấp')}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {WANTED_CERTIFICATES.map((cert) => (
            <label key={cert} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold ${needs.certifications.includes(cert) ? 'border-[#083832] bg-teal-50 text-[#083832]' : 'border-slate-200 text-slate-600'}`}>
              <input type="checkbox" className="sr-only" checked={needs.certifications.includes(cert)} onChange={() => toggleCert(cert)} />
              {cert}
            </label>
          ))}
        </div>
        <label className={`${LABEL} mt-3`}>
          {tr('Chứng chỉ khác (cách nhau bằng dấu phẩy)')}
          <input className={INPUT} value={otherText} onChange={(e) => changeOther(e.target.value)} placeholder={tr('Ví dụ: SMETA, Kosher')} />
        </label>
      </fieldset>

      <label className={LABEL}>
        {tr('Cấp xác minh nhà cung cấp tối thiểu')}
        <select className={INPUT} value={needs.minSupplierTier} onChange={(e) => set('minSupplierTier', e.target.value)}>
          <option value="">{tr('Không yêu cầu')}</option>
          {SUPPLIER_TIERS.map((t) => <option key={t.code} value={t.code}>{tr(t.label)}</option>)}
        </select>
      </label>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className={LABEL}>
          {tr('Nước nhận hàng')}
          <select className={INPUT} value={needs.destinationCountry} onChange={(e) => set('destinationCountry', e.target.value)}>
            <option value="">{tr('Chọn')}</option>
            {COUNTRIES.filter((c) => c.code !== 'VN').map((c) => <option key={c.code} value={c.code}>{tr(c.name)}</option>)}
          </select>
        </label>
        <label className={LABEL}>
          {tr('Cảng nhận hàng')}
          <input maxLength={120} className={INPUT} value={needs.destinationPort} onChange={(e) => set('destinationPort', e.target.value)} placeholder={tr('Ví dụ: Hamburg')} />
        </label>
        <label className={LABEL}>
          {tr('Incoterm')}
          <select className={INPUT} value={needs.incoterm} onChange={(e) => set('incoterm', e.target.value)}>
            <option value="">{tr('Chưa rõ / thương lượng')}</option>
            {INCOTERMS.map((code) => <option key={code} value={code}>{code}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className={`${LABEL} sm:col-span-2`}>
          {tr('Ngân sách tham khảo (đơn giá)')}
          <input inputMode="decimal" className={INPUT} value={needs.budgetAmount} onChange={(e) => set('budgetAmount', e.target.value)} placeholder="2.90" />
        </label>
        <label className={LABEL}>
          {tr('Tiền tệ')}
          <select className={INPUT} value={needs.budgetCurrency} onChange={(e) => set('budgetCurrency', e.target.value as 'EUR' | 'USD')}>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </label>
      </div>

      <label className={LABEL}>
        {tr('Điều bạn quan tâm nhất ở nhà cung cấp')}
        <textarea rows={2} maxLength={2000} className={INPUT} value={needs.notes} onChange={(e) => set('notes', e.target.value)} placeholder={tr('Ví dụ: giao hàng đều mỗi tháng, chất lượng ổn định giữa các lô')} />
      </label>
    </div>
  );
}
