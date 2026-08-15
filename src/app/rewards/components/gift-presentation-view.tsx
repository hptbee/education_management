"use client";

import { useEffect, useState } from "react";
import { Gift as GiftIcon, Maximize2, Minimize2, X } from "lucide-react";
import type { Gift } from "@/src/types/models";
import { ClassroomButton } from "@/src/components/classroom";
import { usePresentationMode } from "@/src/store/PresentationModeContext";
import { GiftCard } from "./gift-card";

interface GiftPresentationViewProps {
  gifts: Gift[];
  classroomId: string;
}

export function GiftPresentationView({ gifts, classroomId }: GiftPresentationViewProps) {
  const { exitPresentationMode } = usePresentationMode();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
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
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-page">
      <div className="flex items-center justify-between gap-3 border-b border-sky-100 bg-white/90 px-5 py-4 backdrop-blur-sm">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-black text-slate-800">Tủ quà</h1>
          <p className="text-sm font-semibold text-slate-500">
            {gifts.length > 0 ? `${gifts.length} món quà đang trưng bày` : "Trình chiếu cho cả lớp"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ClassroomButton variant="secondary" onClick={handleToggleFullscreen} className="min-h-11">
            {isFullscreen ? (
              <>
                <Minimize2 className="size-4" aria-hidden /> Thoát toàn màn hình
              </>
            ) : (
              <>
                <Maximize2 className="size-4" aria-hidden /> Toàn màn hình
              </>
            )}
          </ClassroomButton>
          <ClassroomButton onClick={exitPresentationMode} className="min-h-11">
            <X className="size-4" aria-hidden /> Thoát trình chiếu
          </ClassroomButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {gifts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex size-20 items-center justify-center rounded-3xl bg-white shadow-sm">
              <GiftIcon className="size-10 text-brand" aria-hidden />
            </div>
            <p className="font-display text-2xl font-black text-slate-700">Chưa có quà nào để trình chiếu</p>
            <p className="mt-2 max-w-md text-base font-semibold text-slate-500">
              Hãy thêm quà và bật hiển thị trước khi trình chiếu.
            </p>
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 motion-reduce:transition-none">
            {gifts.map((gift) => (
              <GiftCard key={gift.id} gift={gift} classroomId={classroomId} presentation />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
