'use client';

// Thanh mức độ hoàn thiện hồ sơ + danh sách việc cần bổ sung (B3).
// Điểm này chỉ đo mức đầy đủ của hồ sơ — KHÔNG phải kết quả xác minh: không đặt cạnh huy hiệu xác minh.
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getCompleteness, type Completeness } from '../lib/companyApi';

const FIELD_LABELS: Record<string, string> = {
  tax_id: 'Mã số thuế / ĐKKD',
  business_model: 'Mô hình kinh doanh',
  founded_year: 'Năm thành lập',
  address: 'Địa chỉ',
  description_en: 'Mô tả tiếng Anh (≥ 150 ký tự)',
  description_vi: 'Mô tả tiếng Việt (≥ 150 ký tự)',
  website: 'Website',
  logo: 'Logo',
  industry_sector: 'Ngành hàng',
  export_markets: 'Thị trường xuất khẩu',
  foreign_language: 'Ngoại ngữ nhân viên',
  product_hs: 'Sản phẩm kèm mã HS',
  product_image: 'Ảnh sản phẩm',
  product_description: 'Mô tả sản phẩm (≥ 30 ký tự)',
  product_price: 'Giá sản phẩm',
  evidence: 'Bằng chứng đã nộp',
  sourcing_categories: 'Nhóm hàng quan tâm',
  vat_or_eori: 'Mã VAT hoặc EORI',
  company_size: 'Quy mô công ty',
  procurement_estimate: 'Ước lượng mua hàng',
  business_type: 'Loại hình doanh nghiệp',
};

// Nhóm trọng số → bước của form hồ sơ chứa ô cần điền (1 = công ty, 2 = sản phẩm, 3 = giấy phép/bằng chứng).
const GROUP_STEP: Record<string, number> = {
  legal: 1,
  intro: 1,
  capability: 1,
  needs: 1,
  profile: 1,
  products: 2,
  evidence: 3,
};

/** Phần trăm hiển thị: làm tròn XUỐNG để không bao giờ khoe 100% khi hồ sơ chưa đủ. */
export function displayPercent(score: string): number {
  const value = Number(score);
  if (!Number.isFinite(value)) return 0;
  return value >= 100 ? 100 : Math.max(0, Math.floor(value));
}

interface CompletenessCardProps {
  /** Mở form hồ sơ ở đúng bước chứa phần còn thiếu. */
  onNavigate?: (step: number) => void;
}

export default function CompletenessCard({ onNavigate }: CompletenessCardProps) {
  const { tr } = useLanguage();
  const [state, setState] = useState<Completeness | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    getCompleteness().then((result) => {
      if (active) setState(result);
    });
    return () => {
      active = false;
    };
  }, []);

  const title = tr('Mức độ hoàn thiện hồ sơ');
  return (
    <section
      aria-label={title}
      className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs text-left"
    >
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>

      {state === undefined && (
        <p aria-busy="true" className="mt-3 text-xs text-slate-600">
          {tr('Đang tính điểm hoàn thiện…')}
        </p>
      )}

      {state === null && (
        <p role="alert" className="mt-3 text-xs text-rose-700">
          {tr('Không tải được điểm hoàn thiện hồ sơ.')}
        </p>
      )}

      {state && (
        <>
          <div className="mt-3 flex items-center gap-3">
            <div
              role="progressbar"
              aria-label={title}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={displayPercent(state.score)}
              className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200"
            >
              <div className="h-full rounded-full bg-[#0b5e52]" style={{ width: `${displayPercent(state.score)}%` }} />
            </div>
            <span className="text-sm font-bold text-slate-900">{`${displayPercent(state.score)}% ${tr('hoàn thiện')}`}</span>
          </div>

          {state.missing.length === 0 ? (
            <p className="mt-3 text-xs text-emerald-800">{tr('Hồ sơ đã đầy đủ thông tin cần thiết.')}</p>
          ) : (
            <ul aria-label={tr('Việc cần bổ sung')} className="mt-3 flex flex-wrap gap-2">
              {state.missing.map((item) => (
                <li key={item.field}>
                  <button
                    type="button"
                    onClick={() => onNavigate?.(GROUP_STEP[item.group] ?? 1)}
                    className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 cursor-pointer"
                  >
                    {tr(FIELD_LABELS[item.field] ?? item.field)}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-3 text-[11px] leading-5 text-slate-600">
            {tr('Điểm này chỉ đo mức đầy đủ của hồ sơ, không phải kết quả xác minh.')}
          </p>
        </>
      )}
    </section>
  );
}
