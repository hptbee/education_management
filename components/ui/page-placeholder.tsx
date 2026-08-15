"use client";

import { LucideIcon } from "lucide-react";
import { ClassroomSelectorScreen } from "@/src/app/settings/components/classroom-selector-screen";
import { useActiveClassroom } from "@/src/hooks/useActiveClassroom";
import { EmptyState } from "@/src/components/classroom";

interface PagePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  statusMessage?: string;
  emoji?: string;
  imageSrc?: string;
}

export function PagePlaceholder({
  title,
  description,
  icon: Icon,
  statusMessage = "Tính năng này đang được chuẩn bị.",
  emoji = "✨",
  imageSrc,
}: PagePlaceholderProps) {
  const { isLoaded, database } = useActiveClassroom();

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xl font-bold text-slate-500">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (!database) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <ClassroomSelectorScreen />
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-6 p-8">
        <div className="grid size-20 place-items-center rounded-3xl bg-pastel-sky text-brand-purple shadow-sm">
          <Icon size={40} strokeWidth={1.5} />
        </div>

        <div className="text-center">
          <h1 className="font-display text-4xl font-black text-slate-800">{title}</h1>
          <p className="mt-3 text-lg font-semibold text-slate-500">{description}</p>
        </div>

        <EmptyState
          emoji={emoji}
          imageSrc={imageSrc}
          title={statusMessage}
          description="Chúng tôi đang hoàn thiện màn hình này để mang đến trải nghiệm vui và dễ dùng cho cả lớp."
          compact
          className="w-full"
        />
      </div>
    </div>
  );
}
