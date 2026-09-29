import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'bg-slate-200 text-slate-900',
      success: 'bg-green-100 text-green-900',
      warning: 'bg-amber-100 text-amber-900',
      danger: 'bg-red-100 text-red-900',
    },
  },
  defaultVariants: { variant: 'default' },
});

export function Badge({
  className,
  variant,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
