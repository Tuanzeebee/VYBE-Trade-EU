'use client';

// Khung trang onboarding dùng chung: header (slot, mỗi vai trò một kiểu), thanh bước, cột giới thiệu và
// thẻ nội dung của bước hiện tại. `overlays` dành cho hộp thoại hiện trên cùng (vd thông báo thành công).
import React from 'react';

export function OnboardingShell({
  header,
  stepper,
  aside,
  children,
  cardLabelledBy,
  overlays,
}: {
  header: React.ReactNode;
  stepper: React.ReactNode;
  aside: React.ReactNode;
  children: React.ReactNode;
  cardLabelledBy?: string;
  overlays?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f3f7f8] text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      <div>
        {header}
        {stepper}
        <main className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {aside}
            <section
              aria-labelledby={cardLabelledBy}
              className="min-w-0 lg:col-span-7 bg-white rounded-3xl p-6 sm:p-9 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
            >
              {children}
            </section>
          </div>
        </main>
      </div>
      {overlays}
    </div>
  );
}
