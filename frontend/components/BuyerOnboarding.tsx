'use client';

// Onboarding buyer (U5): bước 1 chỉ thông tin liên hệ cơ bản; bước 2 nhu cầu mua hàng — có thể bỏ qua
// và bổ sung sau ở "Hồ sơ công ty". Không hỏi VAT/EORI, không hỏi "cấp xác minh" buyer ở đây (demo 30/9:
// càng ít ô càng tốt; điều buyer cần nhất là nguồn cung ỔN ĐỊNH, không chỉ giá).
import { BrandMark } from './BrandMark';
import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Factory, Handshake, LogOut } from 'lucide-react';
import type { DemoUser } from '../lib/demoAuth';
import { COMPANY_SIZES, COUNTRIES } from '../lib/companyApi';
import { BUYER_BUSINESS_TYPES, emptyNeeds, type NeedsDraft } from '../lib/buyerNeedsApi';
import BuyerNeedsForm from './BuyerNeedsForm';
import LanguageSelect from './LanguageSelect';
import { useLanguage } from '../context/LanguageContext';

const STEPS = ['Thông tin công ty', 'Nhu cầu mua hàng'];
const INPUT =
  'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832]';
const LABEL = 'block text-sm font-semibold text-slate-700';

export default function BuyerOnboarding({
  user,
  initialCompany,
  initialNeeds,
  onComplete,
  onLogout,
}: {
  user: DemoUser;
  /** Hồ sơ đã lưu trên server (B2), đổi sang giá trị của form. */
  initialCompany?: Record<string, string>;
  initialNeeds?: NeedsDraft;
  onComplete: (profile: Record<string, string>, needs: NeedsDraft | null) => void | Promise<void>;
  onLogout: () => void;
}) {
  const { tr } = useLanguage();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<Record<string, string>>({
    companyName: user.company ?? '',
    country: user.profile?.country || '',
    city: '',
    businessType: 'importer',
    companySize: '',
    contactName: user.name ?? '',
    contactEmail: user.email ?? '',
    phone: user.profile?.phone || '',
    website: '',
    interest: '',
    ...initialCompany,
  });
  const [needs, setNeeds] = useState<NeedsDraft>(initialNeeds ?? emptyNeeds());
  const update = (field: string, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setError('');
  };

  async function finish(withNeeds: boolean) {
    setError('');
    setBusy(true);
    try {
      await onComplete(profile, withNeeds ? needs : null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu hồ sơ. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  function next(event: React.FormEvent) {
    event.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    void finish(true);
  }

  return (
    <div className="min-h-screen bg-[#f3f7f8] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8 lg:px-10">
          <span className="flex items-center gap-2 font-bold tracking-wide"><BrandMark className="h-7 w-7" />{tr('VYBE TRADE')}</span>
          <LanguageSelect />
          <div className="flex items-center gap-3">
            <span className="hidden max-w-52 truncate text-xs text-slate-500 sm:inline">{user.email}</span>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{tr('International Buyer')}</span>
            <button onClick={onLogout} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label={tr('Đăng xuất')}><LogOut className="h-5 w-5" /></button>
          </div>
        </div>
      </header>

      <nav aria-label={tr('Tiến trình Company Onboarding')} className="border-b border-slate-200 bg-white">
        <ol className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-5 py-5 sm:px-8 lg:px-10">
          {STEPS.map((label, index) => (
            <li key={label} className="shrink-0">
              <button
                type="button"
                disabled={index + 1 > step}
                aria-current={step === index + 1 ? 'step' : undefined}
                onClick={() => setStep(index + 1)}
                className={`flex items-center gap-2.5 rounded-lg text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm ${step === index + 1 ? 'text-[#083832]' : 'text-slate-500'}`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-full ${step === index + 1 ? 'bg-[#083832] text-white' : index + 1 < step ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {index + 1 < step ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                {tr(label)}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <main className="mx-auto grid max-w-7xl gap-7 px-5 py-8 sm:px-8 lg:grid-cols-12 lg:px-10 lg:py-10">
        <aside className="lg:col-span-4">
          <div className="rounded-3xl border border-teal-100 bg-gradient-to-br from-white to-teal-50 p-6 sm:p-8">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">{tr('COMPANY ONBOARDING • BUYER')}</span>
            <h1 className="mt-4 text-3xl font-bold leading-tight">
              {tr('Nguồn cung Việt Nam ổn định,')}<br /><span className="text-teal-800">{tr('đã được xác minh.')}</span>
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {tr('Đổi hoặc thêm nhà cung cấp mà ít rủi ro hơn: pháp lý, chứng nhận và năng lực của nhà cung cấp được kiểm tra trước khi hiện trong danh bạ.')}
            </p>
            <div className="mt-7 space-y-5">
              {[
                { icon: BadgeCheck, title: 'Nhà cung cấp đã xác minh', text: 'Chỉ doanh nghiệp đã được kiểm tra pháp lý mới hiện trong danh bạ.' },
                { icon: Factory, title: 'Năng lực rõ ràng', text: 'Sản lượng, quy cách, MOQ và thị trường đã xuất khẩu trên từng hồ sơ.' },
                { icon: Handshake, title: 'Làm việc trực tiếp', text: 'Nhắn tin và yêu cầu báo giá thẳng với nhà cung cấp.' },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="rounded-xl border border-slate-200 bg-white p-3 text-teal-800"><Icon className="h-5 w-5" /></span>
                  <div><h2 className="text-sm font-bold">{tr(title)}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{tr(text)}</p></div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:col-span-8" aria-labelledby="buyer-step-title">
          <div className="mb-6 border-b border-slate-100 pb-5">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">{tr(`Bước ${step} / ${STEPS.length}`)}</span>
            <h2 id="buyer-step-title" className="mt-2 text-xl font-bold sm:text-2xl">{tr(STEPS[step - 1])}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {tr(step === 1 ? 'Chỉ cần thông tin để nhà cung cấp liên hệ lại với bạn.' : 'Không bắt buộc — bạn có thể bỏ qua và bổ sung sau ở Hồ sơ công ty.')}
            </p>
          </div>
          <form onSubmit={next} className="space-y-5">
            {step === 1 && (
              <>
                <label className={LABEL}>
                  {tr('Tên công ty *')}
                  <input required maxLength={200} autoComplete="organization" className={INPUT} value={profile.companyName} onChange={(e) => update('companyName', e.target.value)} placeholder={tr('Ví dụ: Global Foods Trading Ltd.')} />
                </label>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className={LABEL}>
                    {tr('Quốc gia *')}
                    <select required className={INPUT} value={profile.country} onChange={(e) => update('country', e.target.value)}>
                      <option value="">{tr('Chọn quốc gia')}</option>
                      {COUNTRIES.filter((c) => c.code !== 'VN').map((c) => <option key={c.code} value={c.name}>{tr(c.name)}</option>)}
                    </select>
                  </label>
                  <label className={LABEL}>
                    {tr('Thành phố *')}
                    <input required maxLength={120} className={INPUT} value={profile.city} onChange={(e) => update('city', e.target.value)} placeholder={tr('Ví dụ: Hamburg')} />
                  </label>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className={LABEL}>
                    {tr('Người liên hệ *')}
                    <input required maxLength={255} autoComplete="name" className={INPUT} value={profile.contactName} onChange={(e) => update('contactName', e.target.value)} />
                  </label>
                  <label className={LABEL}>
                    {tr('Email liên hệ *')}
                    <input required type="email" autoComplete="email" className={INPUT} value={profile.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} />
                  </label>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className={LABEL}>
                    {tr('Loại hình doanh nghiệp')}
                    <select className={INPUT} value={profile.businessType} onChange={(e) => update('businessType', e.target.value)}>
                      {BUYER_BUSINESS_TYPES.map((t) => <option key={t.code} value={t.code}>{tr(t.label)}</option>)}
                    </select>
                  </label>
                  <label className={LABEL}>
                    {tr('Quy mô công ty (không bắt buộc)')}
                    <select className={INPUT} value={profile.companySize} onChange={(e) => update('companySize', e.target.value)}>
                      <option value="">{tr('Chọn quy mô')}</option>
                      {COMPANY_SIZES.map((s) => <option key={s.code} value={s.label}>{tr(s.label)}</option>)}
                    </select>
                  </label>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className={LABEL}>
                    {tr('Số điện thoại')}
                    <input type="tel" autoComplete="tel" className={INPUT} value={profile.phone} onChange={(e) => update('phone', e.target.value)} />
                  </label>
                  <label className={LABEL}>
                    {tr('Website')}
                    <input type="url" className={INPUT} value={profile.website} onChange={(e) => update('website', e.target.value)} placeholder="https://" />
                  </label>
                </div>
              </>
            )}
            {step === 2 && (
              <BuyerNeedsForm
                needs={needs}
                onChange={(value) => { setNeeds(value); setError(''); }}
                interest={profile.interest ?? ''}
                onInterestChange={(value) => update('interest', value)}
              />
            )}
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{tr(error)}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              {step === 2 ? (
                <button type="button" onClick={() => setStep(1)} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">
                  <ArrowLeft className="h-4 w-4" />{tr('Quay lại')}
                </button>
              ) : <span />}
              <div className="flex flex-wrap gap-2">
                {step === 2 && (
                  <button type="button" disabled={busy} onClick={() => void finish(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60">
                    {tr('Bỏ qua, bổ sung sau')}
                  </button>
                )}
                <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-xl bg-[#083832] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#062924] disabled:opacity-60">
                  {tr(step === 1 ? 'Tiếp tục' : 'Hoàn tất & tìm nhà cung cấp')}<ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
