'use client';

// Tab "Hồ sơ doanh nghiệp" của seller (U1): chỉ hiện dữ liệu thật trên server — hồ sơ công ty, bằng chứng,
// sản phẩm, trạng thái xác minh. Trường chưa khai báo hiện "Chưa khai báo" kèm lối sửa, không bao giờ điền
// số hay chứng nhận mẫu (demo 30/9: khách thấy điểm 96/100 và "L2" giả trên màn hình này).
import React, { useEffect, useState } from 'react';
import { Award, Briefcase, Building2, Edit3, ExternalLink, Eye, Globe2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import {
  BUSINESS_MODELS,
  COMPANY_SIZES,
  INDUSTRIES,
  OFFERING_TYPES,
  STAFF_LANGUAGES,
  authorityDisplay,
  countryName,
  offersServices,
  type CompanyOut,
} from '../lib/companyApi';
import { listEvidence, type Evidence } from '../lib/evidenceApi';
import { getMyServices, type ServiceOffering } from '../lib/servicesApi';
import CompletenessCard from './CompletenessCard';
import { STATUS_BADGE } from './VerificationStatusCard';
import type { WorkspaceTabId } from './SellerWorkspace';

const APPROVAL_BADGE: Record<Evidence['approval_status'], { label: string; tone: string }> = {
  pending: { label: 'Chờ duyệt', tone: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Đã duyệt', tone: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Bị từ chối', tone: 'bg-rose-100 text-rose-800' },
};

interface Props {
  company: CompanyOut | null;
  /** null = đang tải; 'error' = không tải được. */
  /** Khối "Sản phẩm cung cấp" (thêm/sửa tại chỗ) do workspace cung cấp. */
  productsSlot?: React.ReactNode;
  onEdit: (step?: number) => void;
  onNavigateTab: (tab: WorkspaceTabId) => void;
}

/** Một khối nội dung: tiêu đề rõ, một câu giải thích "để làm gì", một nút hành động có chữ. */
function Section({
  id, icon, title, hint, action, children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  const { tr } = useLanguage();
  return (
    <section aria-labelledby={id} className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
      <header className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            {icon}
            <h2 id={id} className="text-base font-bold text-slate-900">{tr(title)}</h2>
          </div>
          {hint && <p className="mt-1 text-sm text-slate-600">{tr(hint)}</p>}
        </div>
        {action && (
          <button type="button" onClick={action.onClick} className="shrink-0 rounded-xl border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50 cursor-pointer">
            {tr(action.label)}
          </button>
        )}
      </header>
      {children}
    </section>
  );
}

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  const { tr } = useLanguage();
  const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-2 border-b border-slate-100 last:border-0">
      <dt className="text-slate-600">{tr(label)}</dt>
      <dd className={`sm:col-span-2 ${empty ? 'text-slate-400 italic' : `text-slate-800 font-semibold ${mono ? 'font-mono' : ''}`}`}>
        {empty ? tr('Chưa khai báo') : value}
      </dd>
    </div>
  );
}

export default function CompanyProfileView({ company, productsSlot, onEdit, onNavigateTab }: Props) {
  const { tr, language } = useLanguage();
  const [evidence, setEvidence] = useState<Evidence[] | null | 'error'>(null);
  const [services, setServices] = useState<ServiceOffering[]>([]);
  const providesServices = offersServices(company?.offering_type ?? undefined);
  useEffect(() => {
    let active = true;
    listEvidence().then((list) => active && setEvidence(list ?? 'error'));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!providesServices) return;
    let active = true;
    getMyServices().then((list) => active && setServices(list ?? []));
    return () => {
      active = false;
    };
  }, [providesServices]);

  if (!company) {
    return (
      <div className="space-y-8 text-left">
        <CompletenessCard onNavigate={(step) => onEdit(step)} />
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-700">
          {tr('Đang tải hồ sơ doanh nghiệp…')}
        </p>
      </div>
    );
  }

  const status = STATUS_BADGE[company.verification_status];
  const isVerified = company.verification_status === 'verified';
  const businessModel = BUSINESS_MODELS.find((m) => m.code === company.business_type)?.label;
  const industry =
    company.industry_sector === 'other' && company.industry_other
      ? company.industry_other
      : INDUSTRIES.find((i) => i.code === company.industry_sector)?.label;
  const offering = OFFERING_TYPES.find((o) => o.code === company.offering_type)?.label;
  const authority = authorityDisplay(company.issuing_authority);
  const staffSize = COMPANY_SIZES.find((c) => c.code === company.company_size)?.label;
  const description = (language === 'en' ? company.description_en || company.description_vi : company.description_vi || company.description_en) ?? '';
  const languages = company.languages_spoken.map((code) => STAFF_LANGUAGES.find((l) => l.code === code)?.label ?? code);
  const evidenceList = Array.isArray(evidence) ? evidence : [];

  const icon = (Icon: typeof Award) => <Icon className="w-5 h-5 text-teal-700" aria-hidden="true" />;

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      {/* 1. Tôi là ai và hồ sơ đang ở đâu: một tên, một trạng thái, một nút chính */}
      <div className="rounded-3xl bg-gradient-to-r from-[#083832] via-[#0b4d45] to-[#0a2f2a] p-5 sm:p-7 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white break-words">{company.legal_name}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.tone}`}>{tr(status.label)}</span>
            </div>
            <p className="text-teal-50 text-sm mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {company.founded_year && <span>{tr(`Thành lập: ${company.founded_year}`)}</span>}
              <span>{tr(countryName(company.country))}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => onEdit(1)}
              className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-white text-[#083832] text-sm font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-teal-50"
            >
              <Edit3 className="w-4 h-4" aria-hidden="true" />
              <span>{tr('Chỉnh sửa hồ sơ')}</span>
            </button>
            {isVerified ? (
              <Link
                href={`/suppliers/${encodeURIComponent(company.slug)}`}
                className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 text-sm font-bold flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" aria-hidden="true" />
                <span>{tr('Xem hồ sơ công khai')}</span>
              </Link>
            ) : (
              <div className="max-w-xs">
                <p className="text-xs text-teal-50">{tr('Hồ sơ công khai hiển thị với buyer sau khi doanh nghiệp được xác minh.')}</p>
                <button type="button" onClick={() => onNavigateTab('verification')} className="mt-1 text-sm font-bold text-teal-200 underline cursor-pointer">
                  {tr('Xem tiến trình xác minh')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Việc cần làm ngay: danh sách phần còn thiếu */}
      <CompletenessCard onNavigate={(step) => onEdit(step)} />

      {/* 3. Sản phẩm: thứ buyer quan tâm nhất, đặt đầu và rộng hết cỡ */}
      {productsSlot}

      {/* 4. Giới thiệu: buyer đọc đầu tiên */}
      <Section
        id="profile-about"
        icon={icon(Building2)}
        title="Giới thiệu doanh nghiệp"
        hint="Buyer đọc phần này đầu tiên khi xem hồ sơ."
        action={{ label: description ? 'Sửa giới thiệu' : 'Viết giới thiệu', onClick: () => onEdit(1) }}
      >
        {description ? (
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{description}</p>
        ) : (
          <p className="text-sm text-slate-600">{tr('Chưa có phần giới thiệu. Viết vài câu về nhà máy, sản phẩm chính và thị trường bạn muốn bán.')}</p>
        )}
      </Section>

      {/* 5. Chứng nhận: tóm tắt, quản lý ở mục riêng */}
      <Section
        id="profile-evidence"
        icon={icon(Award)}
        title="Chứng nhận & giấy phép"
        hint="Chứng nhận giúp buyer tin tưởng và giúp hồ sơ được xác minh."
        action={{ label: 'Quản lý chứng nhận', onClick: () => onNavigateTab('licenses') }}
      >
        {evidence === 'error' && <p role="alert" className="text-sm text-rose-700">{tr('Không tải được danh sách chứng nhận. Vui lòng thử lại.')}</p>}
        {Array.isArray(evidence) && evidenceList.length === 0 && (
          <p role="status" className="text-sm text-slate-600">{tr('Chưa có chứng nhận nào. Tải lên giấy phép kinh doanh và chứng nhận chất lượng để được xác minh.')}</p>
        )}
        <ul className="grid gap-3 sm:grid-cols-2">
          {evidenceList.map((item) => {
            const badge = APPROVAL_BADGE[item.approval_status];
            return (
              <li key={item.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <p className="text-sm font-bold text-slate-900">{language === 'en' ? item.type_name_en : item.type_name_vi}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                  <span className={`font-semibold px-2 py-0.5 rounded ${badge.tone}`}>{tr(badge.label)}</span>
                  {item.expires_at && <span className="text-slate-600">{tr(`Hết hạn: ${item.expires_at}`)}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* 6. Thông tin công ty: khai một lần, ít khi sửa → đặt cuối, gọn */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Section
          id="profile-legal"
          icon={icon(Building2)}
          title="Thông tin pháp lý & liên hệ"
          action={{ label: 'Sửa', onClick: () => onEdit(1) }}
        >
          <dl className="text-sm leading-relaxed">
            <Field label="Tên đăng ký kinh doanh" value={company.legal_name} />
            <Field label="Mã số thuế" value={company.tax_id} mono />
            <Field label="Mô hình kinh doanh" value={businessModel ? tr(businessModel) : null} />
            <Field label="Địa chỉ trụ sở" value={company.address} />
            <Field
              label="Người đại diện pháp luật"
              value={company.legal_rep_name ? [company.legal_rep_name, company.legal_rep_title].filter(Boolean).join(' — ') : null}
            />
            <Field
              label="Cơ quan cấp ĐKKD"
              value={
                authority.text ? (
                  <span>
                    {authority.text}
                    {authority.renamed && (
                      <span className="block text-xs font-normal text-slate-500">{tr(`Trên giấy tờ: ${company.issuing_authority}`)}</span>
                    )}
                  </span>
                ) : null
              }
            />
            <Field label="Email liên hệ" value={company.contact_email} />
            <Field label="Số điện thoại" value={company.phone} />
            <Field
              label="Website"
              value={
                company.website ? (
                  <a href={company.website} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline inline-flex items-center gap-1">
                    <span className="break-all">{company.website}</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                ) : null
              }
            />
          </dl>
        </Section>

        <Section
          id="profile-capability"
          icon={icon(Globe2)}
          title="Năng lực & thị trường"
          action={{ label: 'Sửa', onClick: () => onEdit(1) }}
        >
          <dl className="text-sm leading-relaxed">
            <Field label="Doanh nghiệp cung cấp" value={offering ? tr(offering) : null} />
            <Field label="Ngành hàng" value={industry ? tr(industry) : null} />
            <Field label="Quy mô nhân sự" value={staffSize ? tr(staffSize) : null} />
            <Field
              label="Thị trường đã xuất khẩu"
              value={
                company.export_markets.length > 0 ? (
                  <span className="flex flex-wrap gap-1.5">
                    {company.export_markets.map((code) => (
                      <span key={code} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-xs">
                        {tr(countryName(code))}
                      </span>
                    ))}
                  </span>
                ) : null
              }
            />
            <Field label="Ngôn ngữ làm việc" value={languages.length > 0 ? languages.map((l) => tr(l)).join(', ') : null} />
            {company.main_customers && <Field label="Khách hàng chính" value={company.main_customers} />}
          </dl>
        </Section>
      </div>

      {providesServices && (
        <Section
          id="profile-services"
          icon={icon(Briefcase)}
          title="Dịch vụ cung cấp"
          action={{ label: 'Sửa', onClick: () => onEdit(2) }}
        >
          {services.length === 0 ? (
            <p className="text-sm text-slate-600">{tr('Chưa có dịch vụ. Thêm ít nhất một dịch vụ để buyer và nhà xuất khẩu tìm thấy bạn.')}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {services.map((service) => (
                <li key={service.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <p className="text-sm font-bold text-slate-900">{service.title}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {language === 'vi' ? service.category_name_vi : service.category_name_en}
                    {service.coverage_countries.length > 0 && ` • ${service.coverage_countries.map((c) => tr(countryName(c))).join(', ')}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </div>
  );
}
