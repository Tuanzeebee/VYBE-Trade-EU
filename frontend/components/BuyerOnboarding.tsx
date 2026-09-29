'use client';
import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, Check, Globe, LogOut, PackageSearch, ShieldCheck, Sprout } from 'lucide-react';
import type { DemoUser } from '../lib/demoAuth';
import { COMPANY_SIZES, COUNTRIES, INDUSTRIES, PROCUREMENT_ESTIMATES } from '../lib/companyApi';
import LanguageSelect from './LanguageSelect';
import { useLanguage } from "../context/LanguageContext";

const STEPS = ['Thông tin công ty', 'Nhu cầu tìm nguồn hàng', 'Tiêu chí xác minh', 'Xem lại & hoàn tất'];
const CERTIFICATES = ['ISO 22000', 'HACCP', 'GlobalG.A.P.', 'USDA Organic', 'EU Organic', 'Halal', 'BRCGS', 'ASC / BAP'];
const INPUT = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832]';
const LABEL = 'block text-sm font-semibold text-slate-700';

export default function BuyerOnboarding({ user, initialCompany, onComplete, onLogout }: {
  user: DemoUser;
  /** Hồ sơ đã lưu trên server (B2), đổi sang giá trị của form. */
  initialCompany?: Record<string, string>;
  onComplete: (profile: Record<string, string>) => void | Promise<void>;
  onLogout: () => void;
}) {
  const { tr } = useLanguage();
  const [step, setStep] = useState(1);
  const [furthestStep, setFurthestStep] = useState(1);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState({
    companyName: user.company, country: user.profile?.country || '', region: '', companySize: '',
    businessType: 'Nhà nhập khẩu', website: '', contactName: user.name, contactEmail: user.email,
    phone: user.profile?.phone || '', interest: user.profile?.interest || '', productDetails: '',
    quantity: '', unit: 'Tấn', frequency: '', market: user.profile?.market || '', incoterm: 'FOB',
    budget: '', minTrustLevel: 'L2', requiredCertificates: '', factoryAudit: 'false',
    traceability: 'false', verificationNotes: '', agreeCommitment: 'false',
    vatNumber: '', eoriNumber: '', procurementEstimate: '',
    ...initialCompany,
  });
  function update(field: keyof typeof profile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
    setError('');
  }
  function goTo(next: number) { setStep(next); setError(''); }
  function toggleCertificate(certificate: string) {
    const selected = profile.requiredCertificates.split(', ').filter(Boolean);
    update('requiredCertificates', (selected.includes(certificate)
      ? selected.filter((item) => item !== certificate) : [...selected, certificate]).join(', '));
  }
  function toggleInterest(label: string) {
    const selected = profile.interest.split(', ').filter(Boolean);
    update('interest', (selected.includes(label) ? selected.filter((item) => item !== label) : [...selected, label]).join(', '));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (step === 2 && !profile.interest.trim()) { setError('Vui lòng chọn ít nhất một nhóm hàng cần tìm.'); return; }
    if (step < 4) { setFurthestStep(Math.max(furthestStep, step + 1)); setStep(step + 1); return; }
    try { await onComplete(profile); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu hồ sơ. Vui lòng thử lại.'); }
  }

  return <div className="min-h-screen bg-[#f3f7f8] text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8 lg:px-10">
        <span className="flex items-center gap-2 font-bold tracking-wide"><Sprout className="h-7 w-7 text-[#0b5e52]" />{tr("VYBE TRADE")}</span>
        <LanguageSelect />
        <div className="flex items-center gap-3"><span className="hidden max-w-52 truncate text-xs text-slate-500 sm:inline">{user.email}</span><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{tr("International Buyer")}</span><button onClick={onLogout} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label={tr("Đăng xuất")}><LogOut className="h-5 w-5" /></button></div>
      </div>
    </header>
    <nav aria-label={tr("Tiến trình Company Onboarding")} className="border-b border-slate-200 bg-white">
      <ol className="mx-auto flex max-w-7xl gap-5 overflow-x-auto px-5 py-5 sm:px-8 lg:justify-between lg:px-10">
        {STEPS.map((label, index) => <li key={label} className="shrink-0"><button type="button" disabled={index + 1 > furthestStep} aria-current={step === index + 1 ? 'step' : undefined} onClick={() => goTo(index + 1)} className={`flex items-center gap-2.5 rounded-lg text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm ${step === index + 1 ? 'text-[#083832]' : 'text-slate-500'}`}><span className={`flex h-8 w-8 items-center justify-center rounded-full ${step === index + 1 ? 'bg-[#083832] text-white' : index + 1 < step ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{index + 1 < step ? <Check className="h-4 w-4" /> : index + 1}</span>{tr(label)}</button></li>)}
      </ol>
    </nav>
    <main className="mx-auto grid max-w-7xl gap-7 px-5 py-8 sm:px-8 lg:grid-cols-12 lg:px-10 lg:py-10">
      <aside className="lg:col-span-4">
        <div className="rounded-3xl border border-teal-100 bg-gradient-to-br from-white to-teal-50 p-6 sm:p-8">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700">{tr("COMPANY ONBOARDING • BUYER")}</span>
          <h1 className="mt-4 text-3xl font-bold leading-tight">{tr("Tìm nguồn hàng Việt Nam")}<br /><span className="text-teal-800">{tr("phù hợp với bạn.")}</span></h1>
          <p className="mt-4 text-sm leading-6 text-slate-500">{tr("Xây dựng hồ sơ mua hàng quốc tế để kết nối với nhà cung cấp theo nhu cầu và tiêu chí tin cậy của doanh nghiệp.")}</p>
          <div className="mt-7 space-y-5">{[
            { icon: Building2, title: 'Hồ sơ doanh nghiệp rõ ràng', text: 'Thông tin công ty, khu vực và quy mô mua hàng.' },
            { icon: PackageSearch, title: 'Nguồn cung đúng nhu cầu', text: 'Ngành hàng, sản lượng, lịch mua và điều kiện giao hàng.' },
            { icon: ShieldCheck, title: 'Tiêu chí xác minh minh bạch', text: 'Cấp độ tin cậy và chứng nhận bạn mong muốn.' },
          ].map(({ icon: Icon, title, text }) => <div key={title} className="flex items-start gap-3"><span className="rounded-xl border border-slate-200 bg-white p-3 text-teal-800"><Icon className="h-5 w-5" /></span><div><h2 className="text-sm font-bold">{tr(title)}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{tr(text)}</p></div></div>)}</div>
          <p className="mt-7 border-t border-teal-100 pt-4 text-xs leading-5 text-slate-500">{tr("Hồ sơ demo được lưu trên trình duyệt. Company Onboarding chỉ cần hoàn tất một lần cho tài khoản này.")}</p>
        </div>
      </aside>
      <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:col-span-8" aria-labelledby="buyer-step-title">
        <div className="mb-6 border-b border-slate-100 pb-5"><span className="text-xs font-bold uppercase tracking-wider text-teal-700">{tr("Bước ")}{tr(step)} {tr(" / 4")}</span><h2 id="buyer-step-title" className="mt-2 text-xl font-bold sm:text-2xl">{tr(STEPS[step - 1])}</h2><p className="mt-2 text-sm text-slate-500">{tr(['Giới thiệu doanh nghiệp và người đại diện mua hàng.', 'Mô tả sản phẩm và kế hoạch nhập khẩu của bạn.', 'Chọn những tiêu chí bạn yêu cầu ở nhà cung cấp Việt Nam.', 'Kiểm tra hồ sơ trước khi bắt đầu tìm nhà cung cấp.'][step - 1])}</p></div>
        <form onSubmit={submit} className="space-y-5">
          {step === 1 && <>
            <label className={LABEL}>{tr("Tên công ty *")}<input required maxLength={200} autoComplete="organization" className={INPUT} value={profile.companyName} onChange={(e) => update('companyName', e.target.value)} placeholder={tr("Ví dụ: Global Foods Trading Ltd.")} /></label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className={LABEL}>{tr("Quốc gia *")}<select required autoComplete="country-name" className={INPUT} value={profile.country} onChange={(e) => update('country', e.target.value)}><option value="">{tr("Chọn quốc gia")}</option>{COUNTRIES.map((country) => <option value={country.name} key={country.code}>{country.name}</option>)}</select></label>
              <label className={LABEL}>{tr("Khu vực *")}<select required className={INPUT} value={profile.region} onChange={(e) => update('region', e.target.value)}><option value="">{tr("Chọn khu vực")}</option>{['Bắc Mỹ', 'Châu Âu', 'Châu Á – Thái Bình Dương', 'Trung Đông', 'Châu Phi', 'Mỹ Latinh'].map((region) => <option value={region} key={region}>{tr(region)}</option>)}</select></label>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className={LABEL}>{tr("Quy mô công ty *")}<select required className={INPUT} value={profile.companySize} onChange={(e) => update('companySize', e.target.value)}><option value="">{tr("Chọn quy mô nhân sự")}</option>{COMPANY_SIZES.map((size) => <option value={size.label} key={size.code}>{tr(size.label)}</option>)}</select></label>
              <label className={LABEL}>{tr("Loại hình doanh nghiệp")}<select className={INPUT} value={profile.businessType} onChange={(e) => update('businessType', e.target.value)}>{['Nhà nhập khẩu', 'Nhà phân phối', 'Chuỗi bán lẻ', 'Nhà sản xuất thực phẩm', 'Đại lý thương mại'].map((type) => <option value={type} key={type}>{tr(type)}</option>)}</select></label>
            </div>
            <label className={LABEL}>{tr("Website công ty")}<input type="url" maxLength={300} autoComplete="url" className={INPUT} value={profile.website} onChange={(e) => update('website', e.target.value)} placeholder={tr("https://company.com")} /></label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className={LABEL}>{tr("Mã số VAT")}<input maxLength={32} className={INPUT} value={profile.vatNumber} onChange={(e) => update('vatNumber', e.target.value)} placeholder={tr("Ví dụ: DE123456789")} /></label>
              <label className={LABEL}>{tr("Mã EORI")}<input maxLength={20} className={INPUT} value={profile.eoriNumber} onChange={(e) => update('eoriNumber', e.target.value)} placeholder={tr("Ví dụ: DE123456789012345")} /></label>
            </div>
            <div className="grid gap-5 sm:grid-cols-2"><label className={LABEL}>{tr("Người liên hệ *")}<input required maxLength={120} autoComplete="name" className={INPUT} value={profile.contactName} onChange={(e) => update('contactName', e.target.value)} /></label><label className={LABEL}>{tr("Email liên hệ *")}<input required type="email" autoComplete="email" className={INPUT} value={profile.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} /></label></div>
            <label className={LABEL}>{tr("Điện thoại liên hệ")}<input type="tel" maxLength={40} autoComplete="tel" className={INPUT} value={profile.phone} onChange={(e) => update('phone', e.target.value)} placeholder={tr("+49…")} /></label>
          </>}
          {step === 2 && <>
            <fieldset><legend className={LABEL}>{tr("Nhóm hàng cần tìm *")}</legend><p className="mt-1 text-xs text-slate-500">{tr("Chọn một hoặc nhiều nhóm hàng bạn quan tâm.")}</p><div className="mt-3 grid grid-cols-2 gap-3">{INDUSTRIES.map((industry) => <label key={industry.code} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={profile.interest.split(', ').includes(industry.label)} onChange={() => toggleInterest(industry.label)} className="h-4 w-4 accent-teal-800" />{tr(industry.label)}</label>)}</div></fieldset>
            <label className={LABEL}>{tr("Sản phẩm và thông số mong muốn")}<textarea rows={3} maxLength={2000} className={INPUT} value={profile.productDetails} onChange={(e) => update('productDetails', e.target.value)} placeholder={tr("Ví dụ: Robusta Grade 1, độ ẩm tối đa 12.5%, bao đay 60kg…")} /></label>
            <div className="grid gap-5 sm:grid-cols-2"><label className={LABEL}>{tr("Khối lượng dự kiến mỗi đợt *")}<div className="flex gap-2"><input required type="number" min="0.01" step="0.01" className={INPUT} value={profile.quantity} onChange={(e) => update('quantity', e.target.value)} /><select aria-label={tr("Đơn vị khối lượng")} className={`${INPUT} max-w-36`} value={profile.unit} onChange={(e) => update('unit', e.target.value)}>{['Tấn', 'Kg', 'Container 20ft', 'Container 40ft'].map((unit) => <option value={unit} key={unit}>{tr(unit)}</option>)}</select></div></label><label className={LABEL}>{tr("Tần suất mua hàng *")}<select required className={INPUT} value={profile.frequency} onChange={(e) => update('frequency', e.target.value)}><option value="">{tr("Chọn tần suất")}</option>{['Đơn hàng thử nghiệm', 'Hàng tháng', 'Hàng quý', 'Theo mùa vụ', 'Hợp đồng dài hạn'].map((frequency) => <option value={frequency} key={frequency}>{tr(frequency)}</option>)}</select></label></div>
            <div className="grid gap-5 sm:grid-cols-2"><label className={LABEL}>{tr("Thị trường / cảng đến")}<input maxLength={200} className={INPUT} value={profile.market} onChange={(e) => update('market', e.target.value)} placeholder={tr("Ví dụ: Hamburg, Germany")} /></label><label className={LABEL}>{tr("Điều kiện giao hàng")}<select className={INPUT} value={profile.incoterm} onChange={(e) => update('incoterm', e.target.value)}>{['FOB', 'CIF', 'CFR', 'EXW', 'Thỏa thuận với nhà cung cấp'].map((term) => <option value={term} key={term}>{tr(term)}</option>)}</select></label></div>
            <label className={LABEL}>{tr("Ước lượng mua hàng mỗi năm")}<select className={INPUT} value={profile.procurementEstimate} onChange={(e) => update('procurementEstimate', e.target.value)}><option value="">{tr("Chọn mức ước lượng")}</option>{PROCUREMENT_ESTIMATES.map((estimate) => <option value={estimate.label} key={estimate.code}>{tr(estimate.label)}</option>)}</select></label>
            <label className={LABEL}>{tr("Ngân sách tham khảo")}<input maxLength={120} className={INPUT} value={profile.budget} onChange={(e) => update('budget', e.target.value)} placeholder={tr("Ví dụ: 2.500–3.000 USD/tấn; có thể để trống")} /></label>
          </>}
          {step === 3 && <>
            <fieldset><legend className={LABEL}>{tr("Cấp độ xác minh tối thiểu *")}</legend><div className="mt-3 grid gap-3 sm:grid-cols-3">{[{ level: 'L1', title: 'Basic Verified', description: 'Pháp nhân và mã số thuế' }, { level: 'L2', title: 'Enhanced Verified', description: 'Chứng nhận và năng lực' }, { level: 'L3', title: 'VYBE Certified', description: 'Thẩm định chuyên sâu' }].map(({ level, title, description }) => <label key={level} className={`cursor-pointer rounded-2xl border p-4 ${profile.minTrustLevel === level ? 'border-teal-700 bg-teal-50' : 'border-slate-200'}`}><span className="flex items-center justify-between"><ShieldCheck className="h-5 w-5 text-teal-700" /><input required type="radio" name="trust-level" value={level} checked={profile.minTrustLevel === level} onChange={() => update('minTrustLevel', level)} className="accent-teal-800" /></span><span className="mt-3 block text-sm font-bold">{tr(level)} {tr(" • ")}{tr(title)}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{tr(description)}</span></label>)}</div></fieldset>
            <fieldset><legend className={LABEL}>{tr("Chứng nhận yêu cầu")}</legend><p className="mt-1 text-xs text-slate-500">{tr("Chọn nhiều chứng nhận hoặc để trống nếu chưa có yêu cầu cụ thể.")}</p><div className="mt-3 grid grid-cols-2 gap-3">{CERTIFICATES.map((certificate) => <label key={certificate} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={profile.requiredCertificates.split(', ').includes(certificate)} onChange={() => toggleCertificate(certificate)} className="h-4 w-4 accent-teal-800" />{tr(certificate)}</label>)}</div></fieldset>
            <fieldset className="space-y-3 rounded-2xl bg-slate-50 p-4"><legend className="sr-only">{tr("Yêu cầu thẩm định bổ sung")}</legend>{([{ field: 'factoryAudit', text: 'Yêu cầu thẩm định thực địa / nhà máy' }, { field: 'traceability', text: 'Yêu cầu truy xuất nguồn gốc sản phẩm' }] as const).map(({ field, text }) => <label key={field} className="flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-teal-800" checked={profile[field] === 'true'} onChange={(e) => update(field, String(e.target.checked))} />{tr(text)}</label>)}</fieldset>
            <label className={LABEL}>{tr("Tiêu chí khác")}<textarea rows={3} maxLength={1000} className={INPUT} value={profile.verificationNotes} onChange={(e) => update('verificationNotes', e.target.value)} placeholder={tr("Ví dụ: SGS kiểm nghiệm trước xuất hàng, chứng nhận hữu cơ, yêu cầu đóng gói…")} /></label>
            <p className="rounded-xl bg-blue-50 p-4 text-xs leading-5 text-blue-800">{tr("Đây là tiêu chí tìm nguồn cung của Buyer, không phải chứng nhận đã được VYBE cấp cho doanh nghiệp của bạn.")}</p>
          </>}
          {step === 4 && <>
            {[
              { title: 'Thông tin công ty', target: 1, rows: [['Tên công ty', profile.companyName], ['Quốc gia / khu vực', `${profile.country} / ${profile.region}`], ['Quy mô', profile.companySize], ['Loại hình', profile.businessType], ['Người liên hệ', profile.contactName], ['Email', profile.contactEmail], ['Điện thoại', profile.phone], ['Website', profile.website], ['Mã số VAT', profile.vatNumber], ['Mã EORI', profile.eoriNumber]] },
              { title: 'Nhu cầu tìm nguồn hàng', target: 2, rows: [['Nhóm hàng', profile.interest], ['Ước lượng mua hàng', profile.procurementEstimate], ['Khối lượng mỗi đợt', `${profile.quantity} ${profile.unit}`], ['Tần suất', profile.frequency], ['Điểm đến', profile.market], ['Giao hàng', profile.incoterm], ['Ngân sách', profile.budget], ['Thông số sản phẩm', profile.productDetails]] },
              { title: 'Tiêu chí xác minh', target: 3, rows: [['Cấp độ tối thiểu', profile.minTrustLevel], ['Chứng nhận', profile.requiredCertificates || 'Chưa có yêu cầu cụ thể'], ['Thẩm định thực địa', profile.factoryAudit === 'true' ? 'Có' : 'Không yêu cầu'], ['Truy xuất nguồn gốc', profile.traceability === 'true' ? 'Có' : 'Không yêu cầu'], ['Tiêu chí khác', profile.verificationNotes]] },
            ].map(({ title, target, rows }) => <section key={title} className="rounded-2xl border border-slate-200 p-4 sm:p-5"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-sm font-bold">{tr(title)}</h3><button type="button" onClick={() => goTo(target)} className="text-xs font-semibold text-teal-700 hover:underline" aria-label={tr(`Sửa ${title.toLowerCase()}`)}>{tr("Sửa")}</button></div><dl className="space-y-3">{rows.map(([label, value]) => <div key={label} className="grid gap-1 text-xs sm:grid-cols-3 sm:gap-3"><dt className="text-slate-500">{tr(label)}</dt><dd className="break-words font-semibold sm:col-span-2">{tr(value || 'Chưa cung cấp')}</dd></div>)}</dl></section>)}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-teal-50 p-4 text-sm leading-6 text-teal-900"><input required type="checkbox" checked={profile.agreeCommitment === 'true'} onChange={(e) => update('agreeCommitment', String(e.target.checked))} className="mt-1 h-4 w-4 shrink-0 accent-teal-800" />{tr("Tôi xác nhận thông tin công ty và nhu cầu mua hàng đã được kiểm tra, sẵn sàng kết nối với nhà cung cấp Việt Nam.")}</label>
          </>}
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{tr(error)}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5"><button type="button" disabled={step === 1} onClick={() => goTo(step - 1)} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"><ArrowLeft className="h-4 w-4" />{tr("Quay lại")}</button><button type="submit" className="flex items-center gap-2 rounded-xl bg-[#083832] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#062924]">{tr(step === 4 ? 'Hoàn tất & tìm nhà cung cấp' : 'Tiếp tục')}{step === 4 ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</button></div>
        </form>
      </section>
    </main>
    <footer className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-5 pb-7 text-xs text-slate-500"><Globe className="h-4 w-4" />{tr("VYBE Trade • Kết nối nguồn cung Việt Nam với Buyer toàn cầu")}</footer>
  </div>;
}
