"use client";

import { Suspense } from "react";
import { ClassroomsPage } from "./components/classrooms-page";

function ClassroomsPageFallback() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm font-semibold text-slate-500">Đang tải quản lý lớp...</p>
    </div>
  );
}

export default function ClassroomsRoute() {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6 p-5 pb-10">
        <Suspense fallback={<ClassroomsPageFallback />}>
          <ClassroomsPage />
        </Suspense>
      </div>
    </div>
  );
}
