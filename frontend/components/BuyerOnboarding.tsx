'use client';

// Onboarding buyer, 4 bước như seller và dùng chung bộ component `onboarding/*` với seller:
// (1) thông tin doanh nghiệp, (2) giấy phép & chứng nhận — chỉ khai mã định danh (VAT, số đăng ký, LEI,
// cơ quan và địa chỉ đăng ký) để đối chiếu VIES / GLEIF, không tải file, được bỏ qua, (3) nhu cầu mua
// hàng — bắt buộc chọn nhóm hàng vì ghép nhà cung cấp dựa vào đó, (4) xem lại và hoàn tất. Có mã định
// danh thì yêu cầu xác minh tự gửi khi hoàn tất (xác minh buyer vẫn là tuỳ chọn). Không hỏi EORI.
import { BrandMark } from './BrandMark';
import React, { useState } from 'react';
import { BadgeCheck, Factory, Handshake, LogOut } from 'lucide-react';
import type { DemoUser } from '../lib/demoAuth';
import { COMPANY_SIZES, COUNTRIES, buyerHasIdentifier, isValidLei, normaliseLei } from '../lib/companyApi';
import { BUYER_BUSINESS_TYPES, emptyNeeds, type NeedsDraft } from '../lib/buyerNeedsApi';
import BuyerNeedsForm from './BuyerNeedsForm';
import LanguageSelect from './LanguageSelect';
import { OnboardingAside, OnboardingShell, OnboardingStepper, ReviewSection, StepHeader, StepNav } from './onboarding';
import { useLanguage } from '../context/LanguageContext';

const STEPS = ['Thông tin doanh nghiệp', 'Giấy phép & chứng nhận', 'Nhu cầu mua hàng', 'Xác nhận & hoàn tất'];
const STEP_HINTS = [
  'Chỉ cần thông tin để nhà cung cấp liên hệ lại với bạn.',
  'Không bắt buộc. Buyer không cần nộp chứng nhận sản phẩm; chỉ cần mã định danh doanh nghiệp để nhà cung cấp tin tưởng hơn.',
  'Cho biết bạn cần mua gì để hệ thống ghép nhà cung cấp phù hợp.',
  'Kiểm tra lại thông tin trước khi hoàn tất. Bạn có thể sửa bất cứ lúc nào ở Hồ sơ công ty.',
];
const NEEDS_REQUIRED = 'Vui lòng chọn ít nhất một nhóm hàng bạn cần để hệ thống ghép nhà cung cấp phù hợp.';
const LEI_INVALID = 'Mã LEI gồm 20 ký tự (chữ và số), hai ký tự cuối là số.';
const LAST_STEP = STEPS.length;
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

  const interests = (profile.interest ?? '').split(',').map((i) => i.trim()).filter(Boolean);
  const identified = buyerHasIdentifier(profile);

  function goTo(target: number) {
    setError('');
    setStep(target);
  }

  async function finish() {
    setError('');
    setBusy(true);
    try {
      await onComplete({ ...profile, leiCode: normaliseLei(profile.leiCode) }, needs);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu hồ sơ. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  function next(event: React.FormEvent) {
    event.preventDefault();
    if (step === 2 && profile.leiCode?.trim() && !isValidLei(profile.leiCode)) {
      setError(LEI_INVALID);
      return;
    }
    if (step === 3 && interests.length === 0) {
      setError(NEEDS_REQUIRED);
      return;
    }
    if (step < LAST_STEP) {
      goTo(step + 1);
      return;
    }
    void finish();
  }

  const header = (
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
  );

  const aside = (
    <OnboardingAside
      kicker="COMPANY ONBOARDING • BUYER"
      heading={<>{tr('Nguồn cung Việt Nam ổn định,')}<br /><span className="text-teal-800">{tr('đã được xác minh.')}</span></>}
      description={tr('Đổi hoặc thêm nhà cung cấp mà ít rủi ro hơn: pháp lý, chứng nhận và năng lực của nhà cung cấp được kiểm tra trước khi hiện trong danh bạ.')}
      benefits={[
        { icon: BadgeCheck, title: 'Nhà cung cấp đã xác minh', text: 'Chỉ doanh nghiệp đã được kiểm tra pháp lý mới hiện trong danh bạ.' },
        { icon: Factory, title: 'Năng lực rõ ràng', text: 'Sản lượng, quy cách, MOQ và thị trường đã xuất khẩu trên từng hồ sơ.' },
        { icon: Handshake, title: 'Làm việc trực tiếp', text: 'Nhắn tin và yêu cầu báo giá thẳng với nhà cung cấp.' },
      ]}
    />
  );

  const verificationRow = identified ? tr('Sẽ gửi tự động khi hoàn tất') : tr('Chưa khai');
  const none = tr('Chưa khai');

  return (
    <OnboardingShell
      header={header}
      stepper={<OnboardingStepper steps={STEPS} current={step} onSelect={goTo} />}
      aside={aside}
      cardLabelledBy="buyer-step-title"
    >
      <StepHeader step={step} total={LAST_STEP} title={STEPS[step - 1]} hint={STEP_HINTS[step - 1]} titleId="buyer-step-title" />
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
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className={LABEL}>
                {tr('Mã số VAT (không bắt buộc)')}
                <input maxLength={32} className={INPUT} value={profile.vatNumber ?? ''} onChange={(e) => update('vatNumber', e.target.value)} placeholder={tr('Ví dụ: DE123456789')} />
              </label>
              <label className={LABEL}>
                {tr('Số đăng ký doanh nghiệp (không bắt buộc)')}
                <input maxLength={64} className={INPUT} value={profile.registrationNumber ?? ''} onChange={(e) => update('registrationNumber', e.target.value)} placeholder={tr('Ví dụ: HRB 12345')} />
              </label>
              <label className={LABEL}>
                {tr('Mã LEI (không bắt buộc)')}
                <input maxLength={24} className={INPUT} value={profile.leiCode ?? ''} onChange={(e) => update('leiCode', e.target.value)} placeholder={tr('20 ký tự, ví dụ: 5493001KJTIIGC8Y1R12')} />
              </label>
              <label className={LABEL}>
                {tr('Cơ quan đăng ký (không bắt buộc)')}
                <input maxLength={255} className={INPUT} value={profile.issuingAuthority ?? ''} onChange={(e) => update('issuingAuthority', e.target.value)} placeholder={tr('Ví dụ: Handelsregister Hamburg')} />
              </label>
            </div>
            <label className={LABEL}>
              {tr('Địa chỉ đăng ký (không bắt buộc)')}
              <input maxLength={500} autoComplete="street-address" className={INPUT} value={profile.address ?? ''} onChange={(e) => update('address', e.target.value)} placeholder={tr('Đúng như trên giấy đăng ký doanh nghiệp')} />
            </label>
            <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              {tr('Hệ thống đối chiếu mã VAT với VIES và mã LEI với GLEIF; quản trị viên xem kết quả khi duyệt. Có mã định danh thì yêu cầu xác minh tự gửi khi hoàn tất. Không cần tải file; chưa xác minh bạn vẫn xem hồ sơ, nhắn tin và gửi yêu cầu báo giá trong hạn mức.')}
            </p>
          </>
        )}
        {step === 3 && (
          <BuyerNeedsForm
            needs={needs}
            onChange={(value) => { setNeeds(value); setError(''); }}
            interest={profile.interest ?? ''}
            onInterestChange={(value) => update('interest', value)}
          />
        )}
        {step === 4 && (
          <div className="space-y-4" data-testid="buyer-review">
            <ReviewSection
              title="Thông tin doanh nghiệp"
              onEdit={() => goTo(1)}
              rows={[
                [tr('Tên công ty'), profile.companyName],
                [tr('Quốc gia'), profile.country ? tr(profile.country) : ''],
                [tr('Thành phố'), profile.city],
                [tr('Người liên hệ'), profile.contactName],
                [tr('Email liên hệ'), profile.contactEmail],
              ]}
            />
            <ReviewSection
              title="Giấy phép & chứng nhận"
              onEdit={() => goTo(2)}
              rows={[
                [tr('Mã số VAT'), profile.vatNumber?.trim() || none],
                [tr('Số đăng ký doanh nghiệp'), profile.registrationNumber?.trim() || none],
                [tr('Mã LEI'), normaliseLei(profile.leiCode) || none],
                [tr('Cơ quan đăng ký'), profile.issuingAuthority?.trim() || none],
                [tr('Địa chỉ đăng ký'), profile.address?.trim() || none],
                [tr('Yêu cầu xác minh'), verificationRow],
              ]}
            />
            <ReviewSection
              title="Nhu cầu mua hàng"
              onEdit={() => goTo(3)}
              rows={[
                [tr('Nhóm hàng bạn cần'), interests.join(', ')],
                [tr('Sản phẩm cần mua'), needs.productsText.trim() || none],
                [tr('Nước nhận hàng'), needs.destinationCountry ? tr(COUNTRIES.find((c) => c.code === needs.destinationCountry)?.name ?? needs.destinationCountry) : none],
              ]}
            />
          </div>
        )}
        <StepNav
          error={error}
          onBack={step > 1 ? () => goTo(step - 1) : undefined}
          skip={step === 2 ? { label: 'Bỏ qua, bổ sung sau', onClick: () => goTo(3) } : undefined}
          nextLabel={step < LAST_STEP ? 'Tiếp tục' : 'Hoàn tất & tìm nhà cung cấp'}
          nextIcon={step < LAST_STEP ? 'arrow' : 'check'}
          nextDisabled={busy}
        />
      </form>
    </OnboardingShell>
  );
}
