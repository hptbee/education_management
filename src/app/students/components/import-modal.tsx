'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react'
import * as XLSX from 'xlsx'
import type { Student } from '@/src/types/models'
import { createId } from '@/src/utils/id'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (students: Student[]) => void
  existingStudents: Student[]
}

type ImportStatus = 'valid' | 'invalid' | 'duplicate'

interface PreviewRow {
  index: number
  data: Partial<Student>
  status: ImportStatus
  message: string
}

export function ImportModal({ isOpen, onClose, onImport, existingStudents }: ImportModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [previewData, setPreviewData] = useState<PreviewRow[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Full Name', 'Date of Birth', 'Gender', 'Hometown', 'Previous Class', 'Father Name', 'Father Phone', 'Mother Name', 'Mother Phone', 'Primary Contact Phone']
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'DanhSachHocSinh_Template.xlsx')
  }

  const normalizeString = (str: string | undefined | null) => {
    if (!str) return ''
    return String(str).trim().toLowerCase()
  }

  const parseExcelDate = (excelDate: any) => {
    if (!excelDate) return undefined
    // If it's a number (Excel serial date)
    if (typeof excelDate === 'number') {
      const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000))
      return date.toISOString().split('T')[0]
    }
    // Try to parse string
    return String(excelDate).trim()
  }

  const parseGender = (raw: string | undefined): 'male' | 'female' | 'other' | 'unknown' => {
    const s = normalizeString(raw)
    if (['nam', 'male', 'm'].includes(s)) return 'male'
    if (['nữ', 'nu', 'female', 'f'].includes(s)) return 'female'
    if (['khác', 'other'].includes(s)) return 'other'
    return 'unknown'
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

        if (rawData.length <= 1) {
          alert('File trống hoặc không có dữ liệu.')
          return
        }

        const headers = (rawData[0] || []).map(normalizeString)
        
        // Find indices
        const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('họ và tên') || h.includes('họ tên') || h === 'full name')
        const dobIdx = headers.findIndex(h => h.includes('dob') || h.includes('date of birth') || h.includes('ngày sinh'))
        const genderIdx = headers.findIndex(h => h.includes('gender') || h.includes('sex') || h.includes('giới tính'))
        const hometownIdx = headers.findIndex(h => h.includes('hometown') || h.includes('quê quán'))
        const prevClassIdx = headers.findIndex(h => h.includes('previous class') || h.includes('lớp cũ'))
        
        const fatherNameIdx = headers.findIndex(h => h.includes('father name') || h.includes('họ tên cha') || h === 'cha')
        const fatherPhoneIdx = headers.findIndex(h => h.includes('father phone') || h.includes('sđt cha') || h.includes('điện thoại cha'))
        const motherNameIdx = headers.findIndex(h => h.includes('mother name') || h.includes('họ tên mẹ') || h === 'mẹ')
        const motherPhoneIdx = headers.findIndex(h => h.includes('mother phone') || h.includes('sđt mẹ') || h.includes('điện thoại mẹ'))
        const primaryPhoneIdx = headers.findIndex(h => h.includes('primary contact') || h.includes('phone') || h.includes('sđt') || h.includes('liên hệ'))

        const preview: PreviewRow[] = []

        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i]
          if (!row || row.length === 0 || !row.some(c => !!c)) continue // skip empty rows

          const rawName = row[nameIdx]
          
          if (!rawName || String(rawName).trim() === '') {
            preview.push({
              index: i + 1,
              data: {},
              status: 'invalid',
              message: 'Thiếu Họ và tên'
            })
            continue
          }

          const parsedStudent: Partial<Student> = {
            name: String(rawName).trim(),
            dateOfBirth: parseExcelDate(row[dobIdx]),
            gender: parseGender(row[genderIdx]),
            hometown: row[hometownIdx] ? String(row[hometownIdx]).trim() : undefined,
            previousClass: row[prevClassIdx] ? String(row[prevClassIdx]).trim() : undefined,
            father: {
              fullName: row[fatherNameIdx] ? String(row[fatherNameIdx]).trim() : undefined,
              phoneNumber: row[fatherPhoneIdx] ? String(row[fatherPhoneIdx]).trim() : undefined,
            },
            mother: {
              fullName: row[motherNameIdx] ? String(row[motherNameIdx]).trim() : undefined,
              phoneNumber: row[motherPhoneIdx] ? String(row[motherPhoneIdx]).trim() : undefined,
            },
            phoneNumber: row[primaryPhoneIdx] ? String(row[primaryPhoneIdx]).trim() : undefined,
          }

          // Duplicate detection
          const isDup = existingStudents.some(es => 
            normalizeString(es.name) === normalizeString(parsedStudent.name) &&
            (parsedStudent.dateOfBirth ? es.dateOfBirth === parsedStudent.dateOfBirth : true)
          )

          preview.push({
            index: i + 1,
            data: parsedStudent,
            status: isDup ? 'duplicate' : 'valid',
            message: isDup ? 'Học sinh đã tồn tại' : 'Hợp lệ'
          })
        }

        setPreviewData(preview)
        setStep(2)

      } catch (err) {
        alert('Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng.')
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleConfirmImport = () => {
    const validRows = previewData.filter(r => r.status === 'valid')
    const now = new Date().toISOString()
    const newStudents: Student[] = validRows.map(r => ({
      id: createId('student'),
      name: r.data.name!,
      avatar: r.data.avatar,
      dateOfBirth: r.data.dateOfBirth,
      gender: r.data.gender || 'unknown',
      hometown: r.data.hometown,
      previousClass: r.data.previousClass,
      father: r.data.father || { fullName: '', phoneNumber: '' },
      mother: r.data.mother || { fullName: '', phoneNumber: '' },
      phoneNumber: r.data.phoneNumber,
      points: 0,
      totalRewards: 0,
      createdAt: now,
      updatedAt: now,
    }))

    onImport(newStudents)
    onClose()
  }

  const validCount = previewData.filter(r => r.status === 'valid').length
  const dupCount = previewData.filter(r => r.status === 'duplicate').length
  const invalidCount = previewData.filter(r => r.status === 'invalid').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="font-display text-xl font-extrabold text-slate-800">
            Nhập danh sách từ Excel
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="size-5" />
          </button>
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
                <input ref={fileInputRef} type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
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
                <div className="grid grid-cols-[80px_1fr_120px] bg-slate-50 px-4 py-3 text-xs font-bold uppercase text-slate-500">
                  <span>Dòng</span>
                  <span>Họ và tên</span>
                  <span>Trạng thái</span>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {previewData.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-[80px_1fr_120px] border-t border-slate-50 px-4 py-3 text-sm">
                      <span className="font-semibold text-slate-500">{row.index}</span>
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
