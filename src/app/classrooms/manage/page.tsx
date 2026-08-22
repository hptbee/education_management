"use client";

import { Suspense } from "react";
import { ClassroomManagePage } from "../components/classroom-manage-page";

function ClassroomManageFallback() {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <p className="text-sm font-semibold text-slate-500">Đang tải cài đặt lớp...</p>
    </div>
  );
}

export default function ClassroomManageRoute() {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="classroom-page--management">
        <Suspense fallback={<ClassroomManageFallback />}>
          <ClassroomManagePage />
        </Suspense>
      </div>
    </div>
  );
}
