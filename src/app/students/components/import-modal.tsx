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
  stt: string
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
      ['Stt', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'Quê quán', 'Họ tên phụ huynh', 'Số điện thoại di động', 'Địa chỉ'],
      ['1', 'Nguyễn Minh Anh', '10/03/2018', 'Nữ', 'TP. Hồ Chí Minh', 'Nguyễn Thị Lan', '0901234567', 'Phú Nhuận, TP. Hồ Chí Minh']
    ])
    
    // Set column widths to make the template look better
    ws['!cols'] = [
      { wch: 5 },  // Stt
      { wch: 25 }, // Họ và tên
      { wch: 15 }, // Ngày sinh
      { wch: 10 }, // Giới tính
      { wch: 20 }, // Quê quán
      { wch: 25 }, // Họ tên phụ huynh
      { wch: 20 }, // Số điện thoại di động
      { wch: 40 }, // Địa chỉ
    ]
    
    // Attempting to freeze the top row
    ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách học sinh')

    XLSX.writeFile(wb, 'DanhSachHocSinh_Template.xlsx')
  }

  const normalizeString = (str: string | undefined | null) => {
    if (!str) return ''
    return String(str).trim().toLowerCase().replace(/\s+/g, ' ')
  }

  const parseExcelDate = (excelDate: any) => {
    if (!excelDate) return undefined
    // If it's a number (Excel serial date)
    if (typeof excelDate === 'number') {
      const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000))
      return date.toISOString().split('T')[0]
    }
    
    const str = String(excelDate).trim()
    
    // Try some common formats like DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
    if (dmyMatch) {
      const [_, d, m, y] = dmyMatch
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    
    const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
    if (ymdMatch) {
      const [_, y, m, d] = ymdMatch
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    
    return str
  }

  const parseGender = (raw: string | undefined): 'male' | 'female' | 'other' | 'unknown' => {
    const s = normalizeString(raw)
    if (['nam', 'male', 'm'].includes(s)) return 'male'
    if (['nữ', 'nu', 'female', 'f'].includes(s)) return 'female'
    if (['khác', 'other'].includes(s)) return 'other'
    return 'unknown'
  }

  const formatPhoneNumber = (raw: any) => {
      if (!raw) return undefined;
      let str = String(raw).trim();
      // If Excel stripped the leading zero because it treated it as a number
      if (typeof raw === 'number' && str.length >= 8 && str.length <= 10 && !str.startsWith('0')) {
          str = '0' + str;
      }
      return str;
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
        
        // Find indices based on requested columns + aliases
        const sttIdx = headers.findIndex(h => h === 'stt' || h === 'số thứ tự' || h === 'no' || h === '#')
        const nameIdx = headers.findIndex(h => h.includes('họ và tên') || h.includes('họ tên') || h.includes('full name') || h.includes('student name') || h === 'name')
        const dobIdx = headers.findIndex(h => h.includes('ngày sinh') || h.includes('dob') || h.includes('date of birth'))
        const genderIdx = headers.findIndex(h => h.includes('giới tính') || h.includes('gender') || h.includes('sex'))
        const hometownIdx = headers.findIndex(h => h.includes('quê quán') || h.includes('hometown'))
        const parentNameIdx = headers.findIndex(h => h.includes('họ tên phụ huynh') || h.includes('phụ huynh') || h.includes('parent name') || h === 'parent')
        const parentPhoneIdx = headers.findIndex(h => h.includes('số điện thoại di động') || h.includes('số điện thoại') || h.includes('sđt') || h.includes('sđt phụ huynh') || h.includes('phone') || h.includes('mobile') || h.includes('parent phone'))
        const addressIdx = headers.findIndex(h => h.includes('địa chỉ') || h.includes('địa chỉ hiện tại') || h.includes('address'))

        const preview: PreviewRow[] = []

        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i]
          if (!row || row.length === 0 || !row.some(c => !!c)) continue // skip empty rows

          const rawStt = sttIdx >= 0 && row[sttIdx] ? String(row[sttIdx]) : ''
          const rawName = nameIdx >= 0 ? row[nameIdx] : undefined
          
          if (!rawName || String(rawName).trim() === '') {
            preview.push({
              index: i + 1,
              stt: rawStt,
              data: {},
              status: 'invalid',
              message: 'Thiếu Họ và tên'
            })
            continue
          }

          const parsedStudent: Partial<Student> = {
            name: String(rawName).trim().replace(/\s+/g, ' '),
            dateOfBirth: dobIdx >= 0 ? parseExcelDate(row[dobIdx]) : undefined,
            gender: genderIdx >= 0 ? parseGender(row[genderIdx]) : 'unknown',
            hometown: hometownIdx >= 0 && row[hometownIdx] ? String(row[hometownIdx]).trim() : undefined,
            address: addressIdx >= 0 && row[addressIdx] ? String(row[addressIdx]).trim() : undefined,
            parent: {
              fullName: parentNameIdx >= 0 && row[parentNameIdx] ? String(row[parentNameIdx]).trim().replace(/\s+/g, ' ') : undefined,
              phoneNumber: parentPhoneIdx >= 0 ? formatPhoneNumber(row[parentPhoneIdx]) : undefined,
            },
          }

          // Duplicate detection (Primary: normalized fullName + dateOfBirth, Fallback: normalized fullName)
          const normNewName = normalizeString(parsedStudent.name)
          const isDup = existingStudents.some(es => {
              const normEsName = normalizeString(es.name)
              if (parsedStudent.dateOfBirth && es.dateOfBirth) {
                  return normEsName === normNewName && es.dateOfBirth === parsedStudent.dateOfBirth
              }
              return normEsName === normNewName
          })

          preview.push({
            index: i + 1,
            stt: rawStt,
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

  const validCount = previewData.filter(r => r.status === 'valid').length
  const dupCount = previewData.filter(r => r.status === 'duplicate').length
  const invalidCount = previewData.filter(r => r.status === 'invalid').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl">
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
