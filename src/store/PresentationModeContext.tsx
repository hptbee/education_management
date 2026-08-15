"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface PresentationModeContextValue {
  isPresentationMode: boolean;
  enterPresentationMode: () => void;
  exitPresentationMode: () => void;
}

const PresentationModeContext = createContext<PresentationModeContextValue | null>(null);

export function PresentationModeProvider({ children }: { children: ReactNode }) {
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  const enterPresentationMode = useCallback(() => {
    setIsPresentationMode(true);
  }, []);

  const exitPresentationMode = useCallback(() => {
    setIsPresentationMode(false);
    if (typeof document !== "undefined" && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  const value = useMemo(
    () => ({ isPresentationMode, enterPresentationMode, exitPresentationMode }),
    [isPresentationMode, enterPresentationMode, exitPresentationMode],
  );

  return (
    <PresentationModeContext.Provider value={value}>{children}</PresentationModeContext.Provider>
  );
}

export function usePresentationMode(): PresentationModeContextValue {
  const ctx = useContext(PresentationModeContext);
  if (!ctx) {
    throw new Error("usePresentationMode must be used within PresentationModeProvider");
  }
  return ctx;
}
