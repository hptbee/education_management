"use client";

import { SettingsPage } from "./components/settings-page";
import { ClassroomSelectorScreen } from "./components/classroom-selector-screen";
import { useAppData } from "@/src/store/AppDataContext";

export default function Settings() {
  const { data, isLoading } = useAppData();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xl font-bold text-slate-500">Đang tải dữ liệu...</p>
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
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6 p-5 pb-10">
        <SettingsPage />
      </div>
    </div>
  );
}
