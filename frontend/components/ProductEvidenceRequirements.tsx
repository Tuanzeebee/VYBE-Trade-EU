'use client';

// Bằng chứng cần chuẩn bị theo mã HS của từng sản phẩm đã khai (bước Giấy phép và chứng nhận).
// Dữ liệu từ bảng yêu cầu bằng chứng của máy tính tuân thủ; chưa biết trị giá lô hay nguồn nguyên liệu
// nên dòng có điều kiện kèm điều kiện để người dùng tự đối chiếu. Dòng chưa duyệt kèm lưu ý.
import React from 'react';
import UnreviewedNotice from './UnreviewedNotice';
import { useLanguage } from '../context/LanguageContext';
import type { ExporterRequirements, EvidenceItem } from '../lib/complianceApi';

const CONDITION: Record<string, string> = {
  ALWAYS: 'Luôn cần',
  IF_TRANSIT_THIRD_COUNTRY: 'Nếu hàng quá cảnh, lưu kho hoặc chia lô ở nước thứ ba',
  IF_WILD_CAUGHT: 'Nếu nguyên liệu đánh bắt tự nhiên',
  IF_AQUACULTURE: 'Nếu nguyên liệu nuôi trồng',
  IF_LISTED_2019_1793: 'Nếu mã hàng nằm trong phụ lục Quyết định 2019/1793',
  IF_NOT_PHYTO_EXEMPT: 'Nếu không thuộc danh mục miễn chứng nhận kiểm dịch thực vật',
  IF_FRESH_AND_NOT_PHYTO_EXEMPT: 'Nếu là hàng tươi và không thuộc danh mục miễn kiểm dịch thực vật',
};

const BLOCKS: Record<EvidenceItem['blocks'], string> = {
  IMPORT: 'Chặn nhập khẩu nếu thiếu',
  TARIFF_PREFERENCE: 'Cần để hưởng ưu đãi thuế',
  NONE: 'Hồ sơ lưu',
};

export default function ProductEvidenceRequirements({ data }: { data: ExporterRequirements | null }) {
  const { tr, language } = useLanguage();
  const products = (data?.products ?? []).filter((p) => p.items.length > 0);
  if (!data || products.length === 0) return null;
  const threshold = Number(data.eur1_threshold_eur).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-GB');

  const condition = (code: string) => {
    if (code === 'CONSIGNMENT_GT_6000') return tr(`Lô trên ${threshold} EUR`);
    if (code === 'CONSIGNMENT_LE_6000') return tr(`Lô từ ${threshold} EUR trở xuống`);
    return tr(CONDITION[code] ?? code);
  };

  return (
    <section
      aria-label={tr('Giấy tờ cần chuẩn bị theo sản phẩm của bạn')}
      className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4"
      data-testid="product-requirements"
    >
      <h3 className="text-sm font-bold text-slate-900">{tr('Giấy tờ cần chuẩn bị theo sản phẩm của bạn')}</h3>
      <p className="mt-1 text-xs text-slate-600">
        {tr('Theo mã HS bạn đã khai ở bước trước. Giấy tờ nào áp dụng còn tùy lô hàng cụ thể (trị giá, nguồn nguyên liệu, quá cảnh).')}
      </p>
      <UnreviewedNotice state={data.review_state} compact />
      <div className="mt-3 space-y-3">
        {products.map((product, index) => {
          const always = product.items.filter((item) => item.conditions.includes('ALWAYS') && item.status !== 'CHECK_REQUIRED');
          const depends = product.items.filter((item) => !always.includes(item));
          const row = (item: EvidenceItem) => (
            <li key={item.code} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <p className="font-semibold text-slate-900">{language === 'vi' ? item.name_vi : item.name_en || item.name_vi}</p>
              <p className="mt-0.5 text-xs text-slate-600">
                <span>{tr(BLOCKS[item.blocks])}</span>
                {item.scope === 'COMPANY' && <span> · {tr('Cấp công ty')}</span>}
                {' · '}
                <span>
                  {item.status === 'CHECK_REQUIRED'
                    ? tr('Cần kiểm tra thêm (chưa có dữ liệu danh mục)')
                    : item.conditions.map(condition).join(' · ')}
                </span>
              </p>
            </li>
          );
          return (
            <details key={product.hs_code} open={index === 0} className="rounded-xl border border-slate-200 bg-white/70 p-3">
              <summary className="cursor-pointer text-sm font-bold text-slate-900">
                {product.hs_formatted} — {language === 'en' ? product.name_en : product.name_vi}
                <span className="ml-2 text-xs font-semibold text-slate-600">
                  ({product.items.length} {tr('giấy tờ')})
                </span>
              </summary>
              {always.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-bold uppercase text-teal-900">{tr('Luôn cần chuẩn bị')}</p>
                  <ul className="mt-1.5 space-y-1.5">{always.map(row)}</ul>
                </div>
              )}
              {depends.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-bold uppercase text-slate-700">
                    {tr('Tùy lô hàng')} ({depends.length})
                  </summary>
                  <ul className="mt-1.5 space-y-1.5">{depends.map(row)}</ul>
                </details>
              )}
            </details>
          );
        })}
      </div>
    </section>
  );
}
