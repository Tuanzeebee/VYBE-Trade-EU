'use client';

// Khối "Nhà máy" của trang Nhà máy, chứng nhận và chất lượng: địa chỉ nhà máy / kho, sản lượng, mã cơ sở.
// Chỉ hiện dữ liệu thật của công ty; chưa khai thì hướng dẫn thêm. Chỉ cho công ty bán sản phẩm.
import React from 'react';
import { Factory } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { FACILITY_CODE_TYPES, offersProducts, type CompanyOut } from '../lib/companyApi';
import { UNITS } from '../lib/productsApi';

function Row({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  const { tr } = useLanguage();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-2 border-b border-slate-100 last:border-0">
      <dt className="text-slate-600">{tr(label)}</dt>
      <dd className={`sm:col-span-2 ${value ? `font-semibold text-slate-900 ${mono ? 'font-mono' : ''}` : 'italic text-slate-400'}`}>
        {value || tr('Chưa khai báo')}
      </dd>
    </div>
  );
}

export default function FactoryInfo({ company, onEdit }: { company: CompanyOut | null; onEdit: () => void }) {
  const { tr } = useLanguage();
  if (!company || !offersProducts(company.offering_type ?? undefined)) return null;
  const unit = UNITS.find((u) => u.code === company.capacity_unit)?.label ?? company.capacity_unit ?? '';
  const capacity = company.capacity_value
    ? `${Number(company.capacity_value).toLocaleString('vi-VN')} ${tr(unit)} / ${tr(company.capacity_period === 'month' ? 'tháng' : 'năm')}`
    : null;
  const codes = FACILITY_CODE_TYPES.map((type) => ({
    type,
    list: (company.facility_codes ?? []).filter((c) => c.code_type === type.code).map((c) => c.code),
  })).filter((x) => x.list.length > 0);
  const filled = Boolean(company.factory_address || capacity || codes.length > 0);

  return (
    <section aria-labelledby="factory-info" className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
      <header className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Factory className="w-5 h-5 text-teal-700" aria-hidden="true" />
            <h2 id="factory-info" className="text-base font-bold text-slate-900">{tr('Nhà máy')}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">{tr('Địa chỉ, sản lượng và mã cơ sở giúp buyer biết bạn có đủ năng lực giao hàng.')}</p>
        </div>
        <button type="button" onClick={onEdit} className="shrink-0 rounded-xl border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50 cursor-pointer">
          {tr(filled ? 'Sửa thông tin nhà máy' : 'Thêm thông tin nhà máy')}
        </button>
      </header>
      <dl className="text-sm leading-relaxed">
        <Row label="Địa chỉ nhà máy / kho" value={company.factory_address} />
        <Row label="Sản lượng có thể cung cấp" value={capacity} />
        {codes.map(({ type, list }) => (
          <Row key={type.code} label={type.label} value={list.join(', ')} mono />
        ))}
      </dl>
    </section>
  );
}
