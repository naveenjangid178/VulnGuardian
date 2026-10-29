import type { ReactNode } from 'react';

import Icon from './Icon';
import { cn } from './cn';

/*
  Alert standards
  - 8px radius, 1px tinted border, 13px text
  - Errors use role="alert" so screen readers announce them
  - Say what went wrong and what to do next
  - Pass onDismiss to show a close button
*/

type AlertVariant = 'error' | 'info';

const styles: Record<AlertVariant, string> = {
  error: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-zinc-200 bg-zinc-50 text-zinc-700',
};

const iconColor: Record<AlertVariant, string> = {
  error: 'text-red-500',
  info: 'text-zinc-400',
};

export default function Alert({
  variant = 'error',
  id,
  onDismiss,
  children,
}: {
  variant?: AlertVariant;
  id?: string;
  onDismiss?: () => void;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] leading-5',
        styles[variant],
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0',
          iconColor[variant],
        )}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16.5v.01" />
      </svg>

      <div className="min-w-0 flex-1">{children}</div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-60 transition duration-150 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          <Icon name="x" className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}