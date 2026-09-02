export function formatClassLabel(className?: string) {
  const name = className?.trim()
  if (!name) return 'Lớp'
  if (/^lớp\b/i.test(name)) return name
  return `Lớp ${name}`
}

export function formatClassroomAppTitle(teacherName?: string, className?: string) {
  const teacher = teacherName?.trim() || 'Giáo viên'
  const classLabel = formatClassLabel(className)
  if (!className?.trim()) return teacher
  return `${teacher} – ${classLabel}`
}

/** IDs that share className + schoolYear with another classroom (local or cloud stub). */
export function duplicateDisplayNameIds(
  classrooms: Array<{ id: string; className: string; schoolYear: string }>,
): Set<string> {
  const counts = new Map<string, string[]>()
  for (const classroom of classrooms) {
    const key = `${classroom.className}\0${classroom.schoolYear}`
    const ids = counts.get(key)
    if (ids) ids.push(classroom.id)
    else counts.set(key, [classroom.id])
  }
  const duplicates = new Set<string>()
  for (const ids of counts.values()) {
    if (ids.length < 2) continue
    for (const id of ids) duplicates.add(id)
  }
  return duplicates
}
