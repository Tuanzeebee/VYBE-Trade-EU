'use client';
import { Building2, ShieldCheck, Users } from 'lucide-react';
import { getUsers, ROLE_LABELS } from '../lib/demoAuth';
import { useLanguage } from "../context/LanguageContext";

export default function AdminDashboard() {
  const { tr } = useLanguage();
  const users = getUsers();
  return <main className="mx-auto w-full max-w-7xl space-y-7 px-5 py-10 sm:px-8">
    <div><span className="text-xs font-bold uppercase tracking-wider text-teal-700">{tr("ADMIN DEMO")}</span><h1 className="mt-2 text-3xl font-bold">{tr("Tổng quan quản trị")}</h1><p className="mt-2 text-sm text-slate-500">{tr("Danh sách tài khoản demo trên trình duyệt này. Dữ liệu không đồng bộ giữa các thiết bị.")}</p></div>
    <div className="grid gap-4 sm:grid-cols-3">{([{ role: 'buyer', icon: Users }, { role: 'seller', icon: Building2 }, { role: 'admin', icon: ShieldCheck }] as const).map(({ role, icon: Icon }) => <div key={role} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6"><Icon className="h-8 w-8 text-teal-700" /><div><p className="text-sm text-slate-500">{tr(ROLE_LABELS[role])}</p><p className="text-2xl font-bold">{tr(users.filter((user) => user.role === role).length)}</p></div></div>)}</div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><h2 className="border-b border-slate-100 p-5 font-bold">{tr("Tài khoản & trạng thái hồ sơ")}</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['Người dùng', 'Doanh nghiệp', 'Vai trò', 'Onboarding'].map((label) => <th key={label} scope="col" className="px-5 py-3 font-semibold">{tr(label)}</th>)}</tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t border-slate-100"><td className="px-5 py-4"><p className="font-semibold">{user.name}</p><p className="mt-1 text-xs text-slate-500">{user.email}</p></td><td className="px-5 py-4">{user.company}</td><td className="px-5 py-4">{tr(ROLE_LABELS[user.role])}</td><td className="px-5 py-4"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${user.role === 'admin' ? 'bg-slate-100 text-slate-600' : user.onboardingCompleted && user.onboardingVersion === 2 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{tr(user.role === 'admin' ? 'Không áp dụng' : user.onboardingCompleted && user.onboardingVersion === 2 ? 'Đã hoàn tất' : 'Chưa thiết lập')}</span></td></tr>)}</tbody></table></div></section>
  </main>;
}
