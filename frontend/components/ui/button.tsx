import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-blue-800 text-white hover:bg-blue-900',
        outline: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100',
        ghost: 'text-slate-900 hover:bg-slate-100',
        destructive: 'bg-red-700 text-white hover:bg-red-800',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-6',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  if (asChild) {
    return <Slot className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  }
  return (
    <button type={type ?? 'button'} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

export { buttonVariants };
