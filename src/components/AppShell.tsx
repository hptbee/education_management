"use client";

import { Sidebar } from "@/components/sidebar";
import { AppDataShell } from "@/src/components/classroom";
import { usePresentationMode } from "@/src/store/PresentationModeContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isPresentationMode } = usePresentationMode();

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      {!isPresentationMode ? <Sidebar /> : null}
      <main className="classroom-shell flex flex-1 flex-col overflow-hidden">
        <AppDataShell>{children}</AppDataShell>
      </main>
    </div>
  );
}
