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
