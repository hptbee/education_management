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
      <div className="classroom-page--management">
        <Suspense fallback={<ClassroomsPageFallback />}>
          <ClassroomsPage />
        </Suspense>
      </div>
    </div>
  );
}
