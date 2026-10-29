import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import Button from './Button';
import Icon from './Icon';

/*
  Confirm dialog standards
  - Built on the native <dialog>: focus is trapped, Escape closes, the page
    behind is inert, and no extra library is needed.
  - Clicking the dimmed backdrop closes it. Closing is blocked while loading.
  - Destructive actions use the red "danger" button; Cancel is secondary.
*/

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      // Native "cancel" fires on Escape; keep the dialog open while working.
      onCancel={(event) => {
        if (loading) event.preventDefault();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
      aria-labelledby="confirm-dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-sm overflow-visible rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.25)] backdrop:bg-zinc-900/30 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-5">
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"
          >
            <Icon name="alert" className="h-[18px] w-[18px]" />
          </span>

          <div className="min-w-0 pt-0.5">
            <h2
              id="confirm-dialog-title"
              className="text-[15px] font-semibold leading-5 text-zinc-900"
            >
              {title}
            </h2>

            {description && (
              <p className="mt-1.5 text-sm leading-5 text-zinc-500">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            autoFocus
          >
            Cancel
          </Button>

          <Button
            variant="danger"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}