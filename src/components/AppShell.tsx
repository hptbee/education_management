"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { AppDataShell } from "@/src/components/classroom";
import { usePresentationMode } from "@/src/store/PresentationModeContext";
import { isPresentationPath } from "@/src/utils/presentationPaths";
import { IconTouchButton } from "@/src/components/classroom";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isPresentationMode, exitPresentationMode } = usePresentationMode();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (isPresentationMode && pathname && !isPresentationPath(pathname)) {
      exitPresentationMode();
    }
  }, [pathname, isPresentationMode, exitPresentationMode]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-brand focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand/40"
      >
        Bỏ qua điều hướng
      </a>
      {!isPresentationMode ? (
        <>
          {mobileNavOpen ? (
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              aria-label="Đóng menu"
              onClick={() => setMobileNavOpen(false)}
            />
          ) : null}
          <Sidebar
            mobileOpen={mobileNavOpen}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </>
      ) : null}
      <main
        id="main-content"
        tabIndex={-1}
        className="classroom-shell flex flex-1 flex-col overflow-hidden"
      >
        {!isPresentationMode ? (
          <div className="flex shrink-0 items-center border-b border-sky-100 bg-white/80 px-3 py-2 md:hidden">
            <IconTouchButton
              onClick={() => setMobileNavOpen((open) => !open)}
              aria-label={mobileNavOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={mobileNavOpen}
              className="text-slate-600 hover:bg-slate-100"
            >
              {mobileNavOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </IconTouchButton>
            <span className="ml-2 text-sm font-extrabold text-slate-700">Lớp học</span>
          </div>
        ) : null}
        <AppDataShell>{children}</AppDataShell>
      </main>
    </div>
  );
}
