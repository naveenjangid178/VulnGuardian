import type { ButtonHTMLAttributes } from 'react';

import { cn } from './cn';

/*
  Button standards (use everywhere)
  - Radius   8px (rounded-lg)
  - Heights  sm 32px · md 40px · lg 44px
  - Text     14px medium (13px on sm)
  - Motion   150ms, 2% press-down, no decorative effects
  - Focus    2px ring with 2px offset, keyboard only
  - Primary  near-black. Secondary: white + hairline border. Ghost: text only.
*/

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-zinc-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(0,0,0,0.2)] hover:bg-zinc-800 focus-visible:ring-zinc-900 active:bg-zinc-950',
  secondary:
    'border border-zinc-200 bg-white text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-zinc-300 hover:bg-zinc-50 focus-visible:ring-zinc-900',
  ghost:
    'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-zinc-900',
  danger:
    'bg-red-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(185,28,28,0.35)] hover:bg-red-500 focus-visible:ring-red-600 active:bg-red-700',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

type StyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
};

/**
 * Class names for anything that should look like a button,
 * e.g. a react-router <Link>:
 *   <Link to="/projects" className={buttonStyles({ variant: 'secondary' })} />
 */
export function buttonStyles({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: StyleOptions = {}) {
  return cn(
    base,
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className,
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn(
        'h-4 w-4 animate-spin motion-reduce:animate-none',
        className,
      )}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    StyleOptions {
  loading?: boolean;
}

export default function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  disabled,
  className,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({
        variant,
        size,
        fullWidth,
        className,
      })}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}