'use client'

import Link from 'next/link'
import { Crown, Star, ArrowRight } from 'lucide-react'
import { useAppData } from '@/src/store/AppDataContext'
import { getStudentAvatar } from '@/src/utils/student'

const rankBadge: Record<number, string> = {
  1: 'bg-gradient-to-b from-amber-300 to-amber-500 text-white',
  2: 'bg-gradient-to-b from-slate-300 to-slate-400 text-white',
  3: 'bg-gradient-to-b from-orange-300 to-orange-500 text-white',
}

const pointColor: Record<number, string> = {
  1: 'text-amber-500',
  2: 'text-emerald-500',
  3: 'text-orange-500',
}

export function Leaderboard() {
  const { data } = useAppData()
  const students = data?.students || []
  const teams = data?.teams || []

  // Top 10 students by points
  const topStudents = [...students].sort((a, b) => b.points - a.points).slice(0, 10)

  return (
    <section className="flex flex-col rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-amber-100">
          <Crown className="size-4 text-amber-500" />
        </span>
        <h3 className="font-display text-lg font-extrabold text-slate-800">
          BẢNG XẾP HẠNG ĐIỂM
        </h3>
      </header>

      <ul className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
        {topStudents.length === 0 ? (
          <li className="p-4 text-center text-sm font-semibold text-slate-400">Chưa có dữ liệu</li>
        ) : topStudents.map((s, i) => {
          const rank = i + 1
          const team = teams.find(t => t.id === s.teamId)
          
          return (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 transition-colors hover:bg-slate-100/50"
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                  rankBadge[rank] ?? 'bg-slate-100 text-slate-500'
                }`}
              >
                {rank}
              </span>
              <img
                src={getStudentAvatar(s)}
                alt={s.name}
                className="size-9 shrink-0 rounded-full object-cover ring-2 ring-white"
              />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-extrabold ${pointColor[rank] ?? 'text-slate-700'}`}>
                  {s.name}
                </p>
                <p className="text-[11px] font-bold text-slate-500">{team ? team.name : 'Chưa có nhóm'}</p>
              </div>
              <div className="flex items-center gap-1.5 pl-1">
                <div className="text-right leading-none">
                  <span className="font-display text-xl font-extrabold text-slate-800">
                    {s.points}
                  </span>
                  <span className="ml-1 text-[11px] font-semibold text-slate-400">điểm</span>
                </div>
                <Star className="size-4 fill-star text-star" />
              </div>
            </li>
          )
        })}
      </ul>

      <Link href="/students" className="mt-4 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-4 text-sm font-bold text-brand-purple transition hover:text-brand-purple-dark">
        Xem danh sách học sinh
        <ArrowRight className="size-4" />
      </Link>
    </section>
  )
}
