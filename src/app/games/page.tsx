"use client";

import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { Gamepad2 } from "lucide-react";

export default function GamesPage() {
  return (
    <PagePlaceholder
      title="Trò chơi & Hoạt động"
      description="Các trò chơi và hoạt động thú vị giúp lớp học thêm sôi nổi."
      icon={Gamepad2}
      emoji="🎮"
      statusMessage="Trò chơi đang được chuẩn bị — sắp có hoạt động vui cho cả lớp!"
    />
  );
}
