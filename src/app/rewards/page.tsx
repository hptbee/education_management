"use client";

import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { Gift } from "lucide-react";

export default function RewardsPage() {
  return (
    <PagePlaceholder
      title="Quản lý quà tặng"
      description="Quản lý danh sách phần thưởng và lịch sử đổi quà của học sinh."
      icon={Gift}
    />
  );
}
