// Logo chữ "V" hai màu của Vybe: nửa trái xanh navy, nửa phải đỏ (màu lấy từ logo Vybe Network).
export const BRAND_NAVY = '#1e3a7b';
export const BRAND_RED = '#dc2631';

export function BrandMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 5H10.5L16 20.5V28L2.5 5Z" fill={BRAND_NAVY} />
      <path d="M29.5 5H21.5L16 20.5V28L29.5 5Z" fill={BRAND_RED} />
    </svg>
  );
}
