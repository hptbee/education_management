"use client";

import { Gift as GiftIcon } from "lucide-react";
import type { Gift } from "@/src/types/models";
import { PresentationChrome } from "@/src/components/PresentationChrome";
import { GiftCard } from "./gift-card";

interface GiftPresentationViewProps {
  gifts: Gift[];
  classroomId: string;
}

export function GiftPresentationView({ gifts, classroomId }: GiftPresentationViewProps) {
  return (
    <PresentationChrome
      title="Tủ quà"
      subtitle={gifts.length > 0 ? `${gifts.length} món quà đang trưng bày` : "Trình chiếu cho cả lớp"}
    >
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
    </PresentationChrome>
  );
}
