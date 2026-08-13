"use client";

import { SettingsPage, ClassroomSelectorScreen } from "@/src/App";
import { useAppData } from "@/src/store/AppDataContext";

export default function Settings() {
  const { data, isLoading } = useAppData();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xl font-bold text-gray-500">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <ClassroomSelectorScreen />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5 p-5">
        <SettingsPage />
      </div>
    </div>
  );
}
