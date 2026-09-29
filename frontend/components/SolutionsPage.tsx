'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  Users, 
  Award, 
  Send, 
  BarChart3, 
  ArrowRight, 
  CheckCircle2, 
  Check, 
  Search,
  Zap,
  X, 
  RefreshCw, 
  PlayCircle
} from 'lucide-react';
import { useLanguage } from "../context/LanguageContext";

interface SolutionsPageProps {
  onNavigateHome: () => void;
  onNavigateDirectory: () => void;
  onNavigatePricing: () => void;
  onNavigateOnboarding: () => void;
  onNavigateWorkspace?: () => void;
}

export type SolutionId = 
  | 'verification-engine' 
  | 'ai-trust' 
  | 'matching' 
  | 'trust-profile' 
  | 'rfq-workflow' 
  | 'market-intel';

interface SolutionItem {
  id: SolutionId;
  title: string;
  tag: string;
  audience: ('seller' | 'buyer' | 'partner')[];
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  borderHover: string;
  description: string;
  features: string[];
  metrics: string;
  actionText: string;
}

export default function SolutionsPage({
  onNavigateDirectory,
  onNavigatePricing,
  onNavigateOnboarding,
}: SolutionsPageProps) {
  const { tr } = useLanguage();
  const [selectedRole, setSelectedRole] = useState<'all' | 'seller' | 'buyer' | 'partner'>('all');
  const [activeModalSolution, setActiveModalSolution] = useState<SolutionId | null>(null);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  // Demo consultation form state
  const [demoForm, setDemoForm] = useState({
    name: 'Nguyễn Văn Trí',
    company: 'Công ty TNHH Nông Sản Việt',
    email: 'tri.nguyen@vietagri.vn',
    phone: '(+84) 91 888 2345',
    role: 'seller',
    solutionInterest: 'verification-engine',
    message: 'Tôi muốn tư vấn xác thực hồ sơ xuất khẩu L2 Enhanced và kết nối với các Buyer cà phê tại thị trường EU & Nhật Bản.'
  });

  // Simulator state in modal
  const [simStep, setSimStep] = useState<number>(1);
  const [simRunning, setSimRunning] = useState(false);
  const [simResult, setSimResult] = useState<string | null>(null);

  const SOLUTIONS: SolutionItem[] = [
    {
      id: 'verification-engine',
      title: 'Verification Engine',
      tag: 'Xác thực Pháp lý & Năng lực L1 - L3',
      audience: ['seller', 'buyer', 'partner'],
      icon: ShieldCheck,
      iconBg: 'bg-blue-50 text-blue-600',
      iconColor: 'text-blue-600',
      borderHover: 'hover:border-blue-300 hover:shadow-blue-50/50',
      description: 'Hệ thống tự động trích xuất OCR, đối soát chéo dữ liệu với Cổng thông tin Doanh nghiệp quốc gia, Tổng cục Hải quan và cơ quan cấp chứng nhận quốc tế (GlobalG.A.P., ISO, HACCP, FDA). Xếp hạng tín nhiệm minh bạch chuẩn L1, L2, L3.',
      features: [
        'Tự động đối soát dữ liệu OCR thông minh thời gian thực',
        'Phân hạng tín nhiệm chuẩn mực 3 cấp độ: L1 (Cơ bản), L2 (Nâng cao), L3 (Toàn diện)',
        'Cơ chế chống giả mạo văn bằng & bảo chứng tính pháp lý trước đối tác quốc tế'
      ],
      metrics: '99.8% độ chính xác đối soát',
      actionText: 'Tìm hiểu thêm'
    },
    {
      id: 'ai-trust',
      title: 'AI Trust Co-pilot',
      tag: 'Trí tuệ nhân tạo thẩm định',
      audience: ['seller', 'buyer'],
      icon: Sparkles,
      iconBg: 'bg-purple-50 text-purple-600',
      iconColor: 'text-purple-600',
      borderHover: 'hover:border-purple-300 hover:shadow-purple-50/50',
      description: 'Trợ lý AI phân tích báo cáo tài chính, năng lực sản xuất, quy chuẩn nhà máy và lịch sử xuất khẩu để tạo Báo cáo Thẩm định Tín nhiệm (Credit Assessment Report) chuyên sâu trong 30 giây, giúp Buyer ra quyết định nhanh chóng.',
      features: [
        'Phân tích rủi ro tài chính, pháp lý & vận chuyển quốc tế đa chiều',
        'Đánh giá khả năng đáp ứng sản lượng container theo thời vụ',
        'Tự động gợi ý cải thiện hồ sơ năng lực theo tiêu chuẩn EU, Mỹ, Nhật Bản'
      ],
      metrics: '30s tạo báo cáo thẩm định',
      actionText: 'Tìm hiểu thêm'
    },
    {
      id: 'matching',
      title: 'Supplier & Buyer Matching',
      tag: 'Kết nối Cung - Cầu Chuẩn xác',
      audience: ['seller', 'buyer'],
      icon: Users,
      iconBg: 'bg-sky-50 text-sky-600',
      iconColor: 'text-sky-600',
      borderHover: 'hover:border-sky-300 hover:shadow-sky-50/50',
      description: 'Thuật toán đối sánh thông minh ghép nối chính xác nhu cầu thu mua (Incoterms, sản lượng, tiêu chuẩn chứng chỉ, ngân sách) của Buyer quốc tế với năng lực cung ứng thực tế đã được xác minh của doanh nghiệp Việt Nam.',
      features: [
        'Ghép nối thông minh theo điều kiện Incoterms (FOB, CIF, CFR) và MOQ',
        'Tiếp cận mạng lưới hơn 5,000+ nhà nhập khẩu uy tín từ 45 quốc gia',
        'Tiết kiệm 70% chi phí và thời gian tham gia các hội chợ xúc tiến thương mại'
      ],
      metrics: 'Gấp 3 lần tỷ lệ chốt deal',
      actionText: 'Tìm hiểu thêm'
    },
    {
      id: 'trust-profile',
      title: 'Verified Trust Profile',
      tag: 'Hồ sơ Tín nhiệm Xuất khẩu',
      audience: ['seller', 'buyer'],
      icon: Award,
      iconBg: 'bg-amber-50 text-amber-600',
      iconColor: 'text-amber-600',
      borderHover: 'hover:border-amber-300 hover:shadow-amber-50/50',
      description: 'Hộ chiếu số doanh nghiệp đa ngôn ngữ (Anh - Việt - Trung - Nhật) hiển thị năng lực nhà máy, chứng chỉ scan có mã kiểm tra, sản lượng thực tế và lịch sử giao hàng container đã được kiểm chứng độc lập.',
      features: [
        'Thay thế hoàn toàn hồ sơ năng lực PDF truyền thống cồng kềnh',
        'Tích hợp mã định danh QR Code & URL hồ sơ độc quyền chia sẻ toàn cầu',
        'Hiển thị trực quan năng lực kho bãi, quy mô vùng trồng và dây chuyền chế biến'
      ],
      metrics: 'Tăng 85% uy tín thương hiệu',
      actionText: 'Tìm hiểu thêm'
    },
    {
      id: 'rfq-workflow',
      title: 'RFQ & Commercial Workflow',
      tag: 'Giao dịch Minh bạch',
      audience: ['seller', 'buyer'],
      icon: Send,
      iconBg: 'bg-emerald-50 text-emerald-600',
      iconColor: 'text-emerald-600',
      borderHover: 'hover:border-emerald-300 hover:shadow-emerald-50/50',
      description: 'Chuẩn hóa quy trình tạo và phản hồi Yêu cầu Báo giá (RFQ), đàm phán thông số kỹ thuật (Specs), gửi mẫu kiểm nghiệm (Sample Request) và lưu vết bằng chứng giao dịch thương mại an toàn.',
      features: [
        'Bộ mẫu RFQ chuẩn hóa theo quy ước thương mại quốc tế (ICC Incoterms)',
        'Quy trình xác nhận và theo dõi chuyển phát mẫu kiểm nghiệm SGS / Vinacontrol',
        'Lưu trữ bằng chứng thỏa thuận số hóa không thể chỉnh sửa, bảo vệ cả hai bên'
      ],
      metrics: 'Rút ngắn 60% chu kỳ đàm phán',
      actionText: 'Tìm hiểu thêm'
    },
    {
      id: 'market-intel',
      title: 'Export Market Intelligence',
      tag: 'Dữ liệu Thị trường Chuyên sâu',
      audience: ['seller', 'buyer', 'partner'],
      icon: BarChart3,
      iconBg: 'bg-rose-50 text-rose-600',
      iconColor: 'text-rose-600',
      borderHover: 'hover:border-rose-300 hover:shadow-rose-50/50',
      description: 'Cập nhật biến động giá nông sản theo tuần, quy chuẩn kỹ thuật mới (EUDR không phá rừng, CBAM thuế carbon, FDA FSMA) và dự báo xu hướng nhu cầu tiêu dùng tại các thị trường trọng điểm.',
      features: [
        'Bản đồ giá nông sản thời gian thực tại các sàn giao dịch hàng hóa thế giới',
        'Hệ thống cảnh báo sớm rào cản kỹ thuật kiểm dịch thực vật SPS/TBT',
        'Báo cáo phân tích đối thủ cạnh tranh xuất khẩu từ Thái Lan, Ấn Độ, Brazil'
      ],
      metrics: 'Cập nhật hàng tuần',
      actionText: 'Tìm hiểu thêm'
    }
  ];

  const filteredSolutions = SOLUTIONS.filter(s => {
    if (selectedRole === 'all') return true;
    return s.audience.includes(selectedRole);
  });

  const activeSolutionData = SOLUTIONS.find(s => s.id === activeModalSolution);

  const runSimulation = (solId: SolutionId) => {
    setSimRunning(true);
    setSimResult(null);
    setSimStep(1);

    setTimeout(() => {
      setSimStep(2);
      setTimeout(() => {
        setSimStep(3);
        setSimRunning(false);
        if (solId === 'verification-engine') {
          setSimResult('Đã đối soát thành công: Đăng ký kinh doanh (ĐKKD) khớp 100% Cổng thông tin Doanh nghiệp quốc gia, Chứng chỉ GlobalG.A.P. GG-98231 hợp lệ tới 12/2026. Xếp hạng tín nhiệm: L2 Enhanced Verified.');
        } else if (solId === 'ai-trust') {
          setSimResult('Báo cáo Tín nhiệm AI hoàn tất: Chỉ số an toàn tài chính 92/100, Năng lực cấp 15 container/tháng, Độ sẵn sàng xuất khẩu EU/US: Hạng A.');
        } else if (solId === 'matching') {
          setSimResult('Khớp lệnh tự động: Tìm thấy 12 Buyer tại Đức, Hà Lan, Nhật Bản đang có nhu cầu thu mua Cà phê Robusta Grade 1 FOB Cát Lái phù hợp năng lực nhà máy.');
        } else {
          setSimResult('Mô phỏng thành công: Dữ liệu hồ sơ số hóa đã được kích hoạt và đồng bộ trên mạng lưới đối tác quốc tế VYBE Trade.');
        }
      }, 1000);
    }, 1000);
  };

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
  };

  return (
    <div className="w-full bg-[#f8fafc] text-slate-900 pb-20">
      
      {/* =========================================================================
          1. HERO SECTION: GIẢI PHÁP TOÀN DIỆN
         ========================================================================= */}
      <section className="relative w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pt-10 sm:pt-14 pb-12">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* Top Kicker Tag with Blue Bar */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-blue-50/80 border border-blue-200/60 mb-5 select-none shadow-xs">
            <span className="w-1.5 h-3.5 rounded-full bg-blue-600"></span>
            <span className="text-xs font-bold text-blue-900 tracking-wide uppercase">
              {tr("HỆ SINH THÁI GIẢI PHÁP TOÀN DIỆN")}</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-slate-900 tracking-tight leading-[1.2] mb-5">
            {tr("Bộ giải pháp toàn diện cho xuất khẩu nông sản & thực phẩm")}</h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-3xl mx-auto mb-8 font-normal">
            {tr("Từ xác thực tính pháp lý, thẩm định năng lực nhà máy bằng AI đến kết nối trực tiếp với các Buyer quốc tế. VYBE Trade giải quyết triệt để vấn đề niềm tin và tối ưu chi phí tiếp cận thị trường toàn cầu.")}</p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <span>{tr("Đặt lịch tư vấn giải pháp")}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onNavigatePricing}
              className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/80 font-semibold text-sm transition-all shadow-xs hover:border-slate-300 flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <span>{tr("Xem bảng giá & Gói dịch vụ")}</span>
            </button>

            <button
              onClick={onNavigateDirectory}
              className="px-5 py-3.5 rounded-xl text-slate-600 hover:text-slate-900 font-semibold text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-4 h-4 text-slate-400" />
              <span>{tr("Xem nhà cung cấp thực tế")}</span>
            </button>
          </div>

        </div>
      </section>

      {/* =========================================================================
          2. ROLE FILTER TABS
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 mb-8">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 p-1.5 bg-slate-200/60 rounded-2xl max-w-fit mx-auto border border-slate-200/50">
          {[
            { id: 'all', label: 'Tất cả giải pháp (6)' },
            { id: 'seller', label: 'Dành cho Nhà xuất khẩu (Seller)' },
            { id: 'buyer', label: 'Dành cho Nhà nhập khẩu (Buyer)' },
            { id: 'partner', label: 'Hiệp hội & Cơ quan Xúc tiến' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedRole(tab.id as typeof selectedRole)}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                selectedRole === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              {tr(tab.label)}
            </button>
          ))}
        </div>
      </section>

      {/* =========================================================================
          3. SOLUTIONS GRID (6 PILLARS FROM SCREENSHOT)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {filteredSolutions.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/70 shadow-xs transition-all duration-200 flex flex-col justify-between group ${item.borderHover}`}
              >
                <div>
                  
                  {/* Top Bar: Icon & Tag */}
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.iconBg} shadow-xs transition-transform group-hover:scale-105`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold tracking-wide">
                      {tr(item.tag)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {tr(item.title)}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-slate-600 leading-relaxed mb-6 font-normal">
                    {tr(item.description)}
                  </p>

                  {/* Key Features Bullet List */}
                  <div className="space-y-2.5 pt-4 border-t border-slate-100 mb-6">
                    {item.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">{tr(feat)}</span>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Bottom Action Row */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                  <span className="text-[11px] font-semibold text-slate-400">
                    {tr(item.metrics)}
                  </span>
                  <button
                    onClick={() => {
                      setActiveModalSolution(item.id);
                      setSimResult(null);
                      setSimStep(1);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <span>{tr(item.actionText)}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          4. 4-STEP EXPORT TRANSFORMATION PROCESS
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 mb-16">
        <div className="bg-white rounded-3xl p-8 sm:p-10 lg:p-12 border border-slate-200/80 shadow-sm">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-2">
              {tr("LỘ TRÌNH TRIỂN KHAI")}</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
              {tr("Quy trình 4 bước nâng tầm năng lực xuất khẩu tin cậy")}</h2>
            <p className="text-sm text-slate-600">
              {tr("Chuyển đổi số hồ sơ năng lực và kết nối thông suốt với người mua toàn cầu chỉ qua 4 giai đoạn chuẩn mực")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {[
              {
                step: '01',
                title: 'Số hóa & Xác thực Pháp lý',
                desc: 'Tải lên Đăng ký kinh doanh, chứng chỉ chất lượng. Verification Engine tự động OCR và đối soát Cổng quốc gia.',
                icon: ShieldCheck,
                color: 'text-blue-600 bg-blue-50'
              },
              {
                step: '02',
                title: 'Kích hoạt Trust Profile',
                desc: 'Hệ thống cấp phân hạng L1 - L3, tạo Hộ chiếu số doanh nghiệp đa ngôn ngữ kèm mã QR định danh toàn cầu.',
                icon: Award,
                color: 'text-amber-600 bg-amber-50'
              },
              {
                step: '03',
                title: 'Ghép nối Buyer Quốc tế',
                desc: 'Thuật toán đối sánh tìm kiếm các nhà nhập khẩu đang có nhu cầu thu mua nông sản phù hợp thông số kỹ thuật.',
                icon: Users,
                color: 'text-sky-600 bg-sky-50'
              },
              {
                step: '04',
                title: 'RFQ & Chốt Giao dịch',
                desc: 'Nhận yêu cầu báo giá chuẩn hóa, xác thực mẫu thử nghiệm và ký hợp đồng an toàn không qua môi giới rác.',
                icon: Send,
                color: 'text-emerald-600 bg-emerald-50'
              }
            ].map((st, i) => {
              const StIcon = st.icon;
              return (
                <div key={i} className="relative p-5 rounded-2xl bg-slate-50/70 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-black text-slate-300 font-mono">
                        {tr(st.step)}
                      </span>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${st.color}`}>
                        <StIcon className="w-5 h-5" />
                      </div>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-2">
                      {tr(st.title)}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {tr(st.desc)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* =========================================================================
          5. COMPARISON SECTION: TRUYỀN THỐNG VS VYBE TRADE
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 mb-16">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 lg:p-12 shadow-xl">
          
          <div className="max-w-3xl mb-10">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-2">
              {tr("SỰ KHÁC BIỆT ĐỘT PHÁ")}</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
              {tr("Tại sao các doanh nghiệp chọn Giải pháp của VYBE Trade?")}</h2>
            <p className="text-sm text-slate-300">
              {tr("So sánh hiệu quả giữa phương thức xúc tiến thương mại truyền thống và nền tảng số hóa xác thực công nghệ cao")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Traditional Method */}
            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center gap-2 mb-4 text-rose-400">
                <X className="w-5 h-5" />
                <h4 className="font-bold text-base text-white">{tr("Phương thức xúc tiến truyền thống")}</h4>
              </div>
              <ul className="space-y-3.5 text-xs text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0"></span>
                  <span>{tr("Tốn từ $5,000 - $15,000 cho mỗi chuyến hội chợ quốc tế với hiệu quả không đo lường được")}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0"></span>
                  <span>{tr("Buyer ngần ngại đặt cọc vì rủi ro giấy chứng nhận giả và thiếu thông tin nhà máy")}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0"></span>
                  <span>{tr("Phụ thuộc hoàn toàn vào môi giới trung gian, bị ép giá và mất quyền kiểm soát thương hiệu")}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0"></span>
                  <span>{tr("Thời gian thẩm định hồ sơ kéo dài từ 2 - 3 tháng qua nhiều tầng email thủ công")}</span>
                </li>
              </ul>
            </div>

            {/* VYBE Trade Platform */}
            <div className="p-6 rounded-2xl bg-blue-950/40 border border-blue-500/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
              <div className="flex items-center gap-2 mb-4 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <h4 className="font-bold text-base text-white">{tr("Hệ sinh thái giải pháp VYBE Trade")}</h4>
              </div>
              <ul className="space-y-3.5 text-xs text-slate-200">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{tr("Tiết kiệm 70% chi phí xúc tiến, hiện diện 24/7 trước hơn 5,000+ nhà nhập khẩu toàn cầu")}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{tr("Hồ sơ tín nhiệm L1 - L3 được bảo chứng với báo cáo OCR & đối soát thời gian thực")}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{tr("Kết nối trực tiếp chủ hàng với nhà mua hàng quốc tế, bảo vệ biên lợi nhuận cao nhất")}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{tr("Tạo Báo cáo Thẩm định AI chỉ trong 30 giây, rút ngắn 60% chu kỳ đàm phán hợp đồng")}</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          6. BOTTOM CTA BANNER
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-8 sm:p-12 text-center text-white relative overflow-hidden shadow-xl">
          
          <div className="max-w-2xl mx-auto relative z-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-4 tracking-tight">
              {tr("Sẵn sàng đưa sản phẩm Việt Nam vươn ra thị trường quốc tế?")}</h2>
            <p className="text-sm sm:text-base text-blue-100/90 mb-8 leading-relaxed">
              {tr("Trở thành nhà cung cấp được xác minh bởi VYBE Trade ngay hôm nay để nhận quyền truy cập trọn bộ công cụ xúc tiến và thẩm định tín nhiệm AI.")}</p>

            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <button
                onClick={onNavigateOnboarding}
                className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm transition-all shadow-md cursor-pointer active:scale-98"
              >
                {tr("Đăng ký xác minh doanh nghiệp")}</button>

              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="px-6 py-3.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white font-semibold text-sm transition-all border border-blue-400/30 cursor-pointer active:scale-98"
              >
                {tr("Đặt lịch tư vấn chuyên gia")}</button>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          7. DETAIL MODAL: INTERACTIVE SOLUTION DEEP DIVE & SIMULATOR
         ========================================================================= */}
      {activeSolutionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            
            {/* Close Button */}
            <button
              onClick={() => setActiveModalSolution(null)}
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${activeSolutionData.iconBg}`}>
                <activeSolutionData.icon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">
                  {tr(activeSolutionData.tag)}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {tr(activeSolutionData.title)}
                </h3>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {tr(activeSolutionData.description)}
            </p>

            {/* Key Capabilities */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                {tr("Tính năng & Khả năng cốt lõi:")}</h4>
              <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {activeSolutionData.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{tr(feat)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Interactive Simulator */}
            <div className="mb-6 p-5 rounded-2xl bg-blue-50/60 border border-blue-200/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                    {tr("Trình mô phỏng tính năng thực tế")}</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                  {tr("Demo tương tác")}</span>
              </div>

              <p className="text-xs text-slate-600 mb-4">
                {tr("Bấm nút bên dưới để xem hệ thống thực hiện xử lý dữ liệu tự động cho giải pháp này:")}</p>

              <button
                onClick={() => runSimulation(activeSolutionData.id)}
                disabled={simRunning}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {simRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{tr("Đang xử lý dữ liệu và đối soát chéo...")}</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4" />
                    <span>{tr("Chạy thử nghiệm mô phỏng")}</span>
                  </>
                )}
              </button>

              {simRunning && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>{tr(simStep === 1 ? 'Bước 1: Trích xuất OCR' : simStep === 2 ? 'Bước 2: Đối soát dữ liệu Cổng quốc gia' : 'Bước 3: Tổng hợp báo cáo')}</span>
                    <span>{tr(simStep * 33)}{tr("%")}</span>
                  </div>
                  <div className="w-full h-1.5 bg-blue-200/60 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-500 rounded-full"
                      style={{ width: `${simStep * 33}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {simResult && !simRunning && (
                <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 leading-relaxed flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-1">{tr("Kết quả mô phỏng:")}</span>
                    <span>{tr(simResult)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setActiveModalSolution(null)}
                className="px-5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                {tr("Đóng")}</button>
              <button
                onClick={() => {
                  setActiveModalSolution(null);
                  setIsDemoModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {tr("Nhận tư vấn giải pháp này")}</button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          8. CONSULTATION / DEMO BOOKING MODAL
         ========================================================================= */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200">
            
            <button
              onClick={() => {
                setIsDemoModalOpen(false);
                setDemoSubmitted(false);
              }}
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {demoSubmitted ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {tr("Đăng ký tư vấn thành công!")}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6 max-w-sm mx-auto">
                  {tr("Chuyên viên giải pháp của VYBE Trade sẽ liên hệ với doanh nghiệp của bạn trong vòng 2 giờ làm việc để demo chi tiết.")}</p>
                <button
                  onClick={() => {
                    setIsDemoModalOpen(false);
                    setDemoSubmitted(false);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  {tr("Hoàn tất")}</button>
              </div>
            ) : (
              <div>
                <div className="mb-5">
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">
                    {tr("ĐẶT LỊCH DEMO TRỰC TIẾP")}</span>
                  <h3 className="text-xl font-bold text-slate-900">
                    {tr("Tư vấn giải pháp cho doanh nghiệp")}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {tr("Đội ngũ chuyên gia của chúng tôi sẽ hướng dẫn chi tiết cách thức triển khai phù hợp nhất")}</p>
                </div>

                <form onSubmit={handleDemoSubmit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">{tr("Họ tên đại diện")}</label>
                    <input
                      type="text"
                      required
                      value={demoForm.name}
                      onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">{tr("Tên công ty / Đơn vị")}</label>
                    <input
                      type="text"
                      required
                      value={demoForm.company}
                      onChange={(e) => setDemoForm({ ...demoForm, company: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">{tr("Số điện thoại")}</label>
                      <input
                        type="text"
                        required
                        value={demoForm.phone}
                        onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">{tr("Email công vụ")}</label>
                      <input
                        type="email"
                        required
                        value={demoForm.email}
                        onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">{tr("Giải pháp quan tâm nhất")}</label>
                    <select
                      value={demoForm.solutionInterest}
                      onChange={(e) => setDemoForm({ ...demoForm, solutionInterest: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-slate-900 bg-white"
                    >
                      <option value="verification-engine">{tr("Verification Engine (Xác thực pháp lý đa tầng L1-L3)")}</option>
                      <option value="ai-trust">{tr("AI Trust Co-pilot (Thẩm định tín nhiệm & rủi ro AI)")}</option>
                      <option value="matching">{tr("Supplier & Buyer Matching (Kết nối đối tác quốc tế)")}</option>
                      <option value="trust-profile">{tr("Verified Trust Profile (Hộ chiếu số doanh nghiệp)")}</option>
                      <option value="rfq-workflow">{tr("RFQ & Commercial Workflow (Giao dịch & Hợp đồng)")}</option>
                      <option value="market-intel">{tr("Export Market Intelligence (Phân tích thị trường xuất khẩu)")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">{tr("Nhu cầu cụ thể")}</label>
                    <textarea
                      rows={2}
                      value={demoForm.message}
                      onChange={(e) => setDemoForm({ ...demoForm, message: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-slate-900"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer mt-2"
                  >
                    {tr("Gửi yêu cầu tư vấn")}</button>
                </form>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
