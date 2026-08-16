"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { AppDataShell } from "@/src/components/classroom";
import { usePresentationMode } from "@/src/store/PresentationModeContext";
import { isPresentationPath } from "@/src/utils/presentationPaths";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isPresentationMode, exitPresentationMode } = usePresentationMode();

  useEffect(() => {
    if (isPresentationMode && pathname && !isPresentationPath(pathname)) {
      exitPresentationMode();
    }
  }, [pathname, isPresentationMode, exitPresentationMode]);

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-brand focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand/40"
      >
        Bỏ qua điều hướng
      </a>
      {!isPresentationMode ? <Sidebar /> : null}
      <main
        id="main-content"
        tabIndex={-1}
        className="classroom-shell flex flex-1 flex-col overflow-hidden"
      >
        <AppDataShell>{children}</AppDataShell>
      </main>
    </div>
  );
}
