'use client';

// Dòng lưu ý khi kết quả dựa trên dữ liệu chưa được luật sư thương mại xác nhận
// (SPEC_compliance_data_20_codes §2a). Cùng cỡ chữ nội dung chính, không thu gọn, không ẩn sau
// tooltip. Chỉ hiện khi review_state = UNREVIEWED; REVIEWED thì không hiện gì.
// compact: cỡ chữ nhỏ cho khung nhỏ (xem thuế tại sản phẩm, danh sách bằng chứng) — cùng cỡ nội dung ở đó.
import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function UnreviewedNotice({ state, compact = false }: { state: string | null | undefined; compact?: boolean }) {
  const { tr } = useLanguage();
  if (state !== 'UNREVIEWED') return null;
  return (
    <p
      data-testid="unreviewed-notice"
      className={
        compact
          ? 'mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900'
          : 'mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base text-amber-900'
      }
    >
      {tr(
        'Lưu ý: Thông tin này chưa được luật sư thương mại xác nhận. Vui lòng đối chiếu với cơ quan cấp C/O hoặc chuyên gia tư vấn trước khi sử dụng.',
      )}
    </p>
  );
}
