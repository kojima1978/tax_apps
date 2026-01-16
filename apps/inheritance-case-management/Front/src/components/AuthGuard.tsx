"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated, verifyToken, logout } from "@/lib/auth-service";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // ログインページはスキップ
      if (pathname === "/login") {
        setIsChecking(false);
        return;
      }

      if (!isAuthenticated()) {
        router.push("/login");
        return;
      }

      // トークンの有効性を確認
      const isValid = await verifyToken();
      if (!isValid) {
        logout();
        router.push("/login");
        return;
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [pathname, router]);

  // ログインページの場合は認証チェックなしで表示
  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return <>{children}</>;
}
