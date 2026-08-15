'use client'

import { useEffect, useMemo, useState } from 'react'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import { PartyPopper, Sparkles, Star, X } from 'lucide-react'
import type { Recognition, Student } from '@/src/types/models'
import { getStudentAvatar } from '@/src/utils/student'
import { dedupeRecognitionsByStudent } from '@/src/utils/recognition'
import { ClassroomButton } from '@/src/components/classroom'

interface CelebrationOverlayProps {
  recognitions: Recognition[]
  students: Student[]
  badges: { id: string; name: string; icon?: string }[]
  animationsEnabled: boolean
  onClose: () => void
  onRecognizeMore: () => void
}

export function CelebrationOverlay({
  recognitions,
  students,
  badges,
  animationsEnabled,
  onClose,
  onRecognizeMore,
}: CelebrationOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [showFinale, setShowFinale] = useState(false)

  const uniqueRecognitions = useMemo(
    () => dedupeRecognitionsByStudent(recognitions),
    [recognitions],
  )

  const items = useMemo(
    () =>
      uniqueRecognitions.map((rec) => ({
        recognition: rec,
        student: students.find((s) => s.id === rec.studentId),
      })),
    [uniqueRecognitions, students],
  )

  const isMulti = items.length > 1
  const current = items[stepIndex]
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const canAnimate = animationsEnabled && !prefersReducedMotion

  useEffect(() => {
    if (!canAnimate) return
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.55 } })
  }, [stepIndex, showFinale, canAnimate])

  if (items.length === 0) return null

  const renderStudentCard = (item: (typeof items)[0], large = true) => {
    const name = item.student?.name ?? item.recognition.studentName ?? 'Học sinh'
    const avatar = item.student ? getStudentAvatar(item.student) : '/placeholder.svg'

    return (
      <motion.div
        key={item.recognition.id}
        initial={canAnimate ? { scale: 0.9, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center text-center"
      >
        <div className="mb-4 flex items-center gap-2 text-amber-500">
          <Sparkles className="size-5" />
          <Star className="size-6 fill-star text-star" />
          <Sparkles className="size-5" />
        </div>

        <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-pastel-yellow shadow-lg ring-4 ring-white">
          <PartyPopper className="size-10 text-amber-600" />
        </div>

        <p className="text-lg font-extrabold uppercase tracking-wide text-brand">Xin chúc mừng!</p>

        <img
          src={avatar}
          alt={name}
          className={`mt-6 rounded-full object-cover ring-4 ring-white shadow-xl ${
            large ? 'size-32' : 'size-24'
          }`}
        />

        <h2
          className={`mt-6 font-display font-black text-slate-800 ${
            large ? 'text-4xl sm:text-5xl' : 'text-3xl'
          }`}
        >
          {name}
        </h2>

        <p className="mt-4 flex items-center gap-2 text-xl font-extrabold text-amber-800 sm:text-2xl">
          <span>{item.recognition.titleIcon ?? '🌟'}</span>
          <span className="uppercase">{item.recognition.title}</span>
          <span>{item.recognition.titleIcon ?? '🌟'}</span>
        </p>

        {item.recognition.message ? (
          <p className="mt-6 max-w-lg text-lg font-semibold leading-relaxed text-slate-600 sm:text-xl">
            &ldquo;{item.recognition.message}&rdquo;
          </p>
        ) : null}

        {item.recognition.awardedPoints && item.recognition.awardedPoints > 0 ? (
          <p className="mt-6 flex items-center gap-2 rounded-full bg-pastel-yellow px-5 py-2 text-lg font-extrabold text-amber-800">
            <Star className="size-5 fill-star text-star" />
            +{item.recognition.awardedPoints} điểm
          </p>
        ) : null}

        {item.recognition.awardedBadgeId ? (
          <p className="mt-4 flex items-center gap-2 rounded-full bg-brand-soft px-5 py-2 text-base font-extrabold text-brand-dark">
            🏅 Nhận huy hiệu:{' '}
            {badges.find((b) => b.id === item.recognition.awardedBadgeId)?.icon ?? '🏅'}{' '}
            {badges.find((b) => b.id === item.recognition.awardedBadgeId)?.name ?? 'Huy hiệu mới'}
          </p>
        ) : null}
      </motion.div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gradient-to-b from-pastel-sky via-white to-pastel-pink">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-700"
        aria-label="Đóng"
      >
        <X className="size-5" />
      </button>

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-16 scrollbar-thin">
        <AnimatePresence mode="wait">
          {isMulti && !showFinale ? (
            <motion.div
              key={`step-${stepIndex}`}
              initial={canAnimate ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={canAnimate ? { opacity: 0, y: -20 } : undefined}
              className="w-full max-w-2xl"
            >
              {stepIndex === 0 ? (
                <p className="mb-8 text-center text-sm font-bold text-slate-500">
                  ✨ Bạn đầu tiên được tuyên dương...
                </p>
              ) : null}
              {current ? renderStudentCard(current) : null}
            </motion.div>
          ) : isMulti && showFinale ? (
            <motion.div
              key="finale"
              initial={canAnimate ? { opacity: 0, scale: 0.95 } : false}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-3xl text-center"
            >
              <h2 className="font-display text-3xl font-black text-slate-800 sm:text-4xl">
                🎉 Cả lớp cùng chúc mừng các bạn!
              </h2>
              <p className="mt-2 text-lg font-bold text-brand">{items[0]?.recognition.title}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                {items.map((item) => {
                  const name = item.student?.name ?? item.recognition.studentName ?? 'Học sinh'
                  return (
                    <div
                      key={item.recognition.id}
                      className="flex flex-col items-center rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-sky-100"
                    >
                      <img
                        src={item.student ? getStudentAvatar(item.student) : '/placeholder.svg'}
                        alt={name}
                        className="size-16 rounded-full object-cover ring-2 ring-white"
                      />
                      <p className="mt-2 text-sm font-extrabold text-slate-800">{name}</p>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div key="single" className="w-full max-w-2xl">
              {current ? renderStudentCard(current) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-sky-100 bg-white/80 px-6 py-4 backdrop-blur-sm">
        {isMulti && !showFinale && stepIndex < items.length - 1 ? (
          <ClassroomButton size="lg" onClick={() => setStepIndex((i) => i + 1)}>
            Bạn tiếp theo
          </ClassroomButton>
        ) : isMulti && !showFinale && stepIndex === items.length - 1 ? (
          <ClassroomButton size="lg" onClick={() => setShowFinale(true)}>
            Xem tất cả
          </ClassroomButton>
        ) : null}
        <ClassroomButton variant="secondary" size="lg" onClick={onRecognizeMore}>
          <Sparkles className="size-4" />
          Tuyên dương tiếp
        </ClassroomButton>
        <ClassroomButton variant="outline" size="lg" onClick={onClose}>
          Quay lại
        </ClassroomButton>
      </div>
    </div>
  )
}
