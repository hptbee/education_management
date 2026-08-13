"use client";

import { LucideIcon } from "lucide-react";
import { ClassroomSelectorScreen } from "@/src/App";
import { useActiveClassroom } from "@/src/hooks/useActiveClassroom";

interface PagePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  statusMessage?: string;
}

export function PagePlaceholder({
  title,
  description,
  icon: Icon,
  statusMessage = "Tính năng này đang được chuẩn bị.",
}: PagePlaceholderProps) {
  const { isLoaded, database } = useActiveClassroom();

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xl font-bold text-gray-500">Đang tải dữ liệu...</p>
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
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-brand-purple/20 to-brand-purple/5 text-brand-purple shadow-inner">
        <Icon size={48} strokeWidth={1.5} />
      </div>
      <h1 className="font-display text-4xl font-extrabold text-[#273055] mt-4">
        {title}
      </h1>
      <p className="text-lg text-[#6a6f91] max-w-lg">
        {description}
      </p>
      <div className="mt-8 rounded-2xl border-2 border-brand-purple/20 bg-brand-purple/5 px-6 py-4">
        <p className="font-bold text-brand-purple flex items-center gap-2">
          <span className="text-xl">✨</span> {statusMessage}
        </p>
      </div>
    </div>
  );
}
