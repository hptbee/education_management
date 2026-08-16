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
    if (isPresentationMode && !isPresentationPath(pathname)) {
      exitPresentationMode();
    }
  }, [pathname, isPresentationMode, exitPresentationMode]);

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      {!isPresentationMode ? <Sidebar /> : null}
      <main className="classroom-shell flex flex-1 flex-col overflow-hidden">
        <AppDataShell>{children}</AppDataShell>
      </main>
    </div>
  );
}
