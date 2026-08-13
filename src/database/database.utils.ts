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

export function generateDatabaseId(className: string, schoolYear: string): string {
  return `${slugify(className)}_${slugify(schoolYear)}`;
}

export function generateExportFilename(className: string, schoolYear: string): string {
  return `${generateDatabaseId(className, schoolYear)}.json`;
}
