'use client';

import { useEffect, useRef, type RefObject } from 'react';

export type ModalDialogSyncAction = 'show' | 'close' | 'noop';

/** open prop と dialog.open の差分から取るべき操作（テスト用に export） */
export function getModalDialogSyncAction(wantOpen: boolean, isOpen: boolean): ModalDialogSyncAction {
  if (wantOpen && !isOpen) return 'show';
  if (!wantOpen && isOpen) return 'close';
  return 'noop';
}

/**
 * Native <dialog> の showModal / close を open prop と同期する。
 * アンマウント時は必ず close して Top Layer（backdrop）の残留を防ぐ。
 */
export function useModalDialog(
  dialogRef: RefObject<HTMLDialogElement | null>,
  open: boolean,
  onClose: () => void,
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    switch (getModalDialogSyncAction(open, el.open)) {
      case 'show':
        el.showModal();
        break;
      case 'close':
        el.close();
        break;
      default:
        break;
    }
  }, [open, dialogRef]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onDialogClose = () => onCloseRef.current();
    el.addEventListener('close', onDialogClose);
    return () => {
      el.removeEventListener('close', onDialogClose);
      if (el.open) el.close();
    };
  }, [dialogRef]);
}
