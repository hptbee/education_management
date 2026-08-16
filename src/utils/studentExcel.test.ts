import { describe, expect, it } from 'vitest'
import { formatPhoneNumber, mapStudentExcelRows, parseGender, parseStudentExcelFile } from './studentExcel'

describe('studentExcel helpers', () => {
  it('parses gender aliases', () => {
    expect(parseGender('Nam')).toBe('male')
    expect(parseGender('nữ')).toBe('female')
    expect(parseGender('')).toBe('unknown')
  })

  it('restores leading zero for phone numbers', () => {
    expect(formatPhoneNumber(901234567)).toBe('0901234567')
  })

  it('maps valid student rows from spreadsheet data', () => {
    const rows = mapStudentExcelRows(
      [
        ['Stt', 'Họ và tên', 'Ngày sinh'],
        ['1', 'Nguyễn Minh Anh', '10/03/2018'],
      ],
      [],
    )

    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('valid')
    expect(rows[0].data.name).toBe('Nguyễn Minh Anh')
    expect(rows[0].data.dateOfBirth).toBe('2018-03-10')
  })

  it('rejects legacy .xls OLE spreadsheets', async () => {
    const oleHeader = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0])
    const file = new File([oleHeader], 'students.xls', {
      type: 'application/vnd.ms-excel',
    })

    await expect(parseStudentExcelFile(file)).rejects.toThrow(
      'Định dạng .xls không được hỗ trợ',
    )
  })
})
