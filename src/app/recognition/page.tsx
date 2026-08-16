'use client'

import { Suspense, useCallback, useEffect, useMemo } from 'react'
import { LayoutList, MonitorPlay, Sparkles, Star, Trophy } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAppData } from '@/src/store/AppDataContext'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import { usePresentationMode } from '@/src/store/PresentationModeContext'
import { PresentationChrome } from '@/src/components/PresentationChrome'
import { ClassroomButton, PageHeader } from '@/src/components/classroom'
import { BadgeRosterSection } from './components/badge-roster-section'
import { RecognitionFormSection } from './components/recognition-form-section'
import { TitleCatalogSection } from './components/title-catalog-section'
import { WallOfFameSection } from './components/wall-of-fame-section'

export type RecognitionTab = 'new' | 'catalog' | 'wall'

const TAB_IDS: RecognitionTab[] = ['new', 'catalog', 'wall']

const LEGACY_TAB_ALIASES: Record<string, RecognitionTab> = {
  badges: 'catalog',
  titles: 'catalog',
}

const TABS: { id: RecognitionTab; label: string; icon: React.ReactNode }[] = [
  { id: 'new', label: 'Tuyên dương mới', icon: <Sparkles className="size-4" /> },
  {
    id: 'catalog',
    label: 'Danh hiệu & huy hiệu',
    icon: <LayoutList className="size-4" />,
  },
  { id: 'wall', label: 'Góc tuyên dương', icon: <Star className="size-4" /> },
]

function parseTab(value: string | null): RecognitionTab {
  if (value && TAB_IDS.includes(value as RecognitionTab)) {
    return value as RecognitionTab
  }
  if (value && LEGACY_TAB_ALIASES[value]) {
    return LEGACY_TAB_ALIASES[value]
  }
  return 'new'
}

function RecognitionPageContent() {
  const { data } = useAppData()
  const { isLoaded } = useActiveClassroom()
  const { isPresentationMode, enterPresentationMode } = usePresentationMode()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeTab = useMemo(() => parseTab(searchParams?.get('tab') ?? null), [searchParams])

  const setActiveTab = useCallback(
    (tab: RecognitionTab) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '')
      params.set('tab', tab)
      if (tab !== 'catalog') {
        params.delete('studentId')
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname ?? '/recognition'}?${qs}` : (pathname ?? '/recognition'))
    },
    [pathname, router, searchParams],
  )

  const students = data?.students ?? []
  const teams = data?.teams ?? []
  const classroomRoles = data?.classroomRoles ?? []
  const titles = data?.recognitionTitles ?? []
  const studentIdFromQuery = searchParams?.get('studentId') ?? undefined

  useEffect(() => {
    if (activeTab === 'catalog' && studentIdFromQuery) {
      document.getElementById('badge-roster-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [activeTab, studentIdFromQuery])

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xl font-bold text-slate-500">Đang tải dữ liệu...</p>
      </div>
    )
  }

  if (isPresentationMode) {
    return (
      <PresentationChrome title="Góc tuyên dương" subtitle="Những điều tốt đẹp của lớp">
        <WallOfFameSection
          students={students}
          teams={teams}
          onStartRecognition={() => setActiveTab('new')}
          presentation
        />
      </PresentationChrome>
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
          actions={
            <ClassroomButton variant="secondary" onClick={enterPresentationMode}>
              <MonitorPlay className="size-4" aria-hidden /> Trình chiếu
            </ClassroomButton>
          }
        />

        <div role="tablist" aria-label="Phần tuyên dương" className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`recognition-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`recognition-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-11 items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-extrabold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
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
          <div role="tabpanel" id="recognition-panel-new" aria-labelledby="recognition-tab-new">
          <RecognitionFormSection
            students={students}
            teams={teams}
            classroomRoles={classroomRoles}
            titles={titles}
            onGoToTitles={() => setActiveTab('catalog')}
          />
          </div>
        ) : null}

        {activeTab === 'catalog' ? (
          <div
            role="tabpanel"
            id="recognition-panel-catalog"
            aria-labelledby="recognition-tab-catalog"
            className="flex flex-col gap-6"
          >
            <TitleCatalogSection />
            <BadgeRosterSection initialStudentId={studentIdFromQuery} />
          </div>
        ) : null}

        {activeTab === 'wall' ? (
          <div role="tabpanel" id="recognition-panel-wall" aria-labelledby="recognition-tab-wall">
          <WallOfFameSection
            students={students}
            teams={teams}
            onStartRecognition={() => setActiveTab('new')}
          />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function RecognitionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xl font-bold text-slate-500">Đang tải dữ liệu...</p>
        </div>
      }
    >
      <RecognitionPageContent />
    </Suspense>
  )
}
