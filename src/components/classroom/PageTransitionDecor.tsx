'use client'

import { Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  PAGE_DECOR_DURATION_S,
  type PagePersonality,
  type PageTransitionPreset,
} from '@/src/utils/motion'

interface PageTransitionDecorProps {
  preset: PageTransitionPreset
  colors: PagePersonality['colors']
}

const decorTransition = {
  duration: PAGE_DECOR_DURATION_S,
  ease: [0.16, 1, 0.3, 1] as const,
}

export function PageTransitionDecor({ preset, colors }: PageTransitionDecorProps) {
  const [c0, c1, c2] = colors

  if (preset === 'bouncyPop') {
    return (
      <motion.div
        aria-hidden
        className={`pointer-events-none absolute -right-8 -top-8 size-32 rounded-full blur-2xl ${c0}`}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0, 0.55, 0], scale: [0.6, 1.1, 1.2] }}
        transition={decorTransition}
      />
    )
  }

  if (preset === 'colorfulSlide') {
    return (
      <>
        <motion.div
          aria-hidden
          className={`pointer-events-none absolute -left-10 top-1/4 size-28 rounded-full blur-2xl ${c0}`}
          initial={{ opacity: 0, x: -12, scale: 0.8 }}
          animate={{ opacity: [0, 0.5, 0], x: 0, scale: 1.05 }}
          transition={decorTransition}
        />
        <motion.div
          aria-hidden
          className={`pointer-events-none absolute -right-6 bottom-1/4 size-24 rounded-full blur-2xl ${c1 ?? c0}`}
          initial={{ opacity: 0, x: 12, scale: 0.75 }}
          animate={{ opacity: [0, 0.45, 0], x: 0, scale: 1 }}
          transition={{ ...decorTransition, delay: 0.04 }}
        />
      </>
    )
  }

  if (preset === 'bubbleReveal') {
    return (
      <>
        <motion.div
          aria-hidden
          className={`pointer-events-none absolute left-[8%] top-[12%] size-20 rounded-full blur-xl ${c0}`}
          initial={{ opacity: 0, scale: 0.2 }}
          animate={{ opacity: [0, 0.5, 0], scale: [0.2, 1.15, 1.3] }}
          transition={decorTransition}
        />
        <motion.div
          aria-hidden
          className={`pointer-events-none absolute right-[10%] top-[18%] size-14 rounded-full blur-lg ${c1 ?? c0}`}
          initial={{ opacity: 0, scale: 0.25 }}
          animate={{ opacity: [0, 0.45, 0], scale: [0.25, 1.2, 1.35] }}
          transition={{ ...decorTransition, delay: 0.06 }}
        />
        <motion.div
          aria-hidden
          className={`pointer-events-none absolute bottom-[14%] left-[42%] size-10 rounded-full blur-md ${c2 ?? c1 ?? c0}`}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: [0, 0.4, 0], scale: [0.3, 1.1, 1.25] }}
          transition={{ ...decorTransition, delay: 0.1 }}
        />
      </>
    )
  }

  const sparklePositions = [
    'left-[10%] top-[14%]',
    'right-[12%] top-[20%]',
    'left-[18%] bottom-[18%]',
    'right-[20%] bottom-[22%]',
  ]

  return (
    <>
      {sparklePositions.map((position, index) => (
        <motion.div
          key={position}
          aria-hidden
          className={`pointer-events-none absolute ${position}`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0.6] }}
          transition={{ ...decorTransition, delay: index * 0.05 }}
        >
          <Sparkles className={`size-4 ${index % 2 === 0 ? 'text-star' : 'text-accent-pink'}`} />
        </motion.div>
      ))}
    </>
  )
}
