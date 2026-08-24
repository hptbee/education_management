'use client'

import { useCallback, useState } from 'react'
import { PencilLine, Plus, Trash2 } from 'lucide-react'
import type { RecognitionTitle } from '@/src/types/models'
import { useAppData } from '@/src/store/AppDataContext'
import { ClassroomButton, IconTouchButton, ClassroomDialogFrame } from '@/src/components/classroom'
import { TitleFormDialog } from './title-form-dialog'

export function TitleCatalogSection() {
  const { data, saveRecognitionTitle, deleteRecognitionTitle } = useAppData()
  const [formOpen, setFormOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState<RecognitionTitle | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RecognitionTitle | null>(null)
  const cancelDelete = useCallback(() => setDeleteTarget(null), [])

  const titles = data?.recognitionTitles ?? []
  const recognitions = data?.recognitions ?? []

  const handleDelete = (title: RecognitionTitle) => {
    deleteRecognitionTitle(title.id)
    setDeleteTarget(null)
  }

  return (
    <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-black text-slate-800">Danh mục tuyên dương</h2>
          <p className="text-sm font-semibold text-slate-500">
            Mỗi danh hiệu tự động có huy hiệu — dùng khi tuyên dương hoặc gán ở phần bên dưới
          </p>
        </div>
        <ClassroomButton
          onClick={() => {
            setEditingTitle(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" /> Thêm danh hiệu
        </ClassroomButton>
      </div>

      {titles.length === 0 ? (
        <p className="rounded-2xl bg-brand-soft px-4 py-8 text-center text-sm font-semibold text-brand-dark">
          Chưa có danh hiệu nào. Bấm Thêm danh hiệu để tạo loại đầu tiên.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {titles.map((title) => (
              <div
                key={title.id}
                className={`group flex items-center gap-3 rounded-2xl border p-3 transition ${
                  title.isActive
                    ? 'border-sky-100 bg-brand-soft/60 hover:border-accent-pink/40 hover:bg-pastel-pink/50'
                    : 'border-dashed border-slate-200 bg-slate-50 opacity-70'
                }`}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                  {title.icon ?? '🌟'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-800">{title.name}</p>
                  {title.description ? (
                    <p className="truncate text-xs text-slate-500">{title.description}</p>
                  ) : null}
                  {!title.isActive ? (
                    <p className="text-[10px] font-bold text-slate-400">Đã tắt</p>
                  ) : null}
                </div>
                <IconTouchButton
                  onClick={() => {
                    setEditingTitle(title)
                    setFormOpen(true)
                  }}
                  aria-label={`Sửa danh hiệu ${title.name}`}
                  className="text-slate-400 hover:bg-white hover:text-brand"
                >
                  <PencilLine className="size-4" />
                </IconTouchButton>
                <IconTouchButton
                  onClick={() => setDeleteTarget(title)}
                  aria-label={`Xóa danh hiệu ${title.name}`}
                  className="text-slate-400 hover:bg-white hover:text-rose-500"
                >
                  <Trash2 className="size-4" />
                </IconTouchButton>
              </div>
          ))}
        </div>
      )}

      {formOpen ? (
        <TitleFormDialog
          isOpen={formOpen}
          initialData={editingTitle}
          onClose={() => setFormOpen(false)}
          onSave={(title) => {
            saveRecognitionTitle(title)
            setFormOpen(false)
          }}
        />
      ) : null}

      <ClassroomDialogFrame
        open={deleteTarget !== null}
        onClose={cancelDelete}
        ariaLabelledBy="delete-title-title"
        panelClassName="max-w-md"
      >
        {deleteTarget ? (
          <div className="w-full rounded-3xl bg-white p-6 shadow-2xl">
            <h3 id="delete-title-title" className="text-lg font-black text-rose-600">
              {recognitions.some((r) => r.titleId === deleteTarget.id)
                ? 'Tắt danh hiệu?'
                : 'Xóa danh hiệu?'}
            </h3>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              {recognitions.some((r) => r.titleId === deleteTarget.id) ? (
                <>
                  Danh hiệu <strong>{deleteTarget.name}</strong> đã được dùng trong lịch sử tuyên dương.
                  Danh hiệu sẽ được tắt nhưng các bản ghi cũ vẫn hiển thị bình thường.
                </>
              ) : (
                <>
                  Danh hiệu <strong>{deleteTarget.name}</strong> sẽ bị xóa vĩnh viễn. Huy hiệu liên kết vẫn giữ trên học sinh đã được trao.
                </>
              )}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={cancelDelete}
                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="rounded-xl bg-rose-500 px-5 py-2 text-sm font-bold text-white hover:bg-rose-600"
              >
                {recognitions.some((r) => r.titleId === deleteTarget.id) ? 'Tắt danh hiệu' : 'Xóa danh hiệu'}
              </button>
            </div>
          </div>
        ) : null}
      </ClassroomDialogFrame>
    </section>
  )
}
