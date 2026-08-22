"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { ClassroomButton, useClassroomDialog } from "@/src/components/classroom";
import { usePresentationMode } from "@/src/store/PresentationModeContext";
import {
  isGameDialogOpen,
  requestCloseOpenGameDialogs,
} from "@/src/app/tools/components/game-dialog-portal";

interface PresentationChromeProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  /** `overlay` renders only the top bar; page content stays mounted underneath. */
  variant?: "fullscreen" | "overlay";
}

export function PresentationChrome({
  title,
  subtitle,
  children,
  variant = "fullscreen",
}: PresentationChromeProps) {
  const { exitPresentationMode } = usePresentationMode();
  const { showConfirm } = useClassroomDialog();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (variant === "overlay") return;
    const root = rootRef.current;
    if (!root) return;

    const syncFullscreen = () => {
      requestAnimationFrame(() => {
        setIsFullscreen(document.fullscreenElement === root);
      });
    };
    syncFullscreen();
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, [variant]);

  const requestExit = async () => {
    if (isGameDialogOpen()) {
      const ok = await showConfirm(
        "Đang có trò chơi mở. Thoát trình chiếu sẽ đóng hoạt động hiện tại. Tiếp tục?",
        { variant: "warning", confirmLabel: "Thoát trình chiếu" },
      );
      if (!ok) return;
      requestCloseOpenGameDialogs();
    }
    exitPresentationMode();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.fullscreenElement) return;
      if (isGameDialogOpen()) return;
      void requestExit();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const handleToggleFullscreen = () => {
    const root = rootRef.current;
    if (!root) return;
    if (document.fullscreenElement === root) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void root.requestFullscreen().catch(() => undefined);
    }
  };

  const header = (
    <div className="flex items-center justify-between gap-3 border-b border-sky-100 bg-white/90 px-5 py-4 backdrop-blur-sm">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-black text-slate-800">{title}</h1>
        {subtitle ? <p className="text-sm font-semibold text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {variant === "fullscreen" ? (
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
        ) : null}
        <ClassroomButton onClick={() => void requestExit()} className="min-h-11">
          <span className="inline-flex items-center gap-2">
            <X className="size-4" aria-hidden />
            Thoát trình chiếu
          </span>
        </ClassroomButton>
      </div>
    </div>
  );

  if (variant === "overlay") {
    return (
      <div className="presentation-chrome pointer-events-none fixed inset-x-0 top-0 z-40">
        <div className="pointer-events-auto">{header}</div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="presentation-chrome fixed inset-0 z-40 flex flex-col bg-page"
    >
      {header}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">{children}</div>
    </div>
  );
}
