'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { getTeacherAvatar } from '@/src/utils/teacher'

export function TeacherAvatar({
  src,
  name,
  className,
}: {
  src?: string
  name: string
  className?: string
}) {
  const [broken, setBroken] = useState(false)
  const photo = getTeacherAvatar({ avatar: src })

  if (photo && !broken) {
    return (
      <img
        src={photo}
        alt={name}
        onError={() => setBroken(true)}
        className={cn('object-cover', className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'grid place-items-center bg-gradient-to-br from-pastel-sky to-pastel-pink',
        className,
      )}
      aria-hidden
    >
      <span className="select-none leading-none">👩‍🏫</span>
    </div>
  )
}
