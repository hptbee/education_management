"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { ClassroomButton } from "@/src/components/classroom";
import { usePresentationMode } from "@/src/store/PresentationModeContext";

interface PresentationChromeProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function PresentationChrome({ title, subtitle, children }: PresentationChromeProps) {
  const { exitPresentationMode } = usePresentationMode();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const syncFullscreen = () => {
      // Defer until after the browser finishes reparenting the fullscreen subtree.
      requestAnimationFrame(() => {
        setIsFullscreen(document.fullscreenElement === root);
      });
    };
    syncFullscreen();
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (document.fullscreenElement) return;
        exitPresentationMode();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exitPresentationMode]);

  const handleToggleFullscreen = () => {
    const root = rootRef.current;
    if (!root) return;
    if (document.fullscreenElement === root) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void root.requestFullscreen().catch(() => undefined);
    }
  };

  return (
    <div
      ref={rootRef}
      className="presentation-chrome fixed inset-0 z-40 flex flex-col bg-page"
    >
      <div className="flex items-center justify-between gap-3 border-b border-sky-100 bg-white/90 px-5 py-4 backdrop-blur-sm">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-black text-slate-800">{title}</h1>
          {subtitle ? (
            <p className="text-sm font-semibold text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ClassroomButton variant="secondary" onClick={handleToggleFullscreen} className="min-h-11">
            <span className="inline-flex items-center gap-2">
              {isFullscreen ? (
                <Minimize2 className="size-4" aria-hidden />
              ) : (
                <Maximize2 className="size-4" aria-hidden />
              )}
              {isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            </span>
          </ClassroomButton>
          <ClassroomButton onClick={exitPresentationMode} className="min-h-11">
            <span className="inline-flex items-center gap-2">
              <X className="size-4" aria-hidden />
              Thoát trình chiếu
            </span>
          </ClassroomButton>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">{children}</div>
    </div>
  );
}
