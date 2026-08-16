export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove all previously split accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, " ") // replace non-alphanumeric chars with space
    .replace(/\s+/g, "-") // replace spaces with hyphens
    .replace(/-+/g, "-"); // remove consecutive hyphens
}

import { assertSafeClassroomId, isSafeClassroomId } from "./safeIdentifiers";

export function generateDatabaseId(className: string, schoolYear: string): string {
  return `${slugify(className)}_${slugify(schoolYear)}`;
}

/** Human-readable classroom JSON filename for new databases. */
export function makeClassroomFileName(databaseId: string): string {
  if (!isSafeClassroomId(databaseId)) {
    throw new Error("Mã dữ liệu lớp không hợp lệ cho tên file.");
  }
  const base = `Lop-${databaseId}.json`;
  if (base.includes("/") || base.includes("\\") || base.includes("..")) {
    throw new Error("Tên file lớp học không hợp lệ.");
  }
  return base;
}

export { assertSafeClassroomId, isSafeClassroomId };

export function generateExportFilename(className: string, schoolYear: string): string {
  return makeClassroomFileName(generateDatabaseId(className, schoolYear));
}
