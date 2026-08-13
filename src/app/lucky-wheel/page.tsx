"use client";

import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { Disc3 } from "lucide-react";

export default function LuckyWheelPage() {
  return (
    <PagePlaceholder
      title="Vòng quay may mắn"
      description="Vòng quay chọn ngẫu nhiên học sinh hoặc phần thưởng."
      icon={Disc3}
    />
  );
}
