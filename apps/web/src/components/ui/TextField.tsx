import { useId, useState } from 'react';
import type { InputHTMLAttributes } from 'react';

import { cn } from './cn.ts';

/*
  Field standards (use everywhere)
  - Label    13px medium, 6px above the input
  - Input    40px tall, 8px radius, 14px text, 12px side padding
  - States   hairline border → darker on hover → ring on focus → red when invalid
  - Helper   12px text, 6px below the input
  - Gap      16px between fields (use space-y-4 on the form)
*/

interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  /** Neutral helper text shown below the input. */
  hint?: string;
  /** Field-level error message shown below the input. */
  error?: string;
  /** Marks the field invalid without showing a message (for form-level errors). */
  invalid?: boolean;
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

export default function TextField({
  label,
  hint,
  error,
  invalid,
  id,
  type = 'text',
  className,
  disabled,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const [revealed, setRevealed] = useState(false);

  const isPassword = type === 'password';
  const isInvalid = Boolean(error) || Boolean(invalid);

  const describedBy =
    [
      props['aria-describedby'],
      error ? errorId : hint ? hintId : undefined,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-[13px] font-medium text-zinc-700"
      >
        {label}
      </label>

      <div className="relative">
        <input
          {...props}
          id={inputId}
          type={isPassword && revealed ? 'text' : type}
          disabled={disabled}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-10 w-full rounded-lg border bg-white px-3 text-sm text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition duration-150 placeholder:text-zinc-400 focus:ring-4 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500',
            isInvalid
              ? 'border-red-300 hover:border-red-300 focus:border-red-400 focus:ring-red-500/10'
              : 'border-zinc-200 hover:border-zinc-300 focus:border-zinc-400 focus:ring-zinc-900/5',
            isPassword && 'pr-10',
            className,
          )}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            disabled={disabled}
            aria-label={
              revealed ? 'Hide password' : 'Show password'
            }
            aria-pressed={revealed}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-zinc-400 transition duration-150 hover:text-zinc-700 focus-visible:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900/20 disabled:pointer-events-none disabled:opacity-50"
          >
            <EyeIcon off={revealed} />
          </button>
        )}
      </div>

      {error ? (
        <p
          id={errorId}
          className="mt-1.5 text-xs leading-4 text-red-600"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={hintId}
          className="mt-1.5 text-xs leading-4 text-zinc-500"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}