'use client';

// Báo cáo go-to-market (U18). Mọi con số trong lời văn do backend điền từ thống kê Eurostat đã nạp;
// model (nếu có) chỉ viết câu chữ. Bản tóm tắt miễn phí, phần còn lại + PDF cần gói "báo cáo đầy đủ".
import React, { useCallback, useEffect, useState } from 'react';
import { FileText, Lock, Download, Handshake, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import { eurCompact, percentOf, regionName } from '../lib/marketInsightsApi';
import {
  createReport,
  getReport,
  listReports,
  moneyInput,
  REPORT_ERROR_MESSAGES,
  REPORT_STATUS_LABELS,
  requestConsulting,
  type MarketReport,
  type MarketReportInput,
  type MarketReportItem,
  type ReportRow,
} from '../lib/marketReportApi';
import type { ProductOut } from '../lib/productsApi';
import { EU_COUNTRIES } from '../lib/tariffApi';
import { budgetLabel, budgetRequired, ORIENTATION_LABELS, validateStep, type FormValues, type Orientation } from '../lib/orientation';
import PositioningChart from './PositioningChart';

const POLL_MS = 3000;
const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832]';

function MarketTable({ rows, label }: { rows: ReportRow[]; label: string }) {
  const { tr, language } = useLanguage();
  if (!rows.length) return null;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[28rem] text-left text-sm" aria-label={tr(label)}>
        <thead className="text-xs text-slate-500">
          <tr>
            <th className="py-1.5">{tr('Nước')}</th>
            <th className="py-1.5 text-right">{tr('Nhập khẩu')}</th>
            <th className="py-1.5 text-right">{tr('Tăng trưởng/năm')}</th>
            <th className="py-1.5 text-right">{tr('Thị phần Việt Nam')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.country} className="border-t border-slate-100">
              <td className="py-1.5">{regionName(r.country, language)}</td>
              <td className="py-1.5 text-right">{eurCompact(r.value, language)}</td>
              <td className="py-1.5 text-right">{r.growth == null ? '—' : percentOf(r.growth, language)}</td>
              <td className="py-1.5 text-right">{r.share == null ? '—' : percentOf(r.share, language)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConsultingForm({ reportId }: { reportId: string }) {
  const { tr } = useLanguage();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ contact_name: '', contact_email: '', phone: '', message: '' });
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contact_name.trim() || !form.contact_email.trim()) {
      setError('Vui lòng nhập tên và email liên hệ.');
      return;
    }
    setState('busy');
    const result = await requestConsulting({
      report_id: reportId,
      contact_name: form.contact_name.trim(),
      contact_email: form.contact_email.trim(),
      phone: form.phone.trim() || null,
      message: form.message.trim() || null,
    });
    if (result.ok) return setState('sent');
    setState('error');
    setError(
      result.error === 'limit'
        ? 'Bạn đã gửi nhiều yêu cầu hôm nay; chúng tôi sẽ liên hệ sớm.'
        : result.error === 'invalid'
          ? 'Email hoặc số điện thoại chưa hợp lệ.'
          : 'Không kết nối được máy chủ. Vui lòng thử lại.',
    );
  };

  if (state === 'sent') {
    return (
      <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
        {tr('Đã gửi yêu cầu. Mạng lưới VBA sẽ liên hệ với bạn qua email hoặc điện thoại.')}
      </p>
    );
  }
  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#083832]">
          <Handshake className="h-4 w-4" aria-hidden="true" />
          {tr('Cần người đồng hành khi vào thị trường này?')}
        </p>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-[#083832] px-4 py-2 text-sm font-semibold text-white">
            {tr('Tư vấn triển khai qua mạng lưới VBA')}
          </button>
        )}
      </div>
      {open && (
        <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-2" aria-label={tr('Tư vấn triển khai qua mạng lưới VBA')}>
          <label className="text-xs font-semibold text-slate-700">
            {tr('Người liên hệ')}
            <input className={inputCls} value={form.contact_name} maxLength={255} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            {tr('Email')}
            <input type="email" className={inputCls} value={form.contact_email} maxLength={255} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            {tr('Số điện thoại (không bắt buộc)')}
            <input className={inputCls} value={form.phone} maxLength={40} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
            {tr('Bạn cần hỗ trợ gì? (không bắt buộc)')}
            <textarea className={inputCls} rows={3} value={form.message} maxLength={2000} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </label>
          {error && (
            <p role="alert" className="text-sm text-rose-700 sm:col-span-2">
              {tr(error)}
            </p>
          )}
          <div className="sm:col-span-2">
            <button type="submit" disabled={state === 'busy'} className="rounded-xl bg-[#083832] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {tr(state === 'busy' ? 'Đang gửi…' : 'Gửi yêu cầu tư vấn')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ReportView({ report }: { report: MarketReport }) {
  const { tr, language } = useLanguage();
  if (report.status === 'queued' || report.status === 'running') {
    return (
      <p role="status" className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
        {tr('Đang dựng báo cáo, thường mất dưới một phút…')}
      </p>
    );
  }
  if (report.status === 'failed') {
    return (
      <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
        {tr('Không dựng được báo cáo này. Vui lòng tạo lại hoặc thử sản phẩm khác.')}
      </p>
    );
  }
  return (
    <article className="space-y-5" aria-label={tr('Báo cáo go-to-market')} data-testid="report-view">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{report.product_name}</h3>
          <p className="text-xs text-slate-500">
            {tr('Nguồn')}: {report.source} · {tr('Năm')} {report.year} ·{' '}
            {tr(report.narrative_source === 'model' ? 'Lời văn do AI viết, số liệu do hệ thống điền' : 'Lời văn theo mẫu, số liệu do hệ thống điền')}
          </p>
        </div>
        {report.pdf_url ? (
          <a href={report.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800">
            <Download className="h-4 w-4" aria-hidden="true" />
            {tr('Tải PDF')}
          </a>
        ) : null}
      </header>
      {report.tariff_data_status === 'demo_unreviewed' && (
        <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          {tr('Dữ liệu thuế minh hoạ, chưa được luật TM duyệt.')}
        </p>
      )}
      {report.sections?.map((section) => (
        <section key={section.key} aria-label={section.title} className="space-y-1">
          <h4 className="text-sm font-bold text-[#083832]">{section.title}</h4>
          {section.locked ? (
            <p className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              {tr('Phần này có trong bản đầy đủ.')}
            </p>
          ) : (
            section.text && <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{section.text}</p>
          )}
          {section.key === 'positioning' && !section.locked && report.positioning && (
            <PositioningChart score={report.positioning.score} axes={report.positioning.axes} />
          )}
          {section.key === 'segments' && !section.locked && !section.text && (
            <p className="text-sm text-slate-500">{tr('Chưa có dữ liệu thị trường cho nhóm hàng này.')}</p>
          )}
          {section.key === 'partners' && !section.locked && !section.text && (
            <p className="text-sm text-slate-500">{tr('Chưa có buyer đã đăng ký phù hợp ở các thị trường này.')}</p>
          )}
          {section.key === 'why_market' && (
            <>
              <MarketTable rows={report.top_markets ?? []} label="Thị trường nên ưu tiên" />
              <MarketTable rows={report.potential_markets ?? []} label="Thị trường tiềm năng" />
            </>
          )}
          {section.key === 'competition' && (report.competitors ?? []).length > 0 && (
            <ul className="mt-2 grid gap-1 text-xs text-slate-700 sm:grid-cols-2">
              {report.competitors?.map((c) => (
                <li key={c.country} className={c.country === 'VN' ? 'font-bold text-[#083832]' : ''}>
                  {regionName(c.country, language)}: {c.share == null ? '—' : percentOf(c.share, language)} · {eurCompact(c.value, language)}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {!report.full && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">{tr('Bạn đang xem bản tóm tắt miễn phí.')}</p>
          <p className="mt-1 text-xs">{tr('Bản đầy đủ có phân tích đối thủ, định vị giá, thuế và hạn ngạch, OEM hay thương hiệu riêng, rủi ro, bước tiếp theo và file PDF.')}</p>
          <Link href="/pricing" className="mt-2 inline-block text-sm font-semibold underline">
            {tr('Xem gói báo cáo đầy đủ')}
          </Link>
        </div>
      )}
      <p className="text-xs text-slate-500">{tr('Báo cáo tham khảo, không phải tư vấn pháp lý hay cam kết kết quả.')}</p>
      <ConsultingForm reportId={report.id} />
    </article>
  );
}

export default function MarketReportPanel({ products }: { products: ProductOut[] }) {
  const { tr, language } = useLanguage();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [values, setValues] = useState<FormValues>({
    productId: '',
    targetMarket: '',
    orientation: null,
    otherText: '',
    expectedRevenue: '',
    annualVolume: '',
    budget: '',
    productionRegion: '',
  });
  const [reportLanguage, setReportLanguage] = useState<'vi' | 'en'>(language === 'en' ? 'en' : 'vi');
  const [error, setError] = useState('');
  const set = (patch: Partial<FormValues>) => setValues((current) => ({ ...current, ...patch }));
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<MarketReportItem[] | null | undefined>(undefined);
  const [current, setCurrent] = useState<MarketReport | null>(null);

  const refreshList = useCallback(async () => setItems(await listReports()), []);
  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const pending = current && (current.status === 'queued' || current.status === 'running') ? current.id : null;
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(async () => {
      const next = await getReport(pending);
      if (next) setCurrent(next);
      if (next && next.status !== 'queued' && next.status !== 'running') void refreshList();
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [pending, current, refreshList]);

  const next = () => {
    const problem = validateStep(step, values);
    if (problem) return setError(problem);
    setError('');
    setStep((step + 1) as 2 | 3);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) return next();
    for (const check of [1, 2] as const) {
      const problem = validateStep(check, values);
      if (problem) {
        setStep(check);
        return setError(problem);
      }
    }
    const revenue = moneyInput(values.expectedRevenue);
    const volume = moneyInput(values.annualVolume);
    const budget = moneyInput(values.budget);
    if (volume === undefined || budget === undefined) return setError('Số tiền chỉ gồm chữ số (EUR, không có phần lẻ).');
    setError('');
    const input: MarketReportInput = {
      product_id: values.productId,
      q: '',
      language: reportLanguage,
      target_market: values.targetMarket || null,
      sales_orientation: values.orientation,
      other_text: values.orientation === 'other' ? values.otherText.trim() : null,
      expected_revenue: revenue ?? null,
      annual_volume: volume,
      budget,
      production_region: values.productionRegion.trim() || null,
    };
    setBusy(true);
    const result = await createReport(input);
    setBusy(false);
    if (!result.ok) return setError(REPORT_ERROR_MESSAGES[result.error]);
    setCurrent(result.data);
    void refreshList();
  };

  const open = async (id: string) => {
    const report = await getReport(id);
    if (report) setCurrent(report);
    else setError(REPORT_ERROR_MESSAGES.network);
  };
  const date = (iso: string) => new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

  return (
    <section aria-label={tr('Báo cáo go-to-market')} className="space-y-6 text-left">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <FileText className="h-5 w-5 text-[#083832]" aria-hidden="true" />
          {tr('Báo cáo go-to-market')}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {tr('Thị trường EU nên ưu tiên, đối thủ, định vị giá, thuế và cảnh báo ngành, OEM hay thương hiệu riêng — tính từ thống kê hải quan EU (Eurostat) và hồ sơ công ty của bạn.')}
        </p>
      </div>
      {products.length === 0 ? (
        <p role="status" className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-700">
          {tr('Bạn cần thêm ít nhất một sản phẩm để tạo báo cáo. Vào mục Sản phẩm để thêm.')}
        </p>
      ) : (
        <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2" aria-label={tr('Tạo báo cáo')}>
          <p className="text-sm text-slate-700 sm:col-span-2">
            {tr('Báo cáo gồm 3 bước: chọn sản phẩm, thị trường và định hướng, nhập mục tiêu, rồi xác nhận. Mất khoảng 2 phút.')}
          </p>
          <ol aria-label={tr('Các bước tạo báo cáo')} className="grid grid-cols-3 gap-2 sm:col-span-2">
            {(
              [
                [1, 'Định hướng'],
                [2, 'Mục tiêu'],
                [3, 'Xác nhận'],
              ] as const
            ).map(([n, name]) => (
              <li
                key={n}
                aria-current={n === step ? 'step' : undefined}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
                  n === step ? 'border-[#083832] bg-[#e6f4f2] text-[#083832]' : n < step ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-500'
                }`}
              >
                <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${n <= step ? 'bg-[#083832] text-white' : 'bg-slate-200 text-slate-600'}`}>{n}</span>
                <span>{tr(name)}</span>
              </li>
            ))}
          </ol>
          {step === 1 && (
            <>
              <label className="text-xs font-semibold text-slate-700">
                {tr('Sản phẩm của bạn')}
                <select className={inputCls} value={values.productId} onChange={(e) => set({ productId: e.target.value })}>
                  <option value="">{tr('— Chọn sản phẩm —')}</option>
                  {products.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700">
                {tr('Thị trường quan tâm')}
                <select className={inputCls} value={values.targetMarket} onChange={(e) => set({ targetMarket: e.target.value })}>
                  <option value="">{tr('— Chọn thị trường —')}</option>
                  <option value="EU">{tr('Toàn EU')}</option>
                  {EU_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                {tr('Định hướng bán hàng')}
                <select className={inputCls} value={values.orientation ?? ''} onChange={(e) => set({ orientation: (e.target.value || null) as Orientation | null })}>
                  <option value="">{tr('— Chọn —')}</option>
                  {(Object.keys(ORIENTATION_LABELS) as Orientation[]).map((o) => (
                    <option key={o} value={o}>
                      {tr(ORIENTATION_LABELS[o])}
                    </option>
                  ))}
                </select>
              </label>
              {values.orientation === 'other' && (
                <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                  {tr('Mô tả định hướng của bạn')}
                  <input className={inputCls} value={values.otherText} maxLength={200} onChange={(e) => set({ otherText: e.target.value })} />
                </label>
              )}
            </>
          )}
          {step === 2 && values.orientation && (
            <>
              <label className="text-xs font-semibold text-slate-700">
                {tr('Doanh thu xuất khẩu dự kiến (EUR/năm)')}
                <input className={inputCls} inputMode="numeric" value={values.expectedRevenue} onChange={(e) => set({ expectedRevenue: e.target.value })} />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                {tr('Sản lượng dự kiến (tấn/năm, không bắt buộc)')}
                <input className={inputCls} inputMode="numeric" value={values.annualVolume} onChange={(e) => set({ annualVolume: e.target.value })} />
              </label>
              <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                {tr('Vùng sản xuất (không bắt buộc, mặc định theo thành phố trong hồ sơ)')}
                <input className={inputCls} value={values.productionRegion} maxLength={120} onChange={(e) => set({ productionRegion: e.target.value })} />
              </label>
              <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                {tr(budgetLabel(values.orientation))} {tr(budgetRequired(values.orientation) ? '(EUR/năm)' : '(EUR/năm, không bắt buộc)')}
                <input className={inputCls} inputMode="numeric" value={values.budget} onChange={(e) => set({ budget: e.target.value })} />
              </label>
            </>
          )}
          {step === 3 && (
            <>
              <p className="text-sm text-slate-700 sm:col-span-2">
                {tr('Năng lực nhà máy, chứng nhận và thị trường đã xuất được lấy từ hồ sơ công ty của bạn. Cập nhật hồ sơ để báo cáo chính xác hơn.')}
              </p>
              <label className="text-xs font-semibold text-slate-700">
                {tr('Ngôn ngữ báo cáo')}
                <select className={inputCls} value={reportLanguage} onChange={(e) => setReportLanguage(e.target.value as 'vi' | 'en')}>
                  <option value="vi">{tr('Tiếng Việt')}</option>
                  <option value="en">English</option>
                </select>
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 sm:col-span-2">
              {tr(error)}
            </p>
          )}
          <div className="flex gap-3 sm:col-span-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setStep((step - 1) as 1 | 2);
                }}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800"
              >
                {tr('Quay lại')}
              </button>
            )}
            {step < 3 ? (
              <button type="button" onClick={next} className="rounded-xl bg-[#083832] px-5 py-2.5 text-sm font-semibold text-white">
                {tr('Tiếp')}
              </button>
            ) : (
              <button type="submit" disabled={busy} className="rounded-xl bg-[#083832] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {tr(busy ? 'Đang gửi yêu cầu…' : 'Tạo báo cáo')}
              </button>
            )}
          </div>
        </form>
      )}

      {current && <ReportView report={current} />}

      <div>
        <h3 className="text-sm font-bold text-slate-900">{tr('Báo cáo đã tạo')}</h3>
        {items === null && <p className="mt-2 text-sm text-rose-700">{tr('Không tải được danh sách báo cáo.')}</p>}
        {items && items.length === 0 && <p className="mt-2 text-sm text-slate-500">{tr('Chưa có báo cáo nào.')}</p>}
        {items && items.length > 0 && (
          <ul className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span>
                  <strong>{item.query}</strong> · {item.language.toUpperCase()} · <span className="text-xs text-slate-500">{date(item.created_at)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-slate-600">{tr(REPORT_STATUS_LABELS[item.status])}</span>
                  <button type="button" onClick={() => void open(item.id)} className="text-xs font-semibold text-teal-800 underline">
                    {tr('Xem')}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
