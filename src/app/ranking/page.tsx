'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Crown, MonitorPlay, Users } from 'lucide-react'
import { useAppData } from '@/src/store/AppDataContext'
import { useActiveClassroom } from '@/src/hooks/useActiveClassroom'
import { usePresentationMode } from '@/src/store/PresentationModeContext'
import { PresentationChrome } from '@/src/components/PresentationChrome'
import type { Student } from '@/src/types/models'
import {
  buildStudentRanking,
  buildTeamRanking,
  filterRankedStudents,
  type RankingPeriod,
} from '@/src/utils/ranking'
import { PageHeader, ClassroomCard, EmptyState, ClassroomButton, AnimatedEntrance } from '@/src/components/classroom'
import { StudentDetailsModal } from '@/src/app/students/components/student-details-modal'
import { RankingModeToggle, type RankingMode } from './components/ranking-mode-toggle'
import { RankingFilters } from './components/ranking-filters'
import { RankingPodium } from './components/ranking-podium'
import { RankingList } from './components/ranking-list'
import { TeamRankingList } from './components/team-ranking-list'

const DEFAULT_FILTERS = {
  searchQuery: '',
  filterTeam: 'all',
  filterGender: 'all',
  period: 'all-time' as RankingPeriod,
}

export default function RankingPage() {
  const { data } = useAppData()
  const { isLoaded } = useActiveClassroom()
  const { isPresentationMode, enterPresentationMode } = usePresentationMode()
  const [mode, setMode] = useState<RankingMode>('students')
  const [searchQuery, setSearchQuery] = useState(DEFAULT_FILTERS.searchQuery)
  const [filterTeam, setFilterTeam] = useState(DEFAULT_FILTERS.filterTeam)
  const [filterGender, setFilterGender] = useState(DEFAULT_FILTERS.filterGender)
  const [period, setPeriod] = useState<RankingPeriod>(DEFAULT_FILTERS.period)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const students = data?.students ?? []
  const teams = data?.teams ?? []
  const classroomRoles = data?.classroomRoles ?? []
  const pointHistory = data?.pointHistory ?? []
  const teamScoreHistory = data?.teamScoreHistory ?? []

  const rankedStudents = useMemo(
    () => buildStudentRanking(students, pointHistory, period),
    [students, pointHistory, period],
  )

  const filteredStudents = useMemo(
    () =>
      filterRankedStudents(rankedStudents, {
        searchQuery,
        teamId: filterTeam,
        gender: filterGender,
      }),
    [rankedStudents, searchQuery, filterTeam, filterGender],
  )

  const rankedTeams = useMemo(
    () => buildTeamRanking(teams, teamScoreHistory, period),
    [teams, teamScoreHistory, period],
  )

  const memberCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const student of students) {
      if (!student.teamId) continue
      counts.set(student.teamId, (counts.get(student.teamId) ?? 0) + 1)
    }
    return counts
  }, [students])

  const allStudentsHaveZeroPoints = useMemo(() => {
    if (period === 'all-time') {
      return students.length > 0 && students.every((s) => s.points === 0)
    }
    return rankedStudents.every((entry) => entry.points === 0)
  }, [period, students, rankedStudents])

  const openStudentDetails = (student: Student) => {
    setSelectedStudent(student)
    setDetailsOpen(true)
  }

  const clearFilters = () => {
    setSearchQuery(DEFAULT_FILTERS.searchQuery)
    setFilterTeam(DEFAULT_FILTERS.filterTeam)
    setFilterGender(DEFAULT_FILTERS.filterGender)
    setPeriod(DEFAULT_FILTERS.period)
  }

  const handleEnterPresentation = () => {
    clearFilters()
    enterPresentationMode()
  }

  const pageTitle = mode === 'teams' ? 'Thi đua tổ' : 'Bảng xếp hạng học sinh'
  const pageSubtitle =
    mode === 'teams'
      ? 'Điểm thi đua các tổ trong lớp'
      : 'Thành tích và điểm số của các bạn trong lớp'

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xl font-bold text-slate-500">Đang tải dữ liệu...</p>
      </div>
    )
  }

  if (isPresentationMode) {
    return (
      <PresentationChrome
        title={mode === 'teams' ? 'Thi đua tổ' : 'Bảng xếp hạng'}
        subtitle={
          mode === 'teams'
            ? 'Điểm thi đua các tổ trong lớp'
            : 'Thành tích và điểm số của các bạn trong lớp'
        }
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <RankingModeToggle mode={mode} onChange={setMode} />
          </div>
          {mode === 'teams' ? (
            teams.length === 0 ? (
              <EmptyState icon={Users} title="Chưa có tổ nào để xếp hạng" />
            ) : (
              <ClassroomCard>
                <TeamRankingList
                  entries={rankedTeams}
                  allTeams={teams}
                  memberCounts={memberCounts}
                />
              </ClassroomCard>
            )
          ) : students.length === 0 ? (
            <EmptyState icon={Users} title="Chưa có học sinh để xếp hạng" />
          ) : filteredStudents.length === 0 ? (
            <EmptyState icon={Users} title="Không tìm thấy học sinh phù hợp" />
          ) : (
            <>
              {filteredStudents.length > 0 ? (
                <ClassroomCard>
                  <RankingPodium entries={filteredStudents} presentation />
                </ClassroomCard>
              ) : null}
              <ClassroomCard>
                <RankingList
                  entries={filteredStudents}
                  teams={teams}
                  classroomRoles={classroomRoles}
                  presentation
                />
              </ClassroomCard>
            </>
          )}
        </div>
      </PresentationChrome>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="classroom-page--management">
        <PageHeader
          icon={Crown}
          title={pageTitle}
          subtitle={pageSubtitle}
          iconClassName="from-amber-400 to-yellow-500"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <ClassroomButton variant="secondary" onClick={handleEnterPresentation}>
                <MonitorPlay className="size-4" aria-hidden /> Trình chiếu
              </ClassroomButton>
              <RankingModeToggle mode={mode} onChange={setMode} />
            </div>
          }
        />

        <ClassroomCard>
          <RankingFilters
            mode={mode}
            searchQuery={searchQuery}
            filterTeam={filterTeam}
            filterGender={filterGender}
            period={period}
            teams={teams}
            onSearchChange={setSearchQuery}
            onFilterTeamChange={setFilterTeam}
            onFilterGenderChange={setFilterGender}
            onPeriodChange={setPeriod}
            onClearAll={clearFilters}
          />
        </ClassroomCard>

        {mode === 'students' ? (
          students.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Chưa có học sinh để xếp hạng"
              description="Hãy thêm học sinh vào lớp trước khi xem bảng xếp hạng."
              action={
                <Link href="/students">
                  <ClassroomButton>Thêm học sinh</ClassroomButton>
                </Link>
              }
            />
          ) : (
            <>
              {allStudentsHaveZeroPoints ? (
                <div className="rounded-2xl border border-sky-100 bg-brand-soft/60 px-4 py-3 text-center text-sm font-semibold text-slate-600">
                  Chưa có điểm tích lũy — các bạn vẫn được liệt kê đầy đủ bên dưới.
                </div>
              ) : null}

              {filteredStudents.length > 0 ? (
                <AnimatedEntrance variant="random" staggerIndex={0}>
                  <ClassroomCard>
                    <RankingPodium
                      entries={filteredStudents}
                      onStudentClick={(entry) => openStudentDetails(entry.student)}
                    />
                  </ClassroomCard>
                </AnimatedEntrance>
              ) : null}

              <AnimatedEntrance variant="random" staggerIndex={1}>
                <ClassroomCard>
                  <h3 className="mb-4 font-display text-lg font-extrabold text-slate-800">
                    Toàn bộ lớp
                  </h3>
                  <RankingList
                    entries={filteredStudents}
                    teams={teams}
                    classroomRoles={classroomRoles}
                    onStudentClick={(entry) => openStudentDetails(entry.student)}
                  />
                </ClassroomCard>
              </AnimatedEntrance>
            </>
          )
        ) : (
          <AnimatedEntrance variant="random" staggerIndex={0}>
            <ClassroomCard>
              <h3 className="mb-4 font-display text-lg font-extrabold text-slate-800">
                Thi đua tổ
              </h3>
            <TeamRankingList
              entries={rankedTeams}
              allTeams={teams}
              memberCounts={memberCounts}
            />
          </ClassroomCard>
          </AnimatedEntrance>
        )}
      </div>

      <StudentDetailsModal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        student={selectedStudent}
      />
    </div>
  )
}
