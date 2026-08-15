'use client'

import { HeroBanner } from './hero-banner'
import { useAppData } from '@/src/store/AppDataContext'

export function TopBanner() {
  const { data } = useAppData()
  const customImage = data?.classroomSettings.homeBannerImage?.trim() || ''

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pastel-sky via-white to-pastel-pink/50">
      {customImage ? (
        <img
          src={customImage}
          alt="Banner lớp học"
          className="block h-auto w-full"
        />
      ) : (
        <div className="p-5 xl:p-6">
          <HeroBanner />
        </div>
      )}
    </div>
  )
}
