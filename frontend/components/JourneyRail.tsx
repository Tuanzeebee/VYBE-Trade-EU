'use client';
// Thanh bước hành trình: rail trái (desktop) và thanh cuộn ngang (mobile 390px). Không khóa cứng bước nào.
import React from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../i18n/navigation';
import { STEP_META, STEP_ORDER, type StepKey } from '../lib/journey';
import type { WorkspaceTabId } from './SellerWorkspace';

export type JourneyStepState = { key: string; track: string; done: boolean };

type Props = {
  steps: JourneyStepState[];
  activeTab: WorkspaceTabId;
  onSelectTab: (tab: WorkspaceTabId) => void;
  /** horizontal = thanh ngang cuộn cho màn hình hẹp. */
  horizontal?: boolean;
};

const TRACKS: { id: 'product' | 'sales'; title: string }[] = [
  { id: 'product', title: 'Hoàn thiện hồ sơ' },
  { id: 'sales', title: 'Bán hàng' },
];

const TRACK_OF: Record<StepKey, 'product' | 'sales'> = {
  company: 'product',
  products: 'product',
  evidence: 'product',
  verification: 'product',
  market: 'sales',
  tariff: 'sales',
  origin: 'sales',
  requests: 'sales',
  services: 'sales',
};

export default function JourneyRail({ steps, activeTab, onSelectTab, horizontal = false }: Props) {
  const { tr } = useLanguage();
  const doneOf = (key: StepKey) => steps.find((s) => s.key === key)?.done ?? false;
  const row = (key: StepKey) => {
    const meta = STEP_META[key];
    const active = meta.tab !== null && meta.tab === activeTab;
    const cls = horizontal
      ? `shrink-0 flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${active ? 'bg-[#e6f4f2] text-[#0d766e]' : 'bg-slate-50 text-slate-600'}`
      : `flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-semibold ${active ? 'bg-[#e6f4f2] text-[#0d766e]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`;
    const mark = (
      <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${doneOf(key) ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300'}`}>
        {doneOf(key) ? <Check className="h-3 w-3" /> : STEP_ORDER.indexOf(key) + 1}
      </span>
    );
    return meta.tab ? (
      <button key={key} type="button" aria-current={active ? 'page' : undefined} onClick={() => onSelectTab(meta.tab as WorkspaceTabId)} className={cls}>
        {mark}
        <span>{tr(meta.label)}</span>
      </button>
    ) : (
      <Link key={key} href={meta.href as string} className={cls}>
        {mark}
        <span>{tr(meta.label)}</span>
      </Link>
    );
  };
  if (horizontal) {
    return (
      <nav aria-label={tr('Hành trình')} className="flex gap-2 overflow-x-auto">
        {STEP_ORDER.map(row)}
      </nav>
    );
  }
  return (
    <nav aria-label={tr('Hành trình')} className="space-y-5">
      {TRACKS.map((track) => (
        <div key={track.id}>
          <p className="mb-2 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{tr(track.title)}</p>
          <div className="space-y-1">{STEP_ORDER.filter((k) => TRACK_OF[k] === track.id).map(row)}</div>
        </div>
      ))}
    </nav>
  );
}
