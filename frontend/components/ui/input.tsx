import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
