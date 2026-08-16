import { TopBanner } from '@/components/dashboard/top-banner'
import { StudentList } from '@/components/dashboard/student-list'
import { Leaderboard } from '@/components/dashboard/leaderboard'
import { TeamCompetition } from '@/components/dashboard/team-competition'
import { RecentPraise } from '@/components/dashboard/recent-praise'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { FeaturedGifts } from '@/components/dashboard/featured-gifts'

export default function Home() {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5 p-5 pb-8">
        <TopBanner />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1.1fr_1fr]">
          <StudentList />
          <Leaderboard />
          <TeamCompetition />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <RecentPraise />
          <RecentActivity />
          <FeaturedGifts />
        </div>
      </div>
    </div>
  )
}
