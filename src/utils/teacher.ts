import type { TeacherProfile } from '@/src/types/models'

export function getTeacherAvatar(teacher?: Pick<TeacherProfile, 'avatar'> | null): string | undefined {
  const src = teacher?.avatar?.trim()
  return src || undefined
}
