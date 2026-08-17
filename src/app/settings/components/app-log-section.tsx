'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileText, FolderOpen, RefreshCw, Trash2 } from 'lucide-react'
import { ClassroomButton, ClassroomCard } from '@/src/components/classroom'
import { isTauri } from '@/src/database/tauri-fs.service'
import {
  clearAppLogs,
  openAppLogDirectory,
  readRecentAppLogs,
} from '@/src/logging/app-log'

const LOG_PREVIEW_LIMIT = 120

export function AppLogSection() {
  const [lines, setLines] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadLogs = useCallback(async () => {
    if (!isTauri()) return
    setLoading(true)
    setError(null)
    try {
      const next = await readRecentAppLogs(LOG_PREVIEW_LIMIT)
      setLines(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đọc nhật ký.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  if (!isTauri()) return null

  return (
    <ClassroomCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-slate-800">
            <FileText className="size-5 text-slate-500" aria-hidden />
            Nhật ký ứng dụng
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Lưu cục bộ trên máy tính này (`logs/app.log`). Dùng khi gửi báo lỗi cho hỗ trợ.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ClassroomButton variant="outline" className="min-h-11" disabled={loading} onClick={() => void loadLogs()}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
            Tải lại
          </ClassroomButton>
          <ClassroomButton variant="outline" className="min-h-11" onClick={() => void openAppLogDirectory()}>
            <FolderOpen className="size-4" aria-hidden />
            Mở thư mục
          </ClassroomButton>
          <ClassroomButton
            variant="outline"
            className="min-h-11 border-rose-200 text-rose-700 hover:bg-rose-50"
            onClick={() => {
              void clearAppLogs().then(() => loadLogs())
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Xóa nhật ký
          </ClassroomButton>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-950 p-3 scrollbar-thin">
        {lines.length === 0 ? (
          <p className="text-sm font-semibold text-slate-400">Chưa có mục nhật ký.</p>
        ) : (
          <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-slate-100">
            {lines.join('\n')}
          </pre>
        )}
      </div>
    </ClassroomCard>
  )
}
