"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for admin_auth cookie
    const hasAuthCookie = document.cookie
      .split("; ")
      .some((row) => row.startsWith("admin_auth=true"));

    if (pathname === "/login") {
      if (hasAuthCookie) {
        router.replace("/");
      } else {
        setIsAuthenticated(false);
        setCheckingAuth(false);
      }
    } else {
      if (!hasAuthCookie) {
        setIsAuthenticated(false);
        router.replace("/login");
      } else {
        setIsAuthenticated(true);
        setCheckingAuth(false);
      }
    }
  }, [pathname, router]);

  // If on login page, render login page directly without sidebar
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // If still verifying auth or not authenticated yet, display a luxury loading state
  if (checkingAuth || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-3 border-emerald-500/20 border-t-emerald-400 animate-spin rounded-full" />
          <p className="text-xs text-gray-500 tracking-wider uppercase font-semibold">
            Verifying Admin Access...
          </p>
        </div>
      </div>
    );
  }

  // Authenticated admin view
  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden bg-[#0a0a0a] text-white w-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#0a0a0a] pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
