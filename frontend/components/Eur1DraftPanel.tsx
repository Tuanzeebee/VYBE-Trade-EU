'use client';

// Bản NHÁP EUR.1 (C5), chỉ khi kết quả xuất xứ là Đạt. Không có tính năng cấp C/O: cơ quan cấp chính thức là Bộ Công Thương.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getMyCompany } from '../lib/companyApi';
import { getDocument, requestEur1, type DocumentOut } from '../lib/documentsApi';
import { EU_COUNTRIES, parseAmount } from '../lib/tariffApi';

const POLL_MS = 2000;
const MAX_POLLS = 30;

const today = () => new Date().toISOString().slice(0, 10);

export default function Eur1DraftPanel({ checkId, goodsName }: { checkId: string; goodsName: string }) {
  const { tr } = useLanguage();
  const [loggedIn, setLoggedIn] = useState<boolean | undefined>(undefined);
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [country, setCountry] = useState('DE');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [goods, setGoods] = useState(goodsName);
  const [packages, setPackages] = useState('');
  const [mass, setMass] = useState('');
  const [transport, setTransport] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [doc, setDoc] = useState<DocumentOut | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    getMyCompany().then((company) => active && setLoggedIn(company !== null));
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const poll = useCallback((id: string, attempt: number) => {
    timer.current = setTimeout(async () => {
      const current = await getDocument(id);
      if (current) setDoc(current);
      if (current?.status === 'failed' || (attempt >= MAX_POLLS && current?.status !== 'ready')) {
        setError('Không tạo được bản nháp. Vui lòng thử lại sau.');
        setBusy(false);
        return;
      }
      if (current?.status === 'ready') return setBusy(false);
      poll(id, attempt + 1);
    }, POLL_MS);
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!consigneeName.trim()) return setError('Vui lòng nhập tên người nhận hàng.');
    if (!consigneeAddress.trim()) return setError('Vui lòng nhập địa chỉ người nhận hàng.');
    if (!invoiceNumber.trim()) return setError('Vui lòng nhập số hóa đơn.');
    if (!invoiceDate) return setError('Vui lòng nhập ngày hóa đơn.');
    if (invoiceDate > today()) return setError('Ngày hóa đơn không được ở tương lai.');
    if (!goods.trim()) return setError('Vui lòng nhập mô tả hàng hóa.');
    if (!packages.trim()) return setError('Vui lòng nhập quy cách đóng gói.');
    const massValue = parseAmount(mass);
    if (!massValue) return setError('Khối lượng phải là số dương, tối đa 2 chữ số thập phân.');
    setBusy(true);
    try {
      const created = await requestEur1({
        checkId,
        consigneeName,
        consigneeAddress,
        consigneeCountry: country,
        invoiceNumber,
        invoiceDate,
        goodsDescription: goods,
        packages,
        grossMassKg: massValue,
        transportDetails: transport,
        remarks,
      });
      setDoc(created);
      poll(created.id, 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không kết nối được máy chủ. Vui lòng thử lại.');
      setBusy(false);
    }
  };

  if (loggedIn === undefined) return null;
  if (!loggedIn) {
    return (
      <p role="status" className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
        {tr('Đăng nhập bằng tài khoản nhà xuất khẩu (đã có hồ sơ doanh nghiệp) để tạo bản nháp EUR.1 từ kết quả này.')}
      </p>
    );
  }

  const field = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#083832] focus:ring-1 focus:ring-[#083832]';
  const label = 'block text-xs font-semibold text-slate-700';

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-left" aria-label={tr('Bản nháp EUR.1')}>
      <h3 className="text-base font-bold text-slate-900">{tr('Bản nháp EUR.1')}</h3>
      <p role="note" className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
        {tr('Đây chỉ là bản nháp để rà soát, không phải chứng từ chính thức. Cơ quan cấp chính thức là Bộ Công Thương; mọi trang bản nháp đều có watermark.')}
      </p>
      <form onSubmit={submit} noValidate className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="eur-consignee" className={label}>{tr('Tên người nhận hàng')}</label>
            <input id="eur-consignee" value={consigneeName} maxLength={255} onChange={(e) => setConsigneeName(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="eur-country" className={label}>{tr('Nước người nhận hàng')}</label>
            <select id="eur-country" value={country} onChange={(e) => setCountry(e.target.value)} className={field}>
              {EU_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="eur-address" className={label}>{tr('Địa chỉ người nhận hàng')}</label>
          <input id="eur-address" value={consigneeAddress} maxLength={500} onChange={(e) => setConsigneeAddress(e.target.value)} className={field} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="eur-invoice" className={label}>{tr('Số hóa đơn')}</label>
            <input id="eur-invoice" value={invoiceNumber} maxLength={64} onChange={(e) => setInvoiceNumber(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="eur-date" className={label}>{tr('Ngày hóa đơn')}</label>
            <input id="eur-date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={field} />
          </div>
        </div>
        <div>
          <label htmlFor="eur-goods" className={label}>{tr('Mô tả hàng hóa')}</label>
          <textarea id="eur-goods" value={goods} maxLength={2000} rows={3} onChange={(e) => setGoods(e.target.value)} className={field} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="eur-packages" className={label}>{tr('Quy cách đóng gói')}</label>
            <input id="eur-packages" value={packages} maxLength={255} onChange={(e) => setPackages(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="eur-mass" className={label}>{tr('Khối lượng cả bì (kg)')}</label>
            <input id="eur-mass" inputMode="decimal" value={mass} onChange={(e) => setMass(e.target.value)} className={field} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="eur-transport" className={label}>{tr('Thông tin vận chuyển (không bắt buộc)')}</label>
            <input id="eur-transport" value={transport} maxLength={500} onChange={(e) => setTransport(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="eur-remarks" className={label}>{tr('Ghi chú (không bắt buộc)')}</label>
            <input id="eur-remarks" value={remarks} maxLength={500} onChange={(e) => setRemarks(e.target.value)} className={field} />
          </div>
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {tr(error)}
          </p>
        )}
        {doc && doc.status !== 'ready' && !error && (
          <p role="status" className="text-sm text-slate-700">{tr('Đang tạo bản nháp...')}</p>
        )}
        {doc?.status === 'ready' && doc.file_url && (
          <a href={doc.file_url} target="_blank" rel="noreferrer" className="inline-block rounded-xl border border-[#083832] px-4 py-2 text-sm font-semibold text-[#083832] hover:bg-teal-50">
            {tr('Tải bản nháp (PDF)')}
          </a>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-[#083832] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#062924] disabled:opacity-60"
        >
          {tr('Tạo bản nháp EUR.1')}
        </button>
      </form>
    </section>
  );
}
