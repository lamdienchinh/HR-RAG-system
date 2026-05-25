import * as Dialog from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '../../lib/utils';

const sheetOverlayVariants = cva(
  'fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
);

const sheetContentVariants = cva(
  'fixed z-50 flex flex-col overflow-hidden bg-white shadow-xl transition ease-in-out data-[state=closed]:duration-200 data-[state=open]:duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out',
  {
    variants: {
      side: {
        right: 'inset-y-0 right-0 h-full w-[420px] border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
        left: 'inset-y-0 left-0 h-full w-[420px] border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  },
);

interface SheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly children: ReactNode;
}

export const Sheet = ({ open, onOpenChange, children }: SheetProps) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    {children}
  </Dialog.Root>
);

interface SheetTriggerProps extends ComponentPropsWithoutRef<typeof Dialog.Trigger> {}

export const SheetTrigger = ({ className, ...props }: SheetTriggerProps) => (
  <Dialog.Trigger className={cn('outline-none', className)} {...props} />
);

interface SheetContentProps extends ComponentPropsWithoutRef<typeof Dialog.Content>, VariantProps<typeof sheetContentVariants> {}

export const SheetContent = ({ className, side, children, ...props }: SheetContentProps) => (
  <Dialog.Portal>
    <Dialog.Overlay className={sheetOverlayVariants()} />
    <Dialog.Content className={cn(sheetContentVariants({ side }), className)} {...props}>
      {children}
      <Dialog.Close className="absolute right-4 top-4 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
        <X className="size-4" />
        <span className="sr-only">Close</span>
      </Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
);

interface SheetHeaderProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export const SheetHeader = ({ children, className }: SheetHeaderProps) => (
  <div className={cn('shrink-0 space-y-1.5 px-6 pt-6', className)}>
    {children}
  </div>
);

interface SheetTitleProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export const SheetTitle = ({ children, className }: SheetTitleProps) => (
  <Dialog.Title className={cn('text-base font-bold text-slate-950', className)}>
    {children}
  </Dialog.Title>
);

interface SheetDescriptionProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export const SheetDescription = ({ children, className }: SheetDescriptionProps) => (
  <Dialog.Description className={cn('text-sm text-slate-500', className)}>
    {children}
  </Dialog.Description>
);

export const SheetBody = ({ children, className }: { readonly children: ReactNode; readonly className?: string }) => (
  <div className={cn('min-h-0 flex-1 overflow-y-auto px-6 py-4', className)}>
    {children}
  </div>
);
