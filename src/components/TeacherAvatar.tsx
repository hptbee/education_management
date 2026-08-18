'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAssetUrl } from '@/src/hooks/useAssetUrl'
import { getTeacherAvatar } from '@/src/utils/teacher'

export function TeacherAvatar({
  src,
  assetKey,
  classroomId,
  name,
  className,
}: {
  /** @deprecated Legacy inline data URL */
  src?: string
  assetKey?: string
  classroomId?: string
  name: string
  className?: string
}) {
  const [broken, setBroken] = useState(false)
  const assetUrl = useAssetUrl(classroomId, assetKey)
  const photo = assetUrl ?? getTeacherAvatar({ avatar: src })

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
