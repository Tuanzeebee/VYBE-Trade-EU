'use client';

// Hồ sơ công ty của buyer (U5): sửa thông tin liên hệ và "Hoàn thiện hồ sơ" — nhu cầu mua hàng. Trước
// đây buyer không sửa được gì sau onboarding và nhu cầu chỉ nằm trong trình duyệt.
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { COMPANY_SIZES, COUNTRIES, buyerProfileToCompany, companyToForm, getMyCompany, saveMyCompany } from '../lib/companyApi';
import { BUYER_BUSINESS_TYPES, emptyNeeds, getSourcingNeeds, needsFromServer, saveSourcingNeeds, type NeedsDraft } from '../lib/buyerNeedsApi';
import BuyerNeedsForm from './BuyerNeedsForm';

const INPUT =
  'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832]';
const LABEL = 'block text-sm font-semibold text-slate-700';

export default function BuyerProfile() {
  const { tr } = useLanguage();
  const [tab, setTab] = useState<'company' | 'needs'>('company');
  const [profile, setProfile] = useState<Record<string, string> | null>(null);
  const [needs, setNeeds] = useState<NeedsDraft>(emptyNeeds());
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getMyCompany(), getSourcingNeeds()]).then(([company, saved]) => {
      if (!active) return;
      setProfile(company ? companyToForm(company) : {});
      if (saved) setNeeds(needsFromServer(saved));
    });
    return () => {
      active = false;
    };
  }, []);

  if (profile === null) return <p className="p-6 text-sm text-slate-600">{tr('Đang tải hồ sơ doanh nghiệp…')}</p>;
  const update = (field: string, value: string) => setProfile((p) => ({ ...(p ?? {}), [field]: value }));

  async function save() {
    setStatus(null);
    setBusy(true);
    try {
      await saveMyCompany(buyerProfileToCompany(profile ?? {}));
      await saveSourcingNeeds(needs);
      setStatus({ kind: 'ok', text: 'Đã lưu hồ sơ.' });
    } catch (cause) {
      setStatus({ kind: 'error', text: cause instanceof Error ? cause.message : 'Không thể lưu hồ sơ. Vui lòng thử lại.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 text-left">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{tr('Hồ sơ công ty')}</h1>
        <p className="mt-1 text-sm text-slate-600">{tr('Nhu cầu càng rõ, nhà cung cấp phù hợp càng dễ tìm thấy và báo giá đúng cho bạn.')}</p>
      </div>
      <div role="tablist" aria-label={tr('Hồ sơ công ty')} className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-sm font-semibold">
        {(['company', 'needs'] as const).map((key) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-lg px-4 py-2 ${tab === key ? 'bg-[#083832] text-white' : 'text-slate-600'}`}>
            {tr(key === 'company' ? 'Thông tin công ty' : 'Nhu cầu mua hàng')}
          </button>
        ))}
      </div>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-5">
        {tab === 'company' ? (
          <>
            <label className={LABEL}>{tr('Tên công ty *')}<input required className={INPUT} value={profile.companyName ?? ''} onChange={(e) => update('companyName', e.target.value)} /></label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className={LABEL}>{tr('Quốc gia *')}
                <select className={INPUT} value={profile.country ?? ''} onChange={(e) => update('country', e.target.value)}>
                  <option value="">{tr('Chọn quốc gia')}</option>
                  {COUNTRIES.filter((c) => c.code !== 'VN').map((c) => <option key={c.code} value={c.name}>{tr(c.name)}</option>)}
                </select>
              </label>
              <label className={LABEL}>{tr('Thành phố *')}<input className={INPUT} value={profile.city ?? ''} onChange={(e) => update('city', e.target.value)} /></label>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className={LABEL}>{tr('Người liên hệ *')}<input className={INPUT} value={profile.contactName ?? ''} onChange={(e) => update('contactName', e.target.value)} /></label>
              <label className={LABEL}>{tr('Email liên hệ *')}<input type="email" className={INPUT} value={profile.contactEmail ?? ''} onChange={(e) => update('contactEmail', e.target.value)} /></label>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className={LABEL}>{tr('Loại hình doanh nghiệp')}
                <select className={INPUT} value={profile.businessType ?? ''} onChange={(e) => update('businessType', e.target.value)}>
                  {BUYER_BUSINESS_TYPES.map((t) => <option key={t.code} value={t.code}>{tr(t.label)}</option>)}
                </select>
              </label>
              <label className={LABEL}>{tr('Quy mô công ty (không bắt buộc)')}
                <select className={INPUT} value={profile.companySize ?? ''} onChange={(e) => update('companySize', e.target.value)}>
                  <option value="">{tr('Chọn quy mô')}</option>
                  {COMPANY_SIZES.map((s) => <option key={s.code} value={s.label}>{tr(s.label)}</option>)}
                </select>
              </label>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className={LABEL}>{tr('Số điện thoại')}<input type="tel" className={INPUT} value={profile.phone ?? ''} onChange={(e) => update('phone', e.target.value)} /></label>
              <label className={LABEL}>{tr('Website')}<input type="url" className={INPUT} value={profile.website ?? ''} onChange={(e) => update('website', e.target.value)} /></label>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className={LABEL}>{tr('Mã số VAT (không bắt buộc)')}<input className={INPUT} value={profile.vatNumber ?? ''} onChange={(e) => update('vatNumber', e.target.value)} placeholder="DE123456789" /></label>
              <label className={LABEL}>{tr('Mã EORI (không bắt buộc)')}<input className={INPUT} value={profile.eoriNumber ?? ''} onChange={(e) => update('eoriNumber', e.target.value)} /></label>
            </div>
          </>
        ) : (
          <BuyerNeedsForm needs={needs} onChange={setNeeds} interest={profile.interest ?? ''} onInterestChange={(value) => update('interest', value)} />
        )}
        {status && <p role={status.kind === 'error' ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ${status.kind === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>{tr(status.text)}</p>}
        <div className="flex justify-end border-t border-slate-100 pt-5">
          <button type="button" disabled={busy} onClick={save} className="rounded-xl bg-[#083832] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#062924] disabled:opacity-60">
            {tr(busy ? 'Đang lưu…' : 'Lưu hồ sơ')}
          </button>
        </div>
      </section>
    </div>
  );
}
