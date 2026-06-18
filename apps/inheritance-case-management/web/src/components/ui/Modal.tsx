import * as React from "react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  panelClassName?: string;
  bodyClassName?: string;
}

export function Modal({ isOpen, onClose, title, children, panelClassName, bodyClassName }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const pointerDownOnOverlay = useRef(false);
  const titleId = React.useId();

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap & restore
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement as HTMLElement;

    dialog.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    dialog.addEventListener("keydown", handleTab);
    return () => {
      dialog.removeEventListener("keydown", handleTab);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4"
      onMouseDown={(e) => { pointerDownOnOverlay.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        // 背景を直接クリックしたときのみ閉じる（モーダル内で開始したドラッグ選択では閉じない）
        if (pointerDownOnOverlay.current && e.target === e.currentTarget) onClose();
        pointerDownOnOverlay.current = false;
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "isolate flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950 opacity-100 shadow-2xl outline-none",
          panelClassName,
        )}
        style={{ backgroundColor: "#ffffff" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white p-4" style={{ backgroundColor: "#ffffff" }}>
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
            aria-label="閉じる"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className={cn("overflow-y-auto bg-white p-4", bodyClassName)} style={{ backgroundColor: "#ffffff" }}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
