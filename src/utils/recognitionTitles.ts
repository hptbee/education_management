import type { RecognitionTitle } from "../types/models";
import { createId } from "./id";

export const DEFAULT_RECOGNITION_TITLE_SEEDS: Array<Pick<RecognitionTitle, "name" | "icon" | "description">> = [
  { name: "Ngôi sao chăm chỉ", icon: "🌟", description: "Dành cho bạn học tập nghiêm túc và chăm chỉ" },
  { name: "Học tập tiến bộ", icon: "📚", description: "Ghi nhận sự tiến bộ rõ rệt trong học tập" },
  { name: "Bạn tốt", icon: "🤝", description: "Luôn giúp đỡ và quan tâm bạn bè" },
  { name: "Học sinh thân thiện", icon: "😊", description: "Vui vẻ, hòa đồng với mọi người" },
  { name: "Sáng tạo", icon: "🎨", description: "Có ý tưởng mới và sáng tạo trong học tập" },
  { name: "Tích cực tham gia", icon: "🔥", description: "Nhiệt tình tham gia hoạt động lớp" },
  { name: "Trực nhật tốt", icon: "🧹", description: "Giữ gìn lớp học sạch sẽ, ngăn nắp" },
  { name: "Cố gắng mỗi ngày", icon: "💪", description: "Không ngừng nỗ lực và cố gắng" },
];

export function createDefaultRecognitionTitles(): RecognitionTitle[] {
  const now = new Date().toISOString();
  return DEFAULT_RECOGNITION_TITLE_SEEDS.map((seed) => ({
    id: createId("recognition-title"),
    name: seed.name,
    icon: seed.icon,
    description: seed.description,
    isActive: true,
    createdAt: now,
  }));
}

export function normalizeRecognitionTitlesOnDatabase<T extends { recognitionTitles?: RecognitionTitle[] }>(db: T): T {
  const recognitionTitles =
    db.recognitionTitles && db.recognitionTitles.length > 0
      ? db.recognitionTitles
      : createDefaultRecognitionTitles();
  return { ...db, recognitionTitles };
}
