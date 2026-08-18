"use client";

import Link from "next/link";
import { Settings as SettingsIcon } from "lucide-react";
import { AccountSection } from "./components/account-section";
import { PageHeader } from "@/src/components/classroom";
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

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6 p-5 pb-10">
        <PageHeader
          icon={SettingsIcon}
          title="Cài đặt"
          subtitle="Tài khoản, bản quyền và sao lưu đám mây"
        />
        <p className="rounded-2xl border border-sky-100 bg-surface-soft px-4 py-3 text-sm font-semibold text-slate-600">
          Hồ sơ lớp, vai trò, xuất dữ liệu và đổi năm học nằm trong{" "}
          <Link href="/classrooms" className="font-bold text-brand hover:underline">
            Quản lý lớp
          </Link>
          {data ? (
            <>
              {" "}
              →{" "}
              <Link
                href={`/classrooms/manage?id=${encodeURIComponent(data.metadata.id)}`}
                className="font-bold text-brand hover:underline"
              >
                Cài đặt {data.classroomSettings.className}
              </Link>
            </>
          ) : null}
          .
        </p>
        <AccountSection />
      </div>
    </div>
  );
}
