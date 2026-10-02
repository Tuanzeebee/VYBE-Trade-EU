'use client';

// Dòng lưu ý khi kết quả dựa trên dữ liệu chưa được luật sư thương mại xác nhận
// (SPEC_compliance_data_20_codes §2a). Cùng cỡ chữ nội dung chính, không thu gọn, không ẩn sau
// tooltip. Chỉ hiện khi review_state = UNREVIEWED; REVIEWED thì không hiện gì.
import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function UnreviewedNotice({ state }: { state: string | null | undefined }) {
  const { tr } = useLanguage();
  if (state !== 'UNREVIEWED') return null;
  return (
    <p
      data-testid="unreviewed-notice"
      className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base text-amber-900"
    >
      {tr(
        'Lưu ý: Thông tin này chưa được luật sư thương mại xác nhận. Vui lòng đối chiếu với cơ quan cấp C/O hoặc chuyên gia tư vấn trước khi sử dụng.',
      )}
    </p>
  );
}
