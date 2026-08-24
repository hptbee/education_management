'use client'

import { motion } from 'framer-motion'
import { TopBanner } from '@/components/dashboard/top-banner'
import { StudentList } from '@/components/dashboard/student-list'
import { Leaderboard } from '@/components/dashboard/leaderboard'
import { TeamCompetition } from '@/components/dashboard/team-competition'
import { RecentPraise } from '@/components/dashboard/recent-praise'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { FeaturedGifts } from '@/components/dashboard/featured-gifts'
import { useMotionEnabled } from '@/src/hooks/useMotionEnabled'
import { fadeUpVariants, motionTransition, reducedMotionTransition, staggerDelay } from '@/src/utils/motion'

function StaggerItem({ index, children }: { index: number; children: React.ReactNode }) {
  const motionEnabled = useMotionEnabled()
  if (!motionEnabled) return <>{children}</>

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={fadeUpVariants}
      transition={{
        ...motionTransition('normal'),
        delay: staggerDelay(index) / 1000,
      }}
    >
      {children}
    </motion.div>
  )
}

export default function Home() {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="classroom-page--dashboard">
        <StaggerItem index={0}>
          <TopBanner />
        </StaggerItem>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1.1fr_1fr]">
          <StaggerItem index={1}>
            <StudentList />
          </StaggerItem>
          <StaggerItem index={2}>
            <Leaderboard />
          </StaggerItem>
          <StaggerItem index={3}>
            <TeamCompetition />
          </StaggerItem>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <StaggerItem index={4}>
            <RecentPraise />
          </StaggerItem>
          <StaggerItem index={5}>
            <RecentActivity />
          </StaggerItem>
          <StaggerItem index={6}>
            <FeaturedGifts />
          </StaggerItem>
        </div>
      </div>
    </div>
  )
}
