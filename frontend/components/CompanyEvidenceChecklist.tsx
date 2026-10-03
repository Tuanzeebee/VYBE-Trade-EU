'use client';

// Checklist bằng chứng cấp công ty theo mã HS và huy hiệu "EVFTA-verified" theo nhóm hàng
// (SPEC_compliance_data_20_codes §5.4, §7). Văn bản huy hiệu chỉ nói về C/O EUR.1 đã cấp trong 12
// tháng gần nhất — KHÔNG nói "hàng đạt xuất xứ EVFTA".
import React, { useEffect, useState } from 'react';
import HsCodePicker, { type HsCodeOption } from './HsCodePicker';
import UnreviewedNotice from './UnreviewedNotice';
import { useLanguage } from '../context/LanguageContext';
import { getMyCompany } from '../lib/companyApi';
import { fetchCompanyChecklist, type CompanyChecklist } from '../lib/complianceApi';

const STATE_LABEL: Record<string, string> = {
  approved: 'Đã duyệt, còn hạn',
  pending: 'Đang chờ duyệt',
  expired: 'Đã hết hạn',
  rejected: 'Bị từ chối',
  missing: 'Chưa nộp',
  not_mapped: 'Chưa có loại bằng chứng tương ứng để nộp',
};

const STATE_TONE: Record<string, string> = {
  approved: 'text-emerald-800',
  pending: 'text-amber-800',
  expired: 'text-rose-800',
  rejected: 'text-rose-800',
  missing: 'text-slate-700',
  not_mapped: 'text-slate-700',
};

const REASON: Record<string, string> = {
  COMPANY_NOT_VERIFIED: 'Công ty chưa được xác minh.',
  NO_BADGE_BASIS: 'Chưa có quy định bằng chứng EUR.1 cho mã hàng này.',
  MISSING_EVIDENCE: 'Còn thiếu bằng chứng bắt buộc được duyệt và còn hạn.',
};

const BLOCKS: Record<string, string> = {
  IMPORT: 'Chặn nhập khẩu nếu thiếu',
  TARIFF_PREFERENCE: 'Cần để hưởng ưu đãi thuế',
  NONE: 'Hồ sơ lưu',
};

export default function CompanyEvidenceChecklist() {
  const { tr, language } = useLanguage();
  const [companyId, setCompanyId] = useState<string | null | undefined>(undefined);
  const [hs, setHs] = useState<HsCodeOption | null>(null);
  const [data, setData] = useState<CompanyChecklist | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    getMyCompany().then((company) => active && setCompanyId(company?.id ?? null));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setData(null);
    setFailed(false);
    if (!companyId || !hs) return;
    let active = true;
    setLoading(true);
    fetchCompanyChecklist(companyId, hs.code).then((result) => {
      if (!active) return;
      setData(result);
      setFailed(result === null);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [companyId, hs]);

  if (companyId === null) return null;
  const name = (vi: string, en: string | null) => (language === 'vi' ? vi : en || vi);

  return (
    <section aria-label={tr('Huy hiệu EVFTA-verified theo nhóm hàng')} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
      <h2 className="text-xl font-extrabold text-slate-900">{tr('Huy hiệu EVFTA-verified theo nhóm hàng')}</h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        {tr('Chọn mã HS để xem bằng chứng cấp công ty cần có và huy hiệu của nhóm hàng đó.')}
      </p>
      <div className="mt-4 max-w-xl">
        <HsCodePicker label={tr('Sản phẩm (mã HS)')} value={hs} onChange={setHs} />
      </div>
      {loading && <p className="mt-4 text-sm text-slate-500">{tr('Đang tải...')}</p>}
      {failed && (
        <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {tr('Không tải được checklist. Vui lòng thử lại.')}
        </p>
      )}
      {data && (
        <div className="mt-5 space-y-4" data-testid="company-checklist">
          {data.badge && (
            <div
              data-testid="badge"
              className={`rounded-2xl border p-4 ${data.badge.granted ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}
            >
              <p className="text-sm font-semibold text-slate-700">{tr('Nhóm hàng')}: {data.badge.category}</p>
              {data.badge.granted ? (
                <p className="mt-1 text-base font-bold text-emerald-900">{name(data.badge.text_vi ?? '', data.badge.text_en)}</p>
              ) : (
                <>
                  <p className="mt-1 text-base font-bold text-slate-800">{tr('Chưa có huy hiệu cho nhóm hàng này')}</p>
                  {data.badge.reason && <p className="mt-1 text-sm text-slate-700">{tr(REASON[data.badge.reason] ?? data.badge.reason)}</p>}
                </>
              )}
            </div>
          )}
          <UnreviewedNotice state={data.review_state} />
          {data.items.length === 0 ? (
            <p className="text-sm text-slate-600">{tr('Mã hàng này không có bằng chứng cấp công ty bắt buộc.')}</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {data.items.map((item) => (
                <li key={item.code} className="p-3 text-sm">
                  <p className="font-semibold text-slate-900">{name(item.name_vi, item.name_en)}</p>
                  <p className="mt-1 text-xs text-slate-600">{tr(BLOCKS[item.blocks])}</p>
                  <p className={`mt-1 text-sm font-semibold ${STATE_TONE[item.state]}`}>{tr(STATE_LABEL[item.state])}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
