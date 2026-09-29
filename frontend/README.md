# VYBE TRADE - Next.js App Router Application

Dự án Next.js 15 (App Router) được refactor và chuyển đổi hoàn chỉnh từ codebase React SPA của VYBE TRADE.

## 🚀 Cấu trúc thư mục Next.js (`/nextjs`)

```
nextjs/
├── app/
│   ├── globals.css         # Tailwind & typography styling
│   ├── layout.tsx          # Root Layout chuẩn Next.js (SSR metadata, fonts, Providers)
│   ├── page.tsx            # Main page routing & layout
│   └── providers.tsx       # Client-side LanguageProvider wrapper
├── components/             # Các components UI được module hóa
│   ├── Header.tsx          # Navigation bar, language switcher, auth profile
│   ├── Footer.tsx          # Footer thông tin pháp lý & liên hệ
│   ├── HomePage.tsx        # Hero, Search bar đa tiêu chí, Isometric visual, Features, Featured Suppliers
│   ├── BuyerDirectory.tsx  # Danh bạ nhà cung cấp với bộ lọc L1-L2-L3, tìm kiếm
│   ├── BuyerSellerDetail.tsx # Chi tiết hồ sơ năng lực & gửi RFQ
│   ├── PricingPlans.tsx    # Bảng giá dịch vụ xác minh & thành viên
│   ├── SolutionsPage.tsx   # Giải pháp chuỗi cung ứng B2B tin cậy
│   ├── AboutUsPage.tsx     # Giới thiệu VYBE TRADE
│   ├── AuthPage.tsx        # Đăng nhập & Đăng ký tài khoản
│   ├── SellerWorkspace.tsx # Không gian làm việc của Seller
│   ├── AdminDashboard.tsx  # Bảng điều khiển quản trị hệ thống
│   └── ...
├── context/
│   └── LanguageContext.tsx # Context hỗ trợ đa ngôn ngữ (VI, EN, FR, JA)
├── i18n/
│   ├── catalog.json        # Từ điển bản dịch 4 ngôn ngữ
│   └── translate.ts        # Thuật toán tra cứu và dịch chuỗi
├── lib/
│   ├── constants.ts        # Danh sách thẻ phổ biến, danh mục, cấp độ xác minh
│   ├── demoAuth.ts         # Quản lý phiên đăng nhập demo (SSR-safe)
│   ├── suppliers.ts        # Dữ liệu nhà cung cấp mẫu
│   └── supplierSearch.ts   # Logic tìm kiếm tiếng Việt không dấu & đa ngôn ngữ
├── next.config.mjs         # Cấu hình Next.js
├── tailwind.config.ts      # Cấu hình Tailwind CSS
├── tsconfig.json           # Cấu hình TypeScript với alias `@/*`
└── package.json            # Scripts và dependencies
```

---

## 🛠️ Hướng dẫn cài đặt và chạy cục bộ

### 1. Di chuyển vào thư mục Next.js:
```bash
cd nextjs
```

### 2. Cài đặt dependencies:
```bash
npm install
```

### 3. Chạy môi trường Development:
```bash
npm run dev
```
Truy cập ứng dụng tại: `http://localhost:3000`

### 4. Build phiên bản Production:
```bash
npm run build
npm run start
```

---

## ✨ Điểm nổi bật sau khi Refactor

1. **Kiến trúc Module hóa**:
   - `Header.tsx`, `HomePage.tsx`, `Footer.tsx` tách biệt độc lập, tái sử dụng dễ dàng.
   - `App.tsx` giảm từ 1,200 dòng xuống chỉ còn ~140 dòng tinh gọn, đóng vai trò điều hướng routing rõ ràng.

2. **Tương thích hoàn toàn Next.js 15 & React 19**:
   - Tách biệt rõ ràng Server Components và Client Components với chỉ thị `'use client'`.
   - Tránh lỗi hydration mismatch bằng cơ chế SSR-safe trong `demoAuth.ts`.
   - Tối ưu SEO với metadata tags trong `app/layout.tsx`.

3. **Giao diện & Trải nghiệm**:
   - Nút chọn ngôn ngữ quốc kỳ tinh tế, gọn gàng.
   - Không còn lời gọi hàm `window.alert` gây gián đoạn iFrame.
