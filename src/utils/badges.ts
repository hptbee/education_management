import type { Badge, Student } from "../types/models";
import { createId } from "./id";

export const DEFAULT_BADGE_SEEDS: Array<Pick<Badge, "name" | "icon">> = [
  { name: "Yêu sách", icon: "📚" },
  { name: "Toán giỏi", icon: "🔢" },
  { name: "Viết đẹp", icon: "✍️" },
  { name: "Sáng tạo", icon: "💡" },
  { name: "Bạn tốt", icon: "🤝" },
  { name: "Chuyên cần", icon: "⭐" },
  { name: "Tiến bộ", icon: "📈" },
  { name: "Xuất sắc tuần", icon: "🏅" },
];

export function createDefaultBadges(): Badge[] {
  const now = new Date().toISOString();
  return DEFAULT_BADGE_SEEDS.map((seed) => ({
    id: createId("badge"),
    name: seed.name,
    icon: seed.icon,
    createdAt: now,
  }));
}

export function getStudentBadges(student: Student, badges: Badge[]): Badge[] {
  const ids = student.badgeIds ?? [];
  return ids
    .map((id) => badges.find((badge) => badge.id === id))
    .filter((badge): badge is Badge => Boolean(badge));
}

export function studentHasBadge(student: Student, badgeId: string): boolean {
  return (student.badgeIds ?? []).includes(badgeId);
}

export function normalizeBadgesOnDatabase<T extends { badges?: Badge[]; students: Student[] }>(db: T): T {
  const badges = db.badges && db.badges.length > 0 ? db.badges : createDefaultBadges();
  const students = (db.students ?? []).map((student) => ({
    ...student,
    badgeIds: student.badgeIds ?? [],
  }));
  return { ...db, badges, students };
}
