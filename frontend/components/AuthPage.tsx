'use client';
import { BrandMark } from './BrandMark';
import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, Check, Eye, EyeOff, ShieldCheck, ShoppingBag } from 'lucide-react';
import { MIN_PASSWORD_LENGTH, ROLE_LABELS, login, register, type DemoUser } from '../lib/demoAuth';
import LanguageSelect from './LanguageSelect';
import { useLanguage } from "../context/LanguageContext";

interface AuthPageProps {
  mode: 'login' | 'register';
  initialRole?: 'buyer' | 'seller';
  onModeChange: (mode: 'login' | 'register') => void;
  onAuthenticated: (user: DemoUser) => void;
  onNavigateHome: () => void;
}

export default function AuthPage({ mode, initialRole = 'buyer', onModeChange, onAuthenticated, onNavigateHome }: AuthPageProps) {
  const { tr, language } = useLanguage();
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', password: '', confirmPassword: '', role: initialRole, acceptTerms: false });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';
  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:opacity-60';

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (isRegister && form.password !== form.confirmPassword) { setError('Mật khẩu xác nhận không khớp.'); return; }
    setBusy(true);
    try {
      const user = isRegister
        ? await register({ ...form, language: language === 'en' ? 'en' : 'vi' })
        : await login(form.email, form.password);
      onAuthenticated(user);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không kết nối được máy chủ. Vui lòng thử lại.');
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-20 flex-wrap gap-3 py-3 max-w-7xl items-center justify-between px-5 sm:px-8">
          <button onClick={onNavigateHome} className="flex items-center gap-2 font-bold tracking-wide text-slate-900"><BrandMark className="h-7 w-7" />{tr("VYBE TRADE")}</button>
          <LanguageSelect />
          <button onClick={onNavigateHome} className="flex items-center gap-2 text-sm text-slate-600 hover:text-teal-800"><ArrowLeft className="h-4 w-4" />{tr("Về trang chủ")}</button>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-2 lg:items-start lg:py-16">
        <section className="rounded-3xl bg-[#083832] p-7 text-white sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-600 bg-teal-900 px-3 py-1 text-xs font-semibold text-teal-100"><ShieldCheck className="h-4 w-4" />{tr("KẾT NỐI BẰNG NIỀM TIN")}</span>
          <h1 className="mt-6 text-3xl font-bold leading-tight sm:text-4xl">{tr("Đưa doanh nghiệp Việt")}<br />{tr("đến thị trường toàn cầu.")}</h1>
          <p className="mt-4 text-sm leading-7 text-teal-100">{tr("Tìm nguồn cung uy tín, xây dựng hồ sơ xuất khẩu và khám phá cơ hội hợp tác trên VYBE Trade.")}</p>
          <div className="my-8 space-y-4 text-sm">{['Hai vai trò: Buyer quốc tế và Seller Việt Nam', 'Company Onboarding 4 bước cho Buyer và Seller', 'Trải nghiệm luồng kết nối B2B với dữ liệu mẫu'].map((text) => <p key={text} className="flex items-start gap-3"><Check className="h-5 w-5 shrink-0 text-emerald-300" />{tr(text)}</p>)}</div>
          <p className="mt-5 text-xs leading-5 text-teal-200">{tr("Mật khẩu được mã hóa và phiên đăng nhập được bảo vệ phía máy chủ.")}</p>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900">{tr(isRegister ? 'Tạo tài khoản VYBE Trade' : 'Chào mừng bạn trở lại')}</h2>
          <p className="mt-2 text-sm text-slate-500">{tr(isRegister ? 'Chọn vai trò phù hợp để bắt đầu kết nối.' : 'Đăng nhập để tiếp tục hành trình giao thương.')}</p>
          <form onSubmit={submit} className="mt-7 space-y-5">
            <fieldset disabled={busy} className="space-y-5">
              {isRegister && <>
                <fieldset><legend className="mb-2 text-sm font-semibold text-slate-700">{tr("Bạn tham gia với vai trò")}</legend><div className="grid grid-cols-2 gap-3">{(['buyer', 'seller'] as const).map((role) => <label key={role} className={`cursor-pointer rounded-2xl border p-4 ${form.role === role ? 'border-teal-700 bg-teal-50 text-teal-900' : 'border-slate-200 text-slate-600'}`}><span className="flex items-center justify-between">{role === 'buyer' ? <ShoppingBag className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}<input type="radio" name="role" value={role} checked={form.role === role} onChange={() => setForm({ ...form, role })} className="accent-teal-800" /></span><span className="mt-2 block text-sm font-bold">{tr(ROLE_LABELS[role])}</span><span className="mt-1 block text-xs">{tr(role === 'buyer' ? 'Tìm nguồn cung' : 'Giới thiệu doanh nghiệp')}</span></label>)}</div></fieldset>
                <label className="block text-sm font-semibold text-slate-700">{tr("Họ và tên")}<input className={`${inputClass} mt-2`} required maxLength={120} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
                <label className="block text-sm font-semibold text-slate-700">{tr("Tên doanh nghiệp")}<input className={`${inputClass} mt-2`} required maxLength={200} autoComplete="organization" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></label>
                <label className="block text-sm font-semibold text-slate-700">{tr("Số điện thoại")}<input type="tel" className={`${inputClass} mt-2`} maxLength={32} autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+84 901 234 567" /></label>
              </>}
              <label className="block text-sm font-semibold text-slate-700">{tr("Email")}<input type="email" className={`${inputClass} mt-2`} required autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={tr("you@company.com")} /></label>
              <div><label htmlFor="auth-password" className="text-sm font-semibold text-slate-700">{tr("Mật khẩu")}</label><div className="relative mt-2"><input id="auth-password" type={showPassword ? 'text' : 'password'} className={`${inputClass} pr-12`} required minLength={isRegister ? MIN_PASSWORD_LENGTH : undefined} autoComplete={isRegister ? 'new-password' : 'current-password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={tr(isRegister ? 'Ít nhất 10 ký tự' : 'Nhập mật khẩu')} /><button type="button" aria-label={tr(showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu')} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></div>
              {isRegister && <label className="block text-sm font-semibold text-slate-700">{tr("Xác nhận mật khẩu")}<input type={showPassword ? 'text' : 'password'} className={`${inputClass} mt-2`} required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></label>}
              {isRegister && <label className="flex items-start gap-3 text-sm text-slate-700"><input type="checkbox" required checked={form.acceptTerms} onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })} className="mt-1 h-4 w-4 accent-teal-800" /><span>{tr("Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật của nền tảng.")}</span></label>}
            </fieldset>
            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{tr(error)}</p>}
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#083832] py-3 text-sm font-bold text-white hover:bg-[#062924] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60">{tr(busy ? 'Đang xử lý…' : isRegister ? 'Tạo tài khoản & tiếp tục' : 'Đăng nhập')}<ArrowRight className="h-4 w-4" /></button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">{tr(isRegister ? 'Đã có tài khoản?' : 'Bạn chưa có tài khoản?')} <button disabled={busy} onClick={() => { setError(''); onModeChange(isRegister ? 'login' : 'register'); }} className="font-bold text-teal-800 hover:underline">{tr(isRegister ? 'Đăng nhập' : 'Đăng ký ngay')}</button></p>
        </section>
      </main>
    </div>
  );
}
