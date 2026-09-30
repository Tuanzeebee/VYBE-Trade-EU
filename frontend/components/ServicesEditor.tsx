'use client';

// Dịch vụ của nhà cung cấp dịch vụ (U2): loại dịch vụ, tên, mô tả và nước phục vụ. Chỉ hỏi vừa đủ —
// giấy phép hành nghề nộp ở bước "Giấy phép & chứng nhận".
import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { COUNTRIES } from '../lib/companyApi';
import { emptyServiceDraft, listServiceCategories, type CatalogItem, type ServiceDraft } from '../lib/servicesApi';

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832]';
const COVERAGE = ['VN', ...COUNTRIES.map((c) => c.code).filter((code) => code !== 'VN')];

interface Props {
  services: ServiceDraft[];
  onChange: (next: ServiceDraft[]) => void;
}

export default function ServicesEditor({ services, onChange }: Props) {
  const { tr, language } = useLanguage();
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  useEffect(() => {
    let active = true;
    listServiceCategories().then((list) => active && setCategories(list));
    return () => {
      active = false;
    };
  }, []);

  const update = (index: number, patch: Partial<ServiceDraft>) =>
    onChange(services.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  const countryLabel = (code: string) => (code === 'VN' ? tr('Việt Nam') : COUNTRIES.find((c) => c.code === code)?.name ?? code);

  return (
    <div className="space-y-4">
      {services.length === 0 && (
        <p role="status" className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-700">
          {tr('Chưa có dịch vụ. Thêm ít nhất một dịch vụ để buyer và nhà xuất khẩu tìm thấy bạn.')}
        </p>
      )}
      {services.map((service, index) => {
        const legend = tr(`Dịch vụ ${index + 1}`);
        return (
          <fieldset key={service.id ?? `new-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
            <legend className="px-1 text-xs font-bold text-slate-700">{legend}</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor={`service-category-${index}`} className="block text-xs font-semibold text-slate-800 mb-1.5">
                  {tr('Loại dịch vụ *')}
                </label>
                <select
                  id={`service-category-${index}`}
                  value={service.categoryCode}
                  onChange={(e) => update(index, { categoryCode: e.target.value })}
                  className={inputClass}
                >
                  <option value="">{tr('Chọn loại dịch vụ')}</option>
                  {categories.map((c) => (
                    <option key={c.code} value={c.code}>
                      {language === 'vi' ? c.name_vi : c.name_en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`service-title-${index}`} className="block text-xs font-semibold text-slate-800 mb-1.5">
                  {tr('Tên dịch vụ *')}
                </label>
                <input
                  id={`service-title-${index}`}
                  value={service.title}
                  maxLength={255}
                  onChange={(e) => update(index, { title: e.target.value })}
                  placeholder={tr('Ví dụ: Khai báo hải quan hàng nông sản tại cảng Cát Lái')}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor={`service-description-${index}`} className="block text-xs font-semibold text-slate-800 mb-1.5">
                {tr('Mô tả ngắn')}
              </label>
              <textarea
                id={`service-description-${index}`}
                rows={3}
                maxLength={5000}
                value={service.descriptionVi}
                onChange={(e) => update(index, { descriptionVi: e.target.value })}
                placeholder={tr('Bạn làm gì, cho ai, thời gian xử lý bao lâu.')}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={`service-coverage-${index}`} className="block text-xs font-semibold text-slate-800 mb-1.5">
                {tr('Nước phục vụ')}
              </label>
              <select
                id={`service-coverage-${index}`}
                multiple
                value={service.coverage}
                onChange={(e) => update(index, { coverage: Array.from(e.target.selectedOptions, (o) => o.value) })}
                className={`${inputClass} h-28`}
              >
                {COVERAGE.map((code) => (
                  <option key={code} value={code}>
                    {countryLabel(code)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">{tr('Giữ Ctrl (hoặc Cmd) để chọn nhiều nước.')}</p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onChange(services.filter((_, i) => i !== index))}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{tr('Xóa dịch vụ')}</span>
              </button>
            </div>
          </fieldset>
        );
      })}
      <button
        type="button"
        onClick={() => onChange([...services, emptyServiceDraft()])}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-teal-200 bg-teal-50 text-teal-900 text-xs font-semibold hover:bg-teal-100 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>{tr('Thêm dịch vụ')}</span>
      </button>
    </div>
  );
}
