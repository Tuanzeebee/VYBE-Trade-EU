'use client';

// Hàng nút điều hướng cuối mỗi bước: Quay lại, Bỏ qua (nếu có), Tiếp tục / Hoàn tất. Nhãn do bên gọi
// truyền để mỗi luồng giữ đúng chữ của mình. Dùng chung seller và buyer.
import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const BACK =
  'w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60';
const NEXT =
  'flex-1 sm:flex-none px-7 py-2.5 rounded-xl bg-[#083832] hover:bg-[#062924] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95';

export function StepNav({
  nextLabel,
  nextType = 'submit',
  onNext,
  nextDisabled = false,
  nextIcon = 'arrow',
  onBack,
  backLabel = 'Quay lại',
  skip,
  error,
  bordered = true,
}: {
  nextLabel: string;
  /** "submit" khi nút nằm trong form; "button" kèm onNext khi bên gọi tự xử lý. */
  nextType?: 'submit' | 'button';
  onNext?: () => void;
  nextDisabled?: boolean;
  nextIcon?: 'arrow' | 'check';
  onBack?: () => void;
  backLabel?: string;
  skip?: { label: string; onClick: () => void };
  error?: string;
  bordered?: boolean;
}) {
  const { tr } = useLanguage();
  return (
    <>
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {tr(error)}
        </p>
      )}
      <div className={`pt-4 flex flex-col-reverse sm:flex-row items-center gap-3 ${onBack ? 'justify-between' : 'justify-end'} ${bordered ? 'border-t border-slate-100' : ''}`}>
        {onBack && (
          <button type="button" onClick={onBack} className={BACK}>
            {tr(backLabel)}
          </button>
        )}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {skip && (
            <button type="button" onClick={skip.onClick} className={BACK}>
              {tr(skip.label)}
            </button>
          )}
          <button type={nextType} onClick={nextType === 'button' ? onNext : undefined} disabled={nextDisabled} className={NEXT}>
            <span>{tr(nextLabel)}</span>
            {nextIcon === 'check' ? <Check className="w-4 h-4 stroke-[2.5]" aria-hidden="true" /> : <ArrowRight className="w-4 h-4 stroke-[2.2]" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </>
  );
}
