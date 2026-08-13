"use client";

import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { Star } from "lucide-react";

export default function PointsPage() {
  return (
    <PagePlaceholder
      title="Tích điểm / Điểm trừ"
      description="Quản lý hệ thống điểm, cộng và trừ điểm cho cá nhân hoặc tập thể."
      icon={Star}
    />
  );
}
