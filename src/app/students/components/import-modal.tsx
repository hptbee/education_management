'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react'
import type { Student } from '@/src/types/models'
import { createId } from '@/src/utils/id'
import { useClassroomDialog, IconTouchButton, useModalFocusTrap } from '@/src/components/classroom'
import {
  downloadStudentExcelTemplate,
  mapStudentExcelRows,
  parseStudentExcelFile,
} from '@/src/utils/studentExcel'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (students: Student[]) => void
  existingStudents: Student[]
}

type ImportStatus = 'valid' | 'invalid' | 'duplicate'

interface PreviewRow {
  index: number
  stt: string
  data: Partial<Student>
  status: ImportStatus
  message: string
}

export function ImportModal({ isOpen, onClose, onImport, existingStudents }: ImportModalProps) {
  const { showAlert } = useClassroomDialog()
  const [step, setStep] = useState<1 | 2>(1)
  const [previewData, setPreviewData] = useState<PreviewRow[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useModalFocusTrap(isOpen, onClose)

  if (!isOpen) return null

  const handleDownloadTemplate = () => {
    void downloadStudentExcelTemplate()
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    void (async () => {
      try {
        const rawData = await parseStudentExcelFile(file)
        const preview = mapStudentExcelRows(rawData, existingStudents)
        setPreviewData(preview)
        setStep(2)
      } catch (err) {
        void showAlert(err instanceof Error ? err.message : 'Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng.', {
          variant: 'error',
        })
      }
    })()
  }

  const handleConfirmImport = () => {
    const validRows = previewData.filter((r) => r.status === 'valid')
    const now = new Date().toISOString()
    const newStudents: Student[] = validRows.map((r) => ({
      id: createId('student'),
      name: r.data.name!,
      avatar: r.data.avatar,
      dateOfBirth: r.data.dateOfBirth,
      gender: r.data.gender || 'unknown',
      hometown: r.data.hometown,
      address: r.data.address,
      parent: r.data.parent || {},
      classroomRoleIds: [],
      badgeIds: [],
      points: 0,
      totalRewards: 0,
      createdAt: now,
      updatedAt: now,
    }))

    onImport(newStudents)
    onClose()
  }

  const validCount = previewData.filter((r) => r.status === 'valid').length
  const dupCount = previewData.filter((r) => r.status === 'duplicate').length
  const invalidCount = previewData.filter((r) => r.status === 'invalid').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-students-title"
        tabIndex={-1}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 id="import-students-title" className="font-display text-xl font-extrabold text-slate-800">
            Nhập danh sách từ Excel
          </h2>
          <IconTouchButton onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="size-5" />
          </IconTouchButton>
        </header>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          {step === 1 ? (
            <div className="flex flex-col items-center justify-center gap-6 py-10">
              <div className="flex size-24 items-center justify-center rounded-3xl bg-green-50 text-green-500">
                <FileSpreadsheet className="size-12" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-800">Tải lên file Excel (.xlsx)</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Dữ liệu của bạn phải khớp với mẫu được cung cấp để hệ thống có thể đọc.
                </p>
              </div>
              <div className="flex gap-4">
                <button onClick={handleDownloadTemplate} className="rounded-xl border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-800">
                  Tải file mẫu
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-purple-dark">
                  <Upload className="size-4" />
                  Chọn file tải lên
                </button>
                <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-800">Tổng quan dữ liệu ({previewData.length} dòng)</h3>
                  <div className="mt-2 flex gap-4 text-sm font-semibold">
                    <span className="flex items-center gap-1.5 text-green-600"><CheckCircle2 className="size-4" /> Hợp lệ: {validCount}</span>
                    <span className="flex items-center gap-1.5 text-amber-500"><AlertTriangle className="size-4" /> Trùng lặp: {dupCount}</span>
                    <span className="flex items-center gap-1.5 text-red-500"><AlertCircle className="size-4" /> Lỗi: {invalidCount}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-slate-100 overflow-hidden">
                <div className="grid grid-cols-[60px_60px_1fr_120px] bg-slate-50 px-4 py-3 text-xs font-bold uppercase text-slate-500">
                  <span>Dòng</span>
                  <span>Stt</span>
                  <span>Họ và tên</span>
                  <span>Trạng thái</span>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {previewData.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-[60px_60px_1fr_120px] border-t border-slate-50 px-4 py-3 text-sm">
                      <span className="font-semibold text-slate-500">{row.index}</span>
                      <span className="font-semibold text-slate-400">{row.stt || '-'}</span>
                      <span className="font-bold text-slate-700">{row.data.name || '(Trống)'}</span>
                      <span className={`font-semibold ${row.status === 'valid' ? 'text-green-600' : row.status === 'duplicate' ? 'text-amber-500' : 'text-red-500'}`}>
                        {row.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {step === 2 && (
          <footer className="flex items-center justify-end gap-3 border-t border-slate-100 p-5">
            <button onClick={() => setStep(1)} className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100">
              Quay lại
            </button>
            <button onClick={handleConfirmImport} disabled={validCount === 0} className="rounded-xl bg-brand-purple px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-purple-dark disabled:opacity-50">
              Nhập {validCount} học sinh mới
            </button>
          </footer>
        )}
      </div>
    </div>
  )
}
