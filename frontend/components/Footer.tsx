'use client';
import React from 'react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { Mail, MapPin } from 'lucide-react';
import { Link } from '../i18n/navigation';

// Chân trang: mô tả đúng sản phẩm (máy tính EVFTA, xác minh, trợ lý có trích nguồn), liên kết thật tới
// công cụ và trang pháp lý. Không hứa hẹn cấp độ xác minh L1–L3 cũ (mô hình hiện tại: trạng thái + mức).
const COLUMN_TITLE = 'text-slate-200 font-bold text-xs uppercase tracking-wider';
const LINK = 'hover:text-white transition-colors';

export default function Footer() {
  const { tr } = useLanguage();

  return (
    <footer className="w-full bg-[#0b1324] text-slate-400 text-xs border-t border-slate-800 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-slate-800/80">
          <div className="space-y-3 sm:col-span-2 lg:col-span-1">
            <span className="text-white font-bold text-base tracking-wide uppercase">VYBE TRADE</span>
            <p className="text-slate-400 leading-relaxed max-w-sm">
              {tr('Nền tảng B2B kết nối nhà xuất khẩu Việt Nam với người mua tại EU: máy tính EVFTA, xác minh doanh nghiệp và trợ lý tuân thủ có trích nguồn.')}
            </p>
          </div>

          <nav aria-label={tr('Khám phá')} className="space-y-2.5">
            <h4 className={COLUMN_TITLE}>{tr('Khám phá')}</h4>
            <ul className="space-y-2">
              <li><Link href="/suppliers" className={LINK}>{tr('Nhà cung cấp đã xác minh')}</Link></li>
              <li><Link href="/tools/tariff" className={LINK}>{tr('Công cụ tính thuế')}</Link></li>
              <li><Link href="/tools/origin" className={LINK}>{tr('Máy tính quy tắc xuất xứ')}</Link></li>
              <li><Link href="/copilot" className={LINK}>{tr('Trợ lý tuân thủ EVFTA')}</Link></li>
            </ul>
          </nav>

          <nav aria-label={tr('Pháp lý')} className="space-y-2.5">
            <h4 className={COLUMN_TITLE}>{tr('Pháp lý')}</h4>
            <ul className="space-y-2">
              <li><Link href="/terms" className={LINK}>{tr('Điều khoản dịch vụ')}</Link></li>
              <li><Link href="/privacy" className={LINK}>{tr('Chính sách bảo mật')}</Link></li>
            </ul>
          </nav>

          <div className="space-y-2.5">
            <h4 className={COLUMN_TITLE}>{tr('Liên hệ')}</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                <span>{tr('Hà Nội & TP. Hồ Chí Minh, Việt Nam')}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                <a href="mailto:support@vybetrade.com" className={LINK}>support@vybetrade.com</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 space-y-2 text-slate-400 text-[11px]">
          <p>
            {tr('Cấp độ xác minh phản ánh mức độ đối chiếu bằng chứng của nền tảng, không phải bảo đảm về hàng hóa hay giao dịch. Kết quả máy tính chỉ mang tính tham khảo; cơ quan cấp chứng nhận xuất xứ chính thức là Bộ Công Thương.')}
          </p>
          <p>© {new Date().getFullYear()} VYBE TRADE. {tr('Bảo lưu mọi quyền.')}</p>
        </div>
      </div>
    </footer>
  );
}
