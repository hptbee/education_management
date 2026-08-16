'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowRight, Gift as GiftIcon, Star } from 'lucide-react'
import type { Gift } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { useGiftImageUrl } from '@/src/hooks/useGiftImageUrl'
import { ClassroomCard, EmptyState } from '@/src/components/classroom'

const DISPLAY_COUNT = 3

function FeaturedGiftItem({ gift, classroomId }: { gift: Gift; classroomId: string }) {
  const imageUrl = useGiftImageUrl(classroomId, gift.imagePath)

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-slate-50/80 px-2.5 py-2">
      <div
        className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-pastel-sky/80 to-pastel-pink/50 ring-2 ring-white"
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <GiftIcon className="size-5 text-brand/70" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-slate-800">{gift.name}</p>
        {gift.description ? (
          <p className="truncate text-[11px] font-semibold text-slate-500">{gift.description}</p>
        ) : null}
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-extrabold text-brand">
        <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
        {gift.requiredPoints}
      </span>
    </li>
  )
}

export function FeaturedGifts() {
  const { data } = useAppData()
  const classroomId = data?.metadata.id ?? ''
  const gifts = data?.rewards ?? []

  const featuredGifts = useMemo(() => {
    return gifts
      .filter((gift) => gift.isActive)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, DISPLAY_COUNT)
  }, [gifts])

  return (
    <ClassroomCard>
      <header className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl bg-pastel-pink">
          <GiftIcon className="size-4 text-rose-600" />
        </span>
        <h3 className="font-display text-base font-extrabold text-slate-800">Quà nổi bật</h3>
      </header>

      {featuredGifts.length === 0 ? (
        <EmptyState
          compact
          icon={GiftIcon}
          title="Chưa có quà trưng bày"
          description="Thêm quà vào tủ để học sinh cùng ngắm và đổi điểm."
          action={
            <Link
              href="/rewards"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              Mở tủ quà
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {featuredGifts.map((gift) => (
            <FeaturedGiftItem key={gift.id} gift={gift} classroomId={classroomId} />
          ))}
        </ul>
      )}

      {featuredGifts.length > 0 ? (
        <Link
          href="/rewards"
          className="mt-4 flex min-h-11 items-center justify-center gap-1.5 border-t border-sky-100 pt-4 text-sm font-bold text-brand transition hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-lg"
        >
          Xem tủ quà
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </ClassroomCard>
  )
}
