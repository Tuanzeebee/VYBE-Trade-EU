'use client';

// Tab "Hồ sơ doanh nghiệp" của seller (U1): chỉ hiện dữ liệu thật trên server — hồ sơ công ty, bằng chứng,
// sản phẩm, trạng thái xác minh. Trường chưa khai báo hiện "Chưa khai báo" kèm lối sửa, không bao giờ điền
// số hay chứng nhận mẫu (demo 30/9: khách thấy điểm 96/100 và "L2" giả trên màn hình này).
import React, { useEffect, useState } from 'react';
import { Award, Briefcase, Building2, ChevronRight, Edit3, ExternalLink, Eye, Globe2, Package, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import {
  BUSINESS_MODELS,
  COMPANY_SIZES,
  FACILITY_CODE_TYPES,
  INDUSTRIES,
  OFFERING_TYPES,
  STAFF_LANGUAGES,
  authorityDisplay,
  countryName,
  offersProducts,
  offersServices,
  type CompanyOut,
} from '../lib/companyApi';
import { listEvidence, type Evidence } from '../lib/evidenceApi';
import { UNITS, formatMoq, formatPrice, type ProductOut } from '../lib/productsApi';
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
  products: ProductOut[] | null | 'error';
  onEdit: (step?: number) => void;
  onNavigateTab: (tab: WorkspaceTabId) => void;
}

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  const { tr } = useLanguage();
  const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1.5 border-b border-slate-50 last:border-0">
      <dt className="text-slate-500 font-medium">{tr(label)}</dt>
      <dd className={`sm:col-span-2 ${empty ? 'text-slate-400 italic' : `text-slate-800 font-semibold ${mono ? 'font-mono' : ''}`}`}>
        {empty ? tr('Chưa khai báo') : value}
      </dd>
    </div>
  );
}

export default function CompanyProfileView({ company, products, onEdit, onNavigateTab }: Props) {
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
  const unitLabel = UNITS.find((u) => u.code === company.capacity_unit)?.label ?? company.capacity_unit ?? '';
  const capacity = company.capacity_value
    ? `${Number(company.capacity_value).toLocaleString('vi-VN')} ${tr(unitLabel)} / ${tr(company.capacity_period === 'month' ? 'tháng' : 'năm')}`
    : null;
  const sellsProducts = offersProducts(company.offering_type ?? undefined);
  const description = (language === 'en' ? company.description_en || company.description_vi : company.description_vi || company.description_en) ?? '';
  const languages = company.languages_spoken.map((code) => STAFF_LANGUAGES.find((l) => l.code === code)?.label ?? code);
  const productList = Array.isArray(products) ? products : [];
  const evidenceList = Array.isArray(evidence) ? evidence : [];

  return (
    <div className="space-y-8 text-left animate-in fade-in duration-200">
      <CompletenessCard onNavigate={(step) => onEdit(step)} />

      <div className="rounded-3xl bg-gradient-to-r from-[#083832] via-[#0b4d45] to-[#0a2f2a] p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white break-words">{company.legal_name}</h1>
              <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${status.tone}`}>{tr(status.label)}</span>
            </div>
            <p className="text-teal-100/90 text-xs sm:text-sm mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {company.tax_id && <span>{tr(`MST: ${company.tax_id}`)}</span>}
              {company.founded_year && <span>{tr(`Thành lập: ${company.founded_year}`)}</span>}
              <span>{tr(countryName(company.country))}</span>
              {industry && <span>{tr(industry)}</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => onEdit(1)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center gap-2 border border-white/15 cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-teal-200" />
              <span>{tr('Chỉnh sửa hồ sơ')}</span>
            </button>
            {isVerified ? (
              <Link
                href={`/suppliers/${encodeURIComponent(company.slug)}`}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-bold flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                <span>{tr('Xem hồ sơ công khai')}</span>
              </Link>
            ) : (
              <p className="text-[11px] text-teal-100/90 max-w-xs">{tr('Hồ sơ công khai hiển thị với buyer sau khi doanh nghiệp được xác minh.')}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          <section aria-labelledby="profile-legal" className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
            <header className="flex items-center justify-between border-b border-slate-100 pb-4 mb-3">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-teal-700" />
                <h2 id="profile-legal" className="text-sm font-bold text-slate-900">{tr('Thông tin pháp lý & liên hệ')}</h2>
              </div>
              <button type="button" onClick={() => onEdit(1)} className="text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer">
                {tr('Sửa')}
              </button>
            </header>
            <dl className="text-xs leading-relaxed">
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
                        <span className="block text-[11px] font-normal text-slate-500">{tr(`Trên giấy tờ: ${company.issuing_authority}`)}</span>
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
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : null
                }
              />
            </dl>
          </section>

          <section aria-labelledby="profile-capability" className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
            <header className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-3">
              <Globe2 className="w-4 h-4 text-teal-700" />
              <h2 id="profile-capability" className="text-sm font-bold text-slate-900">{tr('Năng lực & thị trường')}</h2>
            </header>
            <dl className="text-xs leading-relaxed">
              <Field label="Doanh nghiệp cung cấp" value={offering ? tr(offering) : null} />
              <Field label="Ngành hàng" value={industry ? tr(industry) : null} />
              {sellsProducts && <Field label="Sản lượng có thể cung cấp" value={capacity} />}
              <Field label="Quy mô nhân sự" value={staffSize ? tr(staffSize) : null} />
              {sellsProducts && <Field label="Địa chỉ nhà máy / kho" value={company.factory_address} />}
              {FACILITY_CODE_TYPES.map((type) => {
                const codes = (company.facility_codes ?? []).filter((c) => c.code_type === type.code).map((c) => c.code);
                return codes.length > 0 ? <Field key={type.code} label={type.label} value={codes.join(', ')} mono /> : null;
              })}
              <Field
                label="Thị trường đã xuất khẩu"
                value={
                  company.export_markets.length > 0 ? (
                    <span className="flex flex-wrap gap-1.5">
                      {company.export_markets.map((code) => (
                        <span key={code} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
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
          </section>

          {providesServices && (
            <section aria-labelledby="profile-services" className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
              <header className="flex items-center justify-between border-b border-slate-100 pb-4 mb-3">
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 text-teal-700" />
                  <h2 id="profile-services" className="text-sm font-bold text-slate-900">{tr('Dịch vụ cung cấp')}</h2>
                </div>
                <button type="button" onClick={() => onEdit(2)} className="text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer">
                  {tr('Sửa')}
                </button>
              </header>
              {services.length === 0 ? (
                <p className="text-xs text-slate-600">{tr('Chưa có dịch vụ. Thêm ít nhất một dịch vụ để buyer và nhà xuất khẩu tìm thấy bạn.')}</p>
              ) : (
                <ul className="space-y-2">
                  {services.map((service) => (
                    <li key={service.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <p className="text-xs font-bold text-slate-900">{service.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {language === 'vi' ? service.category_name_vi : service.category_name_en}
                        {service.coverage_countries.length > 0 && ` • ${service.coverage_countries.map((c) => tr(countryName(c))).join(', ')}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section aria-labelledby="profile-about" className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
            <h2 id="profile-about" className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">{tr('Giới thiệu doanh nghiệp')}</h2>
            {description ? (
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{description}</p>
            ) : (
              <p className="text-xs text-slate-500">
                {tr('Chưa có phần giới thiệu. Buyer đọc phần này đầu tiên khi xem hồ sơ.')}{' '}
                <button type="button" onClick={() => onEdit(1)} className="font-semibold text-teal-700 hover:underline cursor-pointer">
                  {tr('Viết giới thiệu')}
                </button>
              </p>
            )}
          </section>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <section aria-labelledby="profile-evidence" className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <header className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-teal-700" />
                <h2 id="profile-evidence" className="text-sm font-bold text-slate-900">{tr('Chứng nhận & giấy phép')}</h2>
              </div>
              <button type="button" onClick={() => onNavigateTab('licenses')} className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer">
                <span>{tr('Quản lý')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </header>
            {evidence === 'error' && <p role="alert" className="text-xs text-rose-700">{tr('Không tải được danh sách chứng nhận. Vui lòng thử lại.')}</p>}
            {Array.isArray(evidence) && evidenceList.length === 0 && (
              <p role="status" className="text-xs text-slate-600">{tr('Chưa có chứng nhận nào. Tải lên giấy phép kinh doanh và chứng nhận chất lượng để được xác minh.')}</p>
            )}
            <ul className="space-y-3">
              {evidenceList.map((item) => {
                const badge = APPROVAL_BADGE[item.approval_status];
                return (
                  <li key={item.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <p className="text-xs font-bold text-slate-900">{language === 'en' ? item.type_name_en : item.type_name_vi}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[10px]">
                      <span className={`font-semibold px-1.5 py-0.5 rounded ${badge.tone}`}>{tr(badge.label)}</span>
                      {item.expires_at && <span className="text-slate-500">{tr(`Hết hạn: ${item.expires_at}`)}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="profile-products" className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <header className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-teal-700" />
                <h2 id="profile-products" className="text-sm font-bold text-slate-900">{tr('Sản phẩm cung cấp')}</h2>
              </div>
              <button type="button" onClick={() => onNavigateTab('products')} className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer">
                <span>{tr('Quản lý')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </header>
            {products === 'error' && <p role="alert" className="text-xs text-rose-700">{tr('Không tải được danh sách sản phẩm. Vui lòng thử lại.')}</p>}
            {Array.isArray(products) && productList.length === 0 && (
              <p role="status" className="text-xs text-slate-600">{tr('Chưa có sản phẩm. Thêm sản phẩm kèm mã HS để buyer tìm thấy bạn.')}</p>
            )}
            <ul className="space-y-3">
              {productList.map((product) => (
                <li key={product.id} className="p-3 rounded-2xl bg-white border border-slate-200 flex gap-3 items-center">
                  {product.images[0] ? (
                    <img src={product.images[0].url} alt={product.name} className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-100 shrink-0 border border-slate-200" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{product.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{product.hs_formatted}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {formatPrice(product, tr) || '—'}
                      {formatMoq(product, tr) ? ` • MOQ: ${formatMoq(product, tr)}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="profile-verification" className="p-5 rounded-3xl bg-slate-900 text-white shadow-md space-y-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-teal-300" />
              <h2 id="profile-verification" className="text-sm font-bold">{tr('Xác minh doanh nghiệp')}</h2>
            </div>
            <p className="text-xs text-slate-300">{tr(`Trạng thái hiện tại: ${status.label}`)}</p>
            <button
              type="button"
              onClick={() => onNavigateTab('verification')}
              className="w-full py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs cursor-pointer"
            >
              {tr('Xem tiến trình xác minh')}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
