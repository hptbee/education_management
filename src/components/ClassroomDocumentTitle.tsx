'use client'

import { useEffect } from 'react'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import { formatClassroomAppTitle } from '@/src/utils/classroom'

const FALLBACK_TITLE = 'Quản lý lớp học'

export function ClassroomDocumentTitle() {
  const { classroom, teacher, isLoaded } = useActiveClassroom()

  useEffect(() => {
    if (!isLoaded) return
    document.title = classroom
      ? formatClassroomAppTitle(teacher?.name, classroom.className)
      : FALLBACK_TITLE
  }, [classroom, teacher?.name, isLoaded])

  return null
}
