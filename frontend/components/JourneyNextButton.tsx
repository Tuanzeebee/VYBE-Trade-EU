'use client';
import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import { nextAfter, STEP_META, type StepKey } from '../lib/journey';
import type { WorkspaceTabId } from './SellerWorkspace';

/** N9: nút "Tiếp theo" ở cuối mỗi bước của hành trình; bước cuối thì không hiện. */
export default function JourneyNextButton({ current, onGoTab }: { current: StepKey; onGoTab: (tab: WorkspaceTabId) => void }) {
  const { tr } = useLanguage();
  const next = nextAfter(current);
  if (!next) return null;
  const meta = STEP_META[next];
  const cls = 'inline-flex items-center gap-2 rounded-xl bg-[#083832] px-5 py-2.5 text-sm font-semibold text-white';
  const body = (
    <>
      <span>
        {tr('Tiếp theo')}: {tr(meta.label)}
      </span>
      <ArrowRight className="h-4 w-4" aria-hidden />
    </>
  );
  return (
    <div className="mt-8 flex justify-end">
      {meta.tab ? (
        <button type="button" className={cls} onClick={() => onGoTab(meta.tab as WorkspaceTabId)}>
          {body}
        </button>
      ) : (
        <Link href={meta.href as string} className={cls}>
          {body}
        </Link>
      )}
    </div>
  );
}
