'use client'

import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Copy,
  Crown,
  Download,
  FolderOpen,
  MonitorPlay,
  PencilLine,
  Settings,
  Sparkles,
  Trash2,
  UserCircle,
} from 'lucide-react'
import { useState } from 'react'
import { TeacherAvatar } from '@/src/components/TeacherAvatar'
import { Button, Card, Field, Input } from '@/src/components/ui'
import { useAppData } from '@/src/store/AppDataContext'
import { ClassroomRolesSection } from './classroom-roles-section'
import { HomeBannerSection } from './home-banner-section'
import { TeacherProfileAvatar } from './teacher-profile-avatar'

type SettingsTab = 'teacher' | 'classroom' | 'roles' | 'database' | 'danger'

function PageHeading({ title, description }: { title: string; description: string }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.2em] text-brand-purple">Lớp học</p>
        <h1 className="mt-1 text-3xl font-black text-slate-800 md:text-5xl">{title}</h1>
        <p className="mt-2 max-w-3xl font-semibold text-slate-500">{description}</p>
      </div>
    </header>
  )
}

export function SettingsPage() {
  const {
    data,
    updateClassroomSettings,
    updateTeacherProfile,
    renameDatabase,
    duplicateDatabase,
    deleteDatabase,
    closeDatabase,
  } = useAppData()
  const [activeTab, setActiveTab] = useState<SettingsTab>('teacher')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [teacherDraft, setTeacherDraft] = useState({ name: data!.classroomSettings.teacher.name })
  const [classroomDraft, setClassroomDraft] = useState({ className: data!.classroomSettings.className })
  const [renameDraft, setRenameDraft] = useState({
    className: data!.classroomSettings.className,
    schoolYear: data!.classroomSettings.schoolYear,
  })
  const [renaming, setRenaming] = useState(false)
  const [dupDraft, setDupDraft] = useState({
    className: '',
    schoolYear: data!.classroomSettings.schoolYear,
    mode: 'settings-only' as 'settings-only' | 'full-copy',
  })
  const [duplicating, setDuplicating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  const showSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSaveTeacher = () => {
    if (!teacherDraft.name.trim()) return
    updateTeacherProfile({ name: teacherDraft.name.trim() })
    showSaved()
  }

  const handleSaveClassroom = () => {
    if (!classroomDraft.className.trim()) return
    updateClassroomSettings({ ...data!.classroomSettings, className: classroomDraft.className.trim() })
    showSaved()
  }

  const handleRename = async () => {
    setError(null)
    setRenaming(true)
    try {
      await renameDatabase(renameDraft.className.trim(), renameDraft.schoolYear.trim())
      showSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể đổi tên database.')
    } finally {
      setRenaming(false)
    }
  }

  const handleDuplicate = async () => {
    setError(null)
    setDuplicating(true)
    try {
      await duplicateDatabase(dupDraft.className.trim(), dupDraft.schoolYear.trim(), dupDraft.mode)
      setDupDraft({ className: '', schoolYear: data!.classroomSettings.schoolYear, mode: 'settings-only' })
      showSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể nhân bản database.')
    } finally {
      setDuplicating(false)
    }
  }

  const handleDelete = async () => {
    if (deleteInput !== data!.classroomSettings.className) return
    setDeleting(true)
    try {
      await deleteDatabase(data!.metadata.id)
      closeDatabase()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể xóa lớp học.')
      setDeleting(false)
    }
  }

  const handleExport = async () => {
    setError(null)
    try {
      const { databaseService } = await import('@/src/database/database.service')
      await databaseService.exportDatabase(data!)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể xuất dữ liệu.')
    }
  }

  const handleOpenDataFolder = async () => {
    try {
      const { databaseService } = await import('@/src/database/database.service')
      const dir = await databaseService.getDataDirectory()
      if (!dir) {
        setError('Chức năng này chỉ khả dụng khi chạy ứng dụng Tauri.')
        return
      }
      const { tauriFs } = await import('@/src/database/tauri-fs.service')
      await tauriFs.openPath(dir)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể mở thư mục dữ liệu.')
    }
  }

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'teacher', label: 'Giáo viên', icon: <UserCircle size={18} /> },
    { id: 'classroom', label: 'Lớp học', icon: <MonitorPlay size={18} /> },
    { id: 'roles', label: 'Vai trò', icon: <Crown size={18} /> },
    { id: 'database', label: 'Năm học', icon: <Settings size={18} /> },
    { id: 'danger', label: 'Nguy hiểm', icon: <AlertTriangle size={18} /> },
  ]

  return (
    <div className="grid gap-5">
      <PageHeading title="CÀI ĐẶT" description="Quản lý hồ sơ giáo viên, lớp học và dữ liệu năm học." />

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id)
              setError(null)
            }}
            className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-extrabold transition-all duration-200 ${
              activeTab === tab.id
                ? tab.id === 'danger'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-200'
                  : 'bg-brand-purple text-white shadow-lg shadow-sky-200'
                : tab.id === 'danger'
                  ? 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                  : 'bg-white/80 text-slate-500 hover:bg-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 font-bold text-emerald-700"
        >
          <Sparkles size={18} /> Đã lưu thay đổi thành công!
        </motion.div>
      )}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 font-bold text-rose-700"
        >
          <AlertTriangle size={18} /> {error}
        </motion.div>
      )}

      {activeTab === 'teacher' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-white/90">
            <div className="mb-6 flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-[1.4rem] bg-gradient-to-br from-brand-purple to-brand-purple-light text-3xl text-white shadow-lg">
                👩‍🏫
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">Hồ sơ giáo viên</h2>
                <p className="text-sm text-slate-500">Tên và ảnh đại diện hiển thị trong lớp học</p>
              </div>
            </div>
            <div className="grid gap-4">
              <TeacherProfileAvatar onSaved={showSaved} onError={setError} />
              <Field label="👩‍🏫 Tên giáo viên">
                <Input
                  value={teacherDraft.name}
                  onChange={(e) => setTeacherDraft({ name: e.target.value })}
                  placeholder="Ví dụ: Cô Thu"
                />
              </Field>
              <Button className="w-full justify-center" onClick={handleSaveTeacher}>
                <Sparkles size={18} /> Lưu hồ sơ
              </Button>
            </div>
          </Card>

          <Card className="border border-[#fff0c7] bg-gradient-to-br from-[#fff7dc] via-white to-[#fff0f5]">
            <p className="mb-4 text-xs font-black uppercase tracking-widest text-[#ff8a00]">Xem trước</p>
            <div className="flex flex-col items-center gap-4 text-center">
              <TeacherAvatar
                src={data!.classroomSettings.teacher.avatar}
                name={teacherDraft.name || 'Giáo viên'}
                className="h-20 w-20 rounded-[38%] text-5xl shadow-lg"
              />
              <div>
                <p className="text-xl font-black text-slate-800">{teacherDraft.name || 'Tên giáo viên'}</p>
                <p className="mt-1 text-sm text-slate-500">Giáo viên chủ nhiệm</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'classroom' && (
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-white/90">
              <div className="mb-6 flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-[1.4rem] bg-gradient-to-br from-[#ff7f96] to-[#ffb400] text-3xl text-white shadow-lg">
                  🏫
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Thông tin lớp học</h2>
                  <p className="text-sm text-slate-500">Tên hiển thị của lớp học</p>
                </div>
              </div>
              <div className="grid gap-4">
                <Field label="🏫 Tên lớp">
                  <Input
                    value={classroomDraft.className}
                    onChange={(e) => setClassroomDraft({ className: e.target.value })}
                    placeholder="Ví dụ: Lớp 2C, 3A1..."
                  />
                </Field>
                <Button className="w-full justify-center" onClick={handleSaveClassroom}>
                  <Sparkles size={18} /> Lưu tên lớp
                </Button>
              </div>
            </Card>

            <div className="grid gap-4">
              <Card className="bg-white/90">
                <p className="mb-3 text-xs font-black uppercase tracking-widest text-brand-purple">Thống kê lớp</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Học sinh', value: data!.students.length, emoji: '🧑‍🎓' },
                    { label: 'Tổ nhóm', value: data!.teams.length, emoji: '👥' },
                    { label: 'Hành động điểm', value: data!.pointActions.length, emoji: '⭐' },
                    { label: 'Phần thưởng', value: data!.rewards.length, emoji: '🎁' },
                  ].map(({ label, value, emoji }) => (
                    <div key={label} className="rounded-2xl bg-brand-soft p-3 text-center">
                      <p className="text-2xl">{emoji}</p>
                      <p className="text-2xl font-black text-brand-purple">{value}</p>
                      <p className="text-xs font-bold text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="bg-white/90">
                <p className="mb-3 text-xs font-black uppercase tracking-widest text-brand-purple">Xuất / Nhập dữ liệu</p>
                <Button variant="ghost" className="w-full justify-center" onClick={() => void handleExport()}>
                  <Download size={18} /> Xuất JSON
                </Button>
              </Card>
            </div>
          </div>

          <HomeBannerSection onSaved={showSaved} onError={setError} />
        </div>
      )}

      {activeTab === 'roles' && <ClassroomRolesSection />}

      {activeTab === 'database' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="bg-white/90">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand-purple">
                <Settings size={22} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">Đổi tên / Năm học</h2>
                <p className="text-xs text-slate-500">Tạo database ID mới — an toàn tuyệt đối</p>
              </div>
            </div>
            <div className="grid gap-3">
              <Field label="🏫 Tên lớp mới">
                <Input
                  value={renameDraft.className}
                  onChange={(e) => setRenameDraft({ ...renameDraft, className: e.target.value })}
                />
              </Field>
              <Field label="📅 Năm học mới">
                <Input
                  value={renameDraft.schoolYear}
                  onChange={(e) => setRenameDraft({ ...renameDraft, schoolYear: e.target.value })}
                  placeholder="VD: 2025-2026"
                />
              </Field>
              <Button
                className="w-full justify-center"
                onClick={() => void handleRename()}
                disabled={renaming || !renameDraft.className.trim() || !renameDraft.schoolYear.trim()}
              >
                {renaming ? 'Đang xử lý...' : (
                  <>
                    <PencilLine size={18} /> Đổi tên database
                  </>
                )}
              </Button>
            </div>
          </Card>

          <Card className="bg-white/90">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f0fff4] text-emerald-600">
                <Copy size={22} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">Nhân bản database</h2>
                <p className="text-xs text-slate-500">Tạo lớp mới từ lớp hiện tại</p>
              </div>
            </div>
            <div className="grid gap-3">
              <Field label="🏫 Tên lớp mới">
                <Input
                  value={dupDraft.className}
                  onChange={(e) => setDupDraft({ ...dupDraft, className: e.target.value })}
                  placeholder="VD: Lớp 3A"
                />
              </Field>
              <Field label="📅 Năm học">
                <Input
                  value={dupDraft.schoolYear}
                  onChange={(e) => setDupDraft({ ...dupDraft, schoolYear: e.target.value })}
                  placeholder="VD: 2025-2026"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                {(['settings-only', 'full-copy'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDupDraft({ ...dupDraft, mode })}
                    className={`rounded-2xl border-2 p-3 text-left transition-all ${
                      dupDraft.mode === mode
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-emerald-300'
                    }`}
                  >
                    <p className="text-sm font-black text-slate-800">
                      {mode === 'settings-only' ? '📋 Chỉ cài đặt' : '📦 Bản sao đầy đủ'}
                    </p>
                  </button>
                ))}
              </div>
              <Button
                className="w-full justify-center bg-emerald-500 hover:bg-emerald-600"
                onClick={() => void handleDuplicate()}
                disabled={duplicating || !dupDraft.className.trim()}
              >
                {duplicating ? 'Đang nhân bản...' : (
                  <>
                    <Copy size={18} /> Nhân bản
                  </>
                )}
              </Button>
            </div>
          </Card>

          <Card className="bg-white/90 lg:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-600">
                  <FolderOpen size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800">📂 Mở thư mục dữ liệu</h2>
                  <p className="text-xs text-slate-500">Xem file JSON của tất cả lớp học trong File Explorer</p>
                </div>
              </div>
              <Button variant="ghost" onClick={() => void handleOpenDataFolder()}>
                <FolderOpen size={18} /> Mở thư mục
              </Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'danger' && (
        <Card className="border-2 border-rose-200 bg-white/90">
          <div className="mb-6 flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-500">
              <AlertTriangle size={26} />
            </div>
            <div>
              <h2 className="text-xl font-black text-rose-600">Vùng nguy hiểm</h2>
              <p className="text-sm text-slate-500">Các thao tác không thể hoàn tác</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-surface-soft p-4">
              <div>
                <p className="font-black text-slate-800">📥 Sao lưu trước khi xóa</p>
                <p className="text-sm text-slate-500">Xuất toàn bộ dữ liệu ra file JSON</p>
              </div>
              <Button variant="ghost" onClick={() => void handleExport()}>
                <Download size={16} />
                Xuất
              </Button>
            </div>

            <div className="grid gap-4 rounded-2xl border-2 border-rose-200 bg-rose-50 p-5">
              <div>
                <p className="text-lg font-black text-rose-700">🗑️ Xóa lớp học này</p>
                <p className="mt-1 text-sm text-rose-600">
                  Xóa vĩnh viễn database <strong>{data!.classroomSettings.className}</strong> (
                  {data!.classroomSettings.schoolYear}). Bao gồm {data!.students.length} học sinh và toàn bộ lịch
                  sử.
                </p>
              </div>

              {!deleteConfirm ? (
                <Button
                  className="w-full justify-center bg-rose-500 text-white hover:bg-rose-600"
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 size={18} /> Tôi muốn xóa lớp này
                </Button>
              ) : (
                <div className="grid gap-3">
                  <p className="text-sm font-bold text-rose-700">
                    Nhập tên lớp <strong className="font-black">&quot;{data!.classroomSettings.className}&quot;</strong>{' '}
                    để xác nhận:
                  </p>
                  <Input
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder={data!.classroomSettings.className}
                    className="border-rose-300 focus:ring-rose-400"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDeleteConfirm(false)
                        setDeleteInput('')
                      }}
                    >
                      Hủy bỏ
                    </Button>
                    <Button
                      className="justify-center bg-rose-600 text-white hover:bg-rose-700"
                      onClick={() => void handleDelete()}
                      disabled={deleteInput !== data!.classroomSettings.className || deleting}
                    >
                      {deleting ? 'Đang xóa...' : (
                        <>
                          <Trash2 size={16} /> Xóa vĩnh viễn
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
