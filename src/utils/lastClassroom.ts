const LAST_CLASSROOM_KEY = "education-management:last-classroom-id";

export function getLastClassroomId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_CLASSROOM_KEY);
  } catch {
    return null;
  }
}

export function setLastClassroomId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_CLASSROOM_KEY, id);
  } catch {
    // ignore quota errors
  }
}

export function clearLastClassroomId(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LAST_CLASSROOM_KEY);
  } catch {
    // ignore
  }
}
