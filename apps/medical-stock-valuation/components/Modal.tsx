import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  minWidth?: string;
}

/**
 * 再利用可能なモーダルコンポーネント
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  minWidth = '400px',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000]"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className="bg-white p-6 rounded-lg max-w-[90%] max-h-[80vh] overflow-auto"
        style={{ minWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="modal-title" className="mt-0">{title}</h3>
        {children}
      </div>
    </div>
  );
}
