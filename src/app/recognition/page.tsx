'use client'

import { useState } from 'react'
import { Medal, Sparkles, Star, Trophy } from 'lucide-react'
import { useAppData } from '@/src/store/AppDataContext'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import { PageHeader } from '@/src/components/classroom'
import { RecognitionFormSection } from './components/recognition-form-section'
import { TitleCatalogSection } from './components/title-catalog-section'
import { WallOfFameSection } from './components/wall-of-fame-section'

type RecognitionTab = 'new' | 'titles' | 'wall'

const TABS: { id: RecognitionTab; label: string; icon: React.ReactNode }[] = [
  { id: 'new', label: 'Tuyên dương mới', icon: <Sparkles className="size-4" /> },
  { id: 'titles', label: 'Danh hiệu', icon: <Medal className="size-4" /> },
  { id: 'wall', label: 'Góc tuyên dương', icon: <Star className="size-4" /> },
]

export default function RecognitionPage() {
  const { data } = useAppData()
  const { isLoaded } = useActiveClassroom()
  const [activeTab, setActiveTab] = useState<RecognitionTab>('new')

  const students = data?.students ?? []
  const teams = data?.teams ?? []
  const classroomRoles = data?.classroomRoles ?? []
  const titles = data?.recognitionTitles ?? []

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xl font-bold text-slate-500">Đang tải dữ liệu...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 p-5 pb-10">
        <PageHeader
          icon={Trophy}
          title="Tuyên dương"
          subtitle="Ghi nhận, khích lệ và tôn vinh những điều tốt đẹp của học sinh"
          iconClassName="from-amber-400 to-orange-500"
        />

        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-extrabold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-brand text-white shadow-lg shadow-sky-200'
                  : 'bg-white/80 text-slate-500 ring-1 ring-sky-100 hover:bg-brand-soft hover:text-brand-dark'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'new' ? (
          <RecognitionFormSection
            students={students}
            teams={teams}
            classroomRoles={classroomRoles}
            titles={titles}
            onGoToTitles={() => setActiveTab('titles')}
          />
        ) : null}

        {activeTab === 'titles' ? <TitleCatalogSection /> : null}

        {activeTab === 'wall' ? (
          <WallOfFameSection
            students={students}
            teams={teams}
            onStartRecognition={() => setActiveTab('new')}
          />
        ) : null}
      </div>
    </div>
  )
}
