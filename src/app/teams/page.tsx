"use client";

import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { UsersRound } from "lucide-react";

export default function TeamsPage() {
  return (
    <PagePlaceholder
      title="Tổ / Nhóm"
      description="Quản lý danh sách các tổ, nhóm trong lớp và theo dõi thi đua giữa các tổ."
      icon={UsersRound}
    />
  );
}
