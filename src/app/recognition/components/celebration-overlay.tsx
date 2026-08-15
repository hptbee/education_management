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

const FIREWORK_COLORS = ['#ff0a54', '#ff477e', '#ff7096', '#ffd60a', '#fca311', '#4cc9f0', '#7b2ff7', '#00f5d4']

function launchFireworksBurst() {
  const defaults = { startVelocity: 28, spread: 360, ticks: 70, zIndex: 70, colors: FIREWORK_COLORS }

  confetti({ ...defaults, particleCount: 45, origin: { x: 0.15, y: 0.55 } })
  confetti({ ...defaults, particleCount: 45, origin: { x: 0.85, y: 0.55 } })
  confetti({ ...defaults, particleCount: 60, origin: { x: 0.5, y: 0.35 } })
  confetti({
    ...defaults,
    particleCount: 35,
    scalar: 1.1,
    origin: { x: 0.5, y: 0.65 },
  })
}

function launchFireworkStream(durationMs = 2200) {
  const end = Date.now() + durationMs

  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 65,
      origin: { x: 0, y: 0.55 },
      colors: FIREWORK_COLORS,
      zIndex: 70,
    })
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 65,
      origin: { x: 1, y: 0.55 },
      colors: FIREWORK_COLORS,
      zIndex: 70,
    })

    if (Date.now() < end) requestAnimationFrame(frame)
  }

  frame()
}

function CelebrationBackgroundEffects() {
  const sparkles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: `${(i * 37 + 11) % 100}%`,
        top: `${(i * 53 + 7) % 100}%`,
        size: 6 + (i % 4) * 3,
        delay: (i % 7) * 0.25,
        duration: 1.1 + (i % 5) * 0.35,
      })),
    [],
  )

  const emojis = useMemo(
    () =>
      ['🎉', '✨', '🌟', '🎊', '💫', '🎈'].map((emoji, i) => ({
        id: i,
        emoji,
        left: `${10 + i * 15}%`,
        delay: i * 0.6,
        duration: 4 + (i % 3),
      })),
    [],
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-amber-200/25 via-pink-200/20 to-sky-300/25"
        animate={{ opacity: [0.35, 0.75, 0.35] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-0 bg-gradient-to-tr from-violet-200/15 via-transparent to-yellow-200/20"
        animate={{ opacity: [0.2, 0.55, 0.2] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      />
      <motion.div
        className="absolute inset-0 bg-white"
        animate={{ opacity: [0, 0.12, 0] }}
        transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 2.1 }}
      />

      {sparkles.map((sparkle) => (
        <motion.span
          key={sparkle.id}
          className="absolute rounded-full bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.9)]"
          style={{
            left: sparkle.left,
            top: sparkle.top,
            width: sparkle.size,
            height: sparkle.size,
          }}
          animate={{
            opacity: [0.15, 1, 0.15],
            scale: [0.6, 1.3, 0.6],
          }}
          transition={{
            duration: sparkle.duration,
            repeat: Infinity,
            delay: sparkle.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {emojis.map((item) => (
        <motion.span
          key={item.id}
          className="absolute text-2xl sm:text-3xl"
          style={{ left: item.left, bottom: '-8%' }}
          animate={{
            y: [0, -920],
            opacity: [0, 1, 1, 0],
            rotate: [0, 12, -8, 0],
          }}
          transition={{
            duration: item.duration,
            repeat: Infinity,
            delay: item.delay,
            ease: 'linear',
          }}
        >
          {item.emoji}
        </motion.span>
      ))}
    </div>
  )
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
    launchFireworksBurst()
    launchFireworkStream()
  }, [stepIndex, showFinale, canAnimate])

  useEffect(() => {
    if (!canAnimate) return
    const interval = window.setInterval(() => {
      launchFireworksBurst()
    }, 2800)
    return () => window.clearInterval(interval)
  }, [canAnimate])

  if (items.length === 0) return null

  const renderStudentCard = (item: (typeof items)[0], large = true) => {
    const name = item.student?.name ?? item.recognition.studentName ?? 'Học sinh'
    const avatar = item.student ? getStudentAvatar(item.student) : '/placeholder.svg'

    return (
      <motion.div
        key={item.recognition.id}
        initial={canAnimate ? { scale: 0.88, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative flex flex-col items-center text-center"
      >
        <motion.div
          className="mb-4 flex items-center gap-2 text-amber-500"
          animate={canAnimate ? { scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] } : undefined}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkles className="size-5" />
          <Star className="size-6 fill-star text-star" />
          <Sparkles className="size-5" />
        </motion.div>

        <motion.div
          className="relative mb-6 flex size-20 items-center justify-center rounded-full bg-pastel-yellow shadow-lg ring-4 ring-white"
          animate={canAnimate ? { rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] } : undefined}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <PartyPopper className="size-10 text-amber-600" />
          {canAnimate ? (
            <motion.span
              className="absolute inset-0 rounded-full ring-4 ring-amber-300/60"
              animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
          ) : null}
        </motion.div>

        <motion.p
          className="text-lg font-extrabold uppercase tracking-wide text-brand"
          animate={
            canAnimate
              ? {
                  opacity: [1, 0.45, 1],
                  textShadow: [
                    '0 0 0px rgba(59,130,246,0)',
                    '0 0 18px rgba(59,130,246,0.55)',
                    '0 0 0px rgba(59,130,246,0)',
                  ],
                }
              : undefined
          }
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        >
          Xin chúc mừng!
        </motion.p>

        <motion.div
          className="relative mt-6"
          animate={canAnimate ? { scale: [1, 1.04, 1] } : undefined}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {canAnimate ? (
            <>
              <motion.span
                className={`absolute inset-0 rounded-full bg-amber-300/40 blur-md ${large ? 'size-32' : 'size-24'}`}
                animate={{ opacity: [0.3, 0.75, 0.3], scale: [0.95, 1.08, 0.95] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.span
                className={`absolute -inset-2 rounded-full border-2 border-amber-300/70 ${large ? '' : ''}`}
                animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.12, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
              />
            </>
          ) : null}
          <img
            src={avatar}
            alt={name}
            className={`relative rounded-full object-cover ring-4 ring-white shadow-xl ${
              large ? 'size-32' : 'size-24'
            }`}
          />
        </motion.div>

        <motion.h2
          className={`mt-6 font-display font-black text-slate-800 ${
            large ? 'text-4xl sm:text-5xl' : 'text-3xl'
          }`}
          initial={canAnimate ? { y: 12, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          {name}
        </motion.h2>

        <motion.p
          className="mt-4 flex items-center gap-2 text-xl font-extrabold text-amber-800 sm:text-2xl"
          animate={
            canAnimate
              ? {
                  scale: [1, 1.05, 1],
                  color: ['#92400e', '#b45309', '#92400e'],
                }
              : undefined
          }
          transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.span
            animate={canAnimate ? { rotate: [0, 12, -12, 0] } : undefined}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {item.recognition.titleIcon ?? '🌟'}
          </motion.span>
          <span className="uppercase">{item.recognition.title}</span>
          <motion.span
            animate={canAnimate ? { rotate: [0, -12, 12, 0] } : undefined}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          >
            {item.recognition.titleIcon ?? '🌟'}
          </motion.span>
        </motion.p>

        {item.recognition.message ? (
          <motion.p
            className="mt-6 max-w-lg text-lg font-semibold leading-relaxed text-slate-600 sm:text-xl"
            initial={canAnimate ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            &ldquo;{item.recognition.message}&rdquo;
          </motion.p>
        ) : null}

        {item.recognition.awardedPoints && item.recognition.awardedPoints > 0 ? (
          <motion.p
            className="mt-6 flex items-center gap-2 rounded-full bg-pastel-yellow px-5 py-2 text-lg font-extrabold text-amber-800"
            animate={canAnimate ? { scale: [1, 1.06, 1], boxShadow: ['0 0 0 rgba(251,191,36,0)', '0 0 20px rgba(251,191,36,0.5)', '0 0 0 rgba(251,191,36,0)'] } : undefined}
            transition={{ duration: 1.4, repeat: Infinity }}
          >
            <Star className="size-5 fill-star text-star" />
            +{item.recognition.awardedPoints} điểm
          </motion.p>
        ) : null}

        {item.recognition.awardedBadgeId ? (
          <motion.p
            className="mt-4 flex items-center gap-2 rounded-full bg-brand-soft px-5 py-2 text-base font-extrabold text-brand-dark"
            animate={canAnimate ? { opacity: [0.85, 1, 0.85] } : undefined}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            🏅 Nhận huy hiệu:{' '}
            {badges.find((b) => b.id === item.recognition.awardedBadgeId)?.icon ?? '🏅'}{' '}
            {badges.find((b) => b.id === item.recognition.awardedBadgeId)?.name ?? 'Huy hiệu mới'}
          </motion.p>
        ) : null}
      </motion.div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-gradient-to-b from-pastel-sky via-white to-pastel-pink">
      {canAnimate ? <CelebrationBackgroundEffects /> : null}

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-700"
        aria-label="Đóng"
      >
        <X className="size-5" />
      </button>

      <div className="relative z-[1] flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-16 scrollbar-thin">
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
              <motion.h2
                className="font-display text-3xl font-black text-slate-800 sm:text-4xl"
                animate={canAnimate ? { scale: [1, 1.03, 1] } : undefined}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                🎉 Cả lớp cùng chúc mừng các bạn!
              </motion.h2>
              <p className="mt-2 text-lg font-bold text-brand">{items[0]?.recognition.title}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                {items.map((item, index) => {
                  const name = item.student?.name ?? item.recognition.studentName ?? 'Học sinh'
                  return (
                    <motion.div
                      key={item.recognition.id}
                      initial={canAnimate ? { opacity: 0, y: 16 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className="flex flex-col items-center rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-sky-100"
                    >
                      <img
                        src={item.student ? getStudentAvatar(item.student) : '/placeholder.svg'}
                        alt={name}
                        className="size-16 rounded-full object-cover ring-2 ring-white"
                      />
                      <p className="mt-2 text-sm font-extrabold text-slate-800">{name}</p>
                    </motion.div>
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

      <div className="relative z-[1] flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-sky-100 bg-white/80 px-6 py-4 backdrop-blur-sm">
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
