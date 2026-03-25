import { useState, useCallback } from 'react';

interface ConfirmDialogState<T> {
  target: T | null;
  open: T extends undefined ? () => void : (target: T) => void;
  close: () => void;
  isOpen: boolean;
}

export function useConfirmDialog<T = undefined>(): ConfirmDialogState<T> {
  const [target, setTarget] = useState<T | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback((...args: T extends undefined ? [] : [T]) => {
    const t = args[0] as T;
    setTarget(t ?? null);
    setIsOpen(true);
  }, []) as ConfirmDialogState<T>['open'];

  const close = useCallback(() => {
    setTarget(null);
    setIsOpen(false);
  }, []);

  return { target, open, close, isOpen };
}
