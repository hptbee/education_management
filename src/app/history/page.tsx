"use client";

import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { History } from "lucide-react";

export default function HistoryPage() {
  return (
    <PagePlaceholder
      title="Lịch sử hoạt động"
      description="Xem lại toàn bộ nhật ký các hoạt động đã diễn ra trong lớp."
      icon={History}
    />
  );
}
