import ExcelJS from 'exceljs'
import type { Student } from '@/src/types/models'

export const STUDENT_EXCEL_TEMPLATE_FILENAME = 'DanhSachHocSinh_Template.xlsx'
export const STUDENT_EXCEL_HEADERS = [
  'Stt',
  'Họ và tên',
  'Ngày sinh',
  'Giới tính',
  'Quê quán',
  'Họ tên phụ huynh',
  'Số điện thoại di động',
  'Địa chỉ',
] as const

export const MAX_STUDENT_EXCEL_ROWS = 500
export const MAX_STUDENT_EXCEL_BYTES = 5 * 1024 * 1024

const TEMPLATE_SAMPLE_ROW = [
  '1',
  'Nguyễn Minh Anh',
  '10/03/2018',
  'Nữ',
  'TP. Hồ Chí Minh',
  'Nguyễn Thị Lan',
  '0901234567',
  'Phú Nhuận, TP. Hồ Chí Minh',
]

export function normalizeStudentString(str: string | undefined | null): string {
  if (!str) return ''
  return String(str).trim().toLowerCase().replace(/\s+/g, ' ')
}

export function parseExcelDate(excelDate: unknown): string | undefined {
  if (!excelDate) return undefined

  if (excelDate instanceof Date) {
    return excelDate.toISOString().split('T')[0]
  }

  if (typeof excelDate === 'number') {
    const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000))
    return date.toISOString().split('T')[0]
  }

  const str = String(excelDate).trim()
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  return str
}

export function parseGender(raw: string | undefined): 'male' | 'female' | 'other' | 'unknown' {
  const s = normalizeStudentString(raw)
  if (['nam', 'male', 'm'].includes(s)) return 'male'
  if (['nữ', 'nu', 'female', 'f'].includes(s)) return 'female'
  if (['khác', 'other'].includes(s)) return 'other'
  return 'unknown'
}

export function formatPhoneNumber(raw: unknown): string | undefined {
  if (!raw) return undefined
  let str = String(raw).trim()
  if (typeof raw === 'number' && str.length >= 8 && str.length <= 10 && !str.startsWith('0')) {
    str = `0${str}`
  }
  return str
}

export async function downloadStudentExcelTemplate(): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Danh sách học sinh')

  worksheet.addRow([...STUDENT_EXCEL_HEADERS])
  worksheet.addRow(TEMPLATE_SAMPLE_ROW)

  worksheet.columns = [
    { width: 5 },
    { width: 25 },
    { width: 15 },
    { width: 10 },
    { width: 20 },
    { width: 25 },
    { width: 20 },
    { width: 40 },
  ]

  worksheet.views = [{ state: 'frozen', ySplit: 1 }]

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = STUDENT_EXCEL_TEMPLATE_FILENAME
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export type ParsedStudentRow = {
  index: number
  stt: string
  data: Partial<Student>
}

function cellValue(cell: ExcelJS.Cell): unknown {
  const value = cell.value
  if (value && typeof value === 'object') {
    if ('result' in value) {
      return (value as ExcelJS.CellFormulaValue).result
    }
    if ('richText' in value) {
      return (value as ExcelJS.CellRichTextValue).richText.map((part) => part.text).join('')
    }
    if ('text' in value && typeof (value as { text?: string }).text === 'string') {
      return (value as { text: string }).text
    }
  }
  return value
}

function isOleSpreadsheet(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer)
  return bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0
}

export async function parseStudentExcelFile(file: File): Promise<string[][]> {
  if (file.size > MAX_STUDENT_EXCEL_BYTES) {
    throw new Error(
      `File quá lớn (${Math.round(file.size / (1024 * 1024))} MB). Vui lòng chọn file tối đa ${MAX_STUDENT_EXCEL_BYTES / (1024 * 1024)} MB.`,
    )
  }

  const buffer = await file.arrayBuffer()
  if (isOleSpreadsheet(buffer)) {
    throw new Error('Định dạng .xls không được hỗ trợ. Vui lòng chọn file Excel (.xlsx).')
  }
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new Error('File trống hoặc không có dữ liệu.')
  }

  const rows: string[][] = []
  worksheet.eachRow((row) => {
    const values: string[] = []
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      while (values.length < colNumber - 1) values.push('')
      const raw = cellValue(cell)
      values[colNumber - 1] = raw === null || raw === undefined ? '' : String(raw)
    })
    rows.push(values)
  })

  if (rows.length > MAX_STUDENT_EXCEL_ROWS + 1) {
    throw new Error(`File có quá nhiều dòng (tối đa ${MAX_STUDENT_EXCEL_ROWS} học sinh).`)
  }

  return rows
}

export function mapStudentExcelRows(
  rawData: string[][],
  existingStudents: Student[],
): Array<ParsedStudentRow & { status: 'valid' | 'invalid' | 'duplicate'; message: string }> {
  if (rawData.length <= 1) {
    throw new Error('File trống hoặc không có dữ liệu.')
  }

  const headers = (rawData[0] || []).map(normalizeStudentString)
  const sttIdx = headers.findIndex((h) => h === 'stt' || h === 'số thứ tự' || h === 'no' || h === '#')
  const nameIdx = headers.findIndex(
    (h) =>
      h.includes('họ và tên') ||
      h.includes('họ tên') ||
      h.includes('full name') ||
      h.includes('student name') ||
      h === 'name',
  )
  const dobIdx = headers.findIndex((h) => h.includes('ngày sinh') || h.includes('dob') || h.includes('date of birth'))
  const genderIdx = headers.findIndex((h) => h.includes('giới tính') || h.includes('gender') || h.includes('sex'))
  const hometownIdx = headers.findIndex((h) => h.includes('quê quán') || h.includes('hometown'))
  const parentNameIdx = headers.findIndex(
    (h) =>
      h.includes('họ tên phụ huynh') ||
      h.includes('phụ huynh') ||
      h.includes('parent name') ||
      h === 'parent',
  )
  const parentPhoneIdx = headers.findIndex(
    (h) =>
      h.includes('số điện thoại di động') ||
      h.includes('số điện thoại') ||
      h.includes('sđt') ||
      h.includes('sđt phụ huynh') ||
      h.includes('phone') ||
      h.includes('mobile') ||
      h.includes('parent phone'),
  )
  const addressIdx = headers.findIndex((h) => h.includes('địa chỉ') || h.includes('địa chỉ hiện tại') || h.includes('address'))

  const preview: Array<ParsedStudentRow & { status: 'valid' | 'invalid' | 'duplicate'; message: string }> = []

  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i]
    if (!row || row.length === 0 || !row.some((c) => !!c)) continue

    const rawStt = sttIdx >= 0 && row[sttIdx] ? String(row[sttIdx]) : ''
    const rawName = nameIdx >= 0 ? row[nameIdx] : undefined

    if (!rawName || String(rawName).trim() === '') {
      preview.push({
        index: i + 1,
        stt: rawStt,
        data: {},
        status: 'invalid',
        message: 'Thiếu Họ và tên',
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
        fullName:
          parentNameIdx >= 0 && row[parentNameIdx]
            ? String(row[parentNameIdx]).trim().replace(/\s+/g, ' ')
            : undefined,
        phoneNumber: parentPhoneIdx >= 0 ? formatPhoneNumber(row[parentPhoneIdx]) : undefined,
      },
    }

    const normNewName = normalizeStudentString(parsedStudent.name)
    const isDup = existingStudents.some((es) => {
      const normEsName = normalizeStudentString(es.name)
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
      message: isDup ? 'Học sinh đã tồn tại' : 'Hợp lệ',
    })
  }

  return preview
}
