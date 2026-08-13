export type TotId = 1 | 2 | 3 | 4

export type Student = {
  id: string
  name: string
  gender: 'Nam' | 'Nữ'
  dob: string
  tot: TotId
  points: number
  avatar: string
}

export const students: Student[] = [
  {
    id: 's1',
    name: 'Huỳnh Mẫn Nhi',
    gender: 'Nữ',
    dob: '15/03/2016',
    tot: 1,
    points: 15,
    avatar: '/avatar-girl-1.png',
  },
  {
    id: 's2',
    name: 'Trần Minh Đức',
    gender: 'Nam',
    dob: '20/01/2016',
    tot: 2,
    points: 14,
    avatar: '/avatar-boy-1.png',
  },
  {
    id: 's3',
    name: 'Ngô Thị Thanh Thủy',
    gender: 'Nữ',
    dob: '11/06/2016',
    tot: 1,
    points: 11,
    avatar: '/avatar-girl-2.png',
  },
  {
    id: 's4',
    name: 'Lê Nguyễn Huy',
    gender: 'Nam',
    dob: '02/09/2016',
    tot: 3,
    points: 10,
    avatar: '/avatar-boy-2.png',
  },
]

export type RankedStudent = {
  id: string
  name: string
  tot: TotId
  points: number
  avatar: string
}

export const leaderboard: RankedStudent[] = [
  { id: 's1', name: 'Huỳnh Mẫn Nhi', tot: 1, points: 15, avatar: '/avatar-girl-1.png' },
  { id: 's2', name: 'Trần Minh Đức', tot: 2, points: 14, avatar: '/avatar-boy-1.png' },
  { id: 's3', name: 'Ngô Thị Thanh Thủy', tot: 1, points: 11, avatar: '/avatar-girl-2.png' },
  { id: 's4', name: 'Lê Nguyễn Huy', tot: 3, points: 10, avatar: '/avatar-boy-2.png' },
  { id: 's5', name: 'Phạm Gia Bảo', tot: 2, points: 9, avatar: '/avatar-boy-1.png' },
]

export type Team = {
  id: TotId
  name: string
  points: number
  max: number
}

export const teams: Team[] = [
  { id: 1, name: 'Tổ 1', points: 56, max: 60 },
  { id: 2, name: 'Tổ 2', points: 46, max: 60 },
  { id: 3, name: 'Tổ 3', points: 38, max: 60 },
  { id: 4, name: 'Tổ 4', points: 28, max: 60 },
]

export type Activity = {
  id: string
  avatar: string
  text: string
  delta: number
  time: string
}

export const activities: Activity[] = [
  {
    id: 'a1',
    avatar: '/avatar-boy-1.png',
    text: 'Cô Thư đã cộng 5 điểm cho Minh Đức',
    delta: 5,
    time: '2 phút trước',
  },
  {
    id: 'a2',
    avatar: '/avatar-boy-2.png',
    text: 'Cô Thư đã trừ 3 điểm cho Gia Bảo',
    delta: -3,
    time: '15 phút trước',
  },
]

export const totColors: Record<TotId, { text: string; bg: string; bar: string }> = {
  1: { text: 'text-tot-1', bg: 'bg-pink-50 text-tot-1', bar: 'bg-tot-1' },
  2: { text: 'text-tot-2', bg: 'bg-green-50 text-tot-2', bar: 'bg-tot-2' },
  3: { text: 'text-tot-3', bg: 'bg-amber-50 text-tot-3', bar: 'bg-tot-3' },
  4: { text: 'text-tot-4', bg: 'bg-violet-50 text-tot-4', bar: 'bg-tot-4' },
}
