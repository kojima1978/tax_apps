"use client";

import { AuthGuard } from "./AuthGuard";
import { ToastProvider } from "./ui/Toast";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthGuard>{children}</AuthGuard>
    </ToastProvider>
  );
}
