import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BookOpen,
  ChevronRight,
  Crown,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Minus,
  MonitorPlay,
  PartyPopper,
  PencilLine,
  Plus,
  Rocket,
  Sparkles,
  Star,
  Trophy,
  Users,
  Volleyball,
  WandSparkles,
  Gamepad2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, NavLink, Route, Routes, useParams } from "react-router-dom";
import { Avatar } from "./components/Avatar";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "./components/ui";
import { useAppData } from "./store/AppDataContext";
import type { Recognition, Student, Team } from "./types/models";
import { createId } from "./utils/id";
import { pickWithoutRepeat } from "./utils/randomSelection";

const nav = [
  { to: "/", label: "Trang chủ", icon: Home },
  { to: "/students", label: "Học sinh", icon: GraduationCap },
  { to: "/teams", label: "Tổ / Nhóm", icon: Users },
  { to: "/points", label: "Tích điểm", icon: Star },
  { to: "/rewards", label: "Quà tặng", icon: Gift },
  { to: "/lucky-wheel", label: "Vòng quay", icon: WandSparkles },
  { to: "/games", label: "Trò chơi", icon: Gamepad2 },
  { to: "/recognition", label: "Tuyên dương", icon: Trophy },
  { to: "/settings", label: "Điểm trừ", icon: Minus },
] as const;

const quickActions = [
  { label: "Tích điểm", icon: Star, tone: "from-emerald-300 to-emerald-500" },
  { label: "Điểm trừ", icon: Minus, tone: "from-rose-300 to-rose-500" },
  { label: "Quà tặng", icon: Gift, tone: "from-amber-300 to-orange-500" },
  { label: "Vòng quay", icon: Volleyball, tone: "from-fuchsia-300 to-violet-500" },
  { label: "Trò chơi", icon: Gamepad2, tone: "from-sky-300 to-blue-500" },
  { label: "Tuyên dương", icon: Trophy, tone: "from-pink-300 to-rose-500" },
] as const;

function Page({ children }: { children: React.ReactNode }) {
  return <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5">{children}</motion.div>;
}

function Layout() {
  const { data, isFirstRun } = useAppData();
  if (isFirstRun) return <OnboardingPage />;

  return (
    <div className="min-h-screen p-3 lg:p-4">
      <div className="mx-auto grid max-w-[1680px] gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Sidebar />
        <main className="min-w-0 rounded-[2rem] border border-white/80 bg-white/45 p-4 shadow-[0_18px_45px_rgba(70,52,160,0.10)] backdrop-blur-xl lg:p-5">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/students/:id" element={<StudentProfilePage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/points" element={<PointsPage />} />
            <Route path="/rewards" element={<RewardsPage />} />
            <Route path="/recognition" element={<RecognitionPage />} />
            <Route path="/lucky-wheel" element={<LuckyWheelPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
      <div className="sr-only">{formatClassroomTitle(data.classroomSettings)}</div>
    </div>
  );
}

function Sidebar() {
  const { data } = useAppData();
  const settings = data.classroomSettings;
  return (
    <aside className="sticky top-3 flex h-[calc(100vh-1.5rem)] flex-col rounded-[2.25rem] bg-gradient-to-b from-[#7c5cff] via-[#6a66ee] to-[#5a90ef] p-4 text-white shadow-[0_20px_50px_rgba(81,64,194,0.35)]">
      <div className="rounded-[1.7rem] bg-white/14 p-4 text-center shadow-inner backdrop-blur-sm">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-[34%] bg-white/90 text-4xl shadow-[0_10px_0_rgba(255,255,255,0.18)]">📚</div>
        <h1 className="mt-3 text-3xl font-black tracking-wide">LÊ THƯ</h1>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/80">Cô giáo nhỏ 4.0</p>
      </div>
      <nav className="mt-4 grid gap-2">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `group flex min-h-14 items-center gap-3 rounded-[1.2rem] px-4 font-extrabold transition-all duration-200 ${
                isActive ? "bg-[#fff0ad] text-[#3f2f8f]" : "text-white/92 hover:bg-white/14"
              }`
            }
          >
            <item.icon size={22} className="shrink-0" />
            <span>{item.label}</span>
            <ChevronRight className="ml-auto opacity-40 transition group-hover:translate-x-0.5" size={18} />
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto rounded-[1.4rem] bg-white/12 p-3">
        <div className="flex items-center gap-3">
          <Avatar name={settings.className} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-black">{formatClassroomTitle(settings)}</p>
            <p className="text-xs text-white/80">Năm học: {settings.schoolYear}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Dashboard() {
  const { data } = useAppData();
  const topStudents = useMemo(() => [...data.students].sort((a, b) => b.points - a.points).slice(0, 4), [data.students]);
  const rankedTeams = useMemo(() => [...data.teams].sort((a, b) => b.score - a.score), [data.teams]);
  const featured = topStudents[0] ?? data.students[0];

  return (
    <Page>
      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_400px]">
        <Card className="overflow-hidden bg-white/85 p-0">
          <div className="flex gap-4 p-5">
            <div className="rounded-[1.6rem] bg-gradient-to-br from-[#b7ebff] to-[#ffe6f1] p-2">
              <Avatar name={data.classroomSettings.className} size="lg" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <h2 className="truncate text-2xl font-black text-[#273055]">{formatClassroomTitle(data.classroomSettings)}</h2>
                <PencilLine className="mt-1 text-[#7c5cff]" size={18} />
              </div>
              <p className="mt-2 text-sm font-semibold text-[#6a6f91]">Giáo viên: {data.classroomSettings.teacherName}</p>
              <p className="mt-1 text-sm font-semibold text-[#6a6f91]">Năm học: {data.classroomSettings.schoolYear}</p>
              <Button className="mt-4 w-full justify-center" variant="ghost"><MonitorPlay size={18} />Đổi ảnh lớp</Button>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-[#fff8ff] via-[#eef7ff] to-[#fff6d9]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,214,107,0.35),transparent_18%),radial-gradient(circle_at_80%_20%,rgba(124,92,255,0.18),transparent_16%),radial-gradient(circle_at_50%_80%,rgba(255,159,208,0.2),transparent_18%)]" />
          <div className="relative grid h-full gap-4 xl:grid-cols-[170px_1fr_170px] xl:items-center">
            <Mascot side="left" />
            <div className="py-4 text-center">
              <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-1 text-sm font-black text-[#7c5cff] shadow-sm">✨ Cùng nhau học tập thật tốt</div>
              <div className="mb-2 text-base font-black text-[#ff7f96]">Chào {data.classroomSettings.teacherName}! 👋</div>
              <h1 className="text-4xl font-black leading-tight text-[#2c2f77] md:text-5xl">
                Ai sẽ là người
                <span className="block text-[#ffb400] drop-shadow-[0_3px_0_rgba(76,57,0,0.18)]">tỏa sáng</span>
                hôm nay nhỉ?
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base font-semibold text-[#56608b] md:text-lg">
                Cùng nhau học tập thật tốt - Tích điểm thật nhiều - Nhận huy hiệu - Đổi quà hấp dẫn!
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Badge className="bg-white/90 text-[#4c557c]">⭐ {featured?.points ?? 0} điểm cao nhất</Badge>
                <Badge className="bg-white/90 text-[#4c557c]">🏆 {rankedTeams[0]?.name ?? "Tổ dẫn đầu"}</Badge>
              </div>
            </div>
            <Mascot side="right" />
          </div>
        </Card>

        <Card className="bg-white/88">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-black uppercase tracking-wide text-[#7c5cff]">Thao tác nhanh</h3>
            <Badge className="bg-[#fff0ad] text-[#4d3b00]">Trình chiếu</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button key={action.label} className={`flex min-h-20 flex-col items-start justify-between rounded-[1.3rem] bg-gradient-to-br ${action.tone} p-4 text-left text-white shadow-[0_10px_0_rgba(41,48,77,0.08)] transition hover:-translate-y-1 active:translate-y-0`} onClick={() => confetti({ particleCount: 100, spread: 75 })}>
                <action.icon size={22} />
                <span className="text-sm font-black">{action.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr_1fr]">
        <Card className="bg-white/90">
          <SectionTitle icon={Users} title="DANH SÁCH HỌC SINH" />
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="relative min-w-[240px] flex-1">
              <input className="w-full rounded-full border border-[#dde2ff] bg-[#fbfbff] py-3 pl-11 pr-4 outline-none" placeholder="Tìm kiếm học sinh..." />
              <Star className="absolute left-4 top-3.5 text-[#b4b9da]" size={18} />
            </div>
            <Button><Plus size={18} />Thêm học sinh</Button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {topStudents.map((student) => <StudentPreviewCard key={student.id} student={student} />)}
          </div>
          <Link className="mt-4 inline-flex items-center gap-2 font-black text-[#6f55ee]" to="/students">Xem tất cả học sinh <ChevronRight size={18} /></Link>
        </Card>

        <Card className="bg-white/90">
          <SectionTitle icon={Crown} title="BẢNG XẾP HẠNG ĐIỂM" />
          <div className="mt-4 grid gap-2">
            {topStudents.map((student, index) => <LeaderboardRow key={student.id} student={student} rank={index + 1} />)}
          </div>
          <Link className="mt-4 inline-flex items-center gap-2 font-black text-[#6f55ee]" to="/points">Xem bảng xếp hạng <ChevronRight size={18} /></Link>
        </Card>

        <Card className="bg-white/90">
          <SectionTitle icon={Users} title="THI ĐUA TỔ / NHÓM" />
          <div className="mt-4 grid gap-3">
            {rankedTeams.map((team, index) => <TeamCompetitionRow key={team.id} team={team} rank={index + 1} />)}
          </div>
          <Link className="mt-4 inline-flex items-center gap-2 font-black text-[#6f55ee]" to="/teams">Xem chi tiết <ChevronRight size={18} /></Link>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="bg-white/90">
          <SectionTitle icon={Trophy} title="TUYÊN DƯƠNG GẦN ĐÂY" />
          <RecognitionPreview recognition={data.recognitions[0]} student={featured} teacherName={data.classroomSettings.teacherName} />
        </Card>
        <Card className="bg-white/90">
          <SectionTitle icon={Bell} title="HOẠT ĐỘNG GẦN ĐÂY" />
          <ActivityFeed
            items={[
              { text: `${data.classroomSettings.teacherName} đã cộng 5 điểm cho Minh Đức`, delta: "+5", positive: true, time: "2 phút trước" },
              { text: `${data.classroomSettings.teacherName} đã trừ 3 điểm của Gia Bảo`, delta: "-3", positive: false, time: "15 phút trước" },
            ]}
          />
        </Card>
        <Card className="bg-white/90">
          <SectionTitle icon={Bell} title="THÔNG BÁO" action="Xem tất cả" />
          <div className="relative mt-4 overflow-hidden rounded-[1.4rem] border border-[#fff0c7] bg-gradient-to-br from-[#fff7dc] to-[#fff1fb] p-4">
            <div className="max-w-[70%]">
              <p className="text-lg font-black text-[#ff8a00]">Nhắc nhở</p>
              <p className="mt-2 font-semibold text-[#556089]">Các con nhớ ôn bài và chuẩn bị bài đầy đủ nhé!</p>
            </div>
            <div className="absolute bottom-2 right-2 text-5xl">👧</div>
          </div>
        </Card>
      </section>
    </Page>
  );
}

function StudentsPage() {
  const { data, saveStudent, deleteStudent } = useAppData();
  const [draft, setDraft] = useState<Student>(newStudent());
  return (
    <Page>
      <PageHeading title="HỌC SINH" description="Danh sách học sinh và thông tin cơ bản." />
      <Card className="bg-white/90">
        <form className="grid gap-3 md:grid-cols-[1fr_160px_auto]" onSubmit={(e) => { e.preventDefault(); saveStudent(draft); setDraft(newStudent()); }}>
          <Input placeholder="Tên học sinh" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Field label="Tổ"><Select value={draft.teamId ?? ""} onChange={(e) => setDraft({ ...draft, teamId: e.target.value || undefined })}><option value="">Chọn tổ</option>{data.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</Select></Field>
          <Button type="submit"><Plus size={18} />Thêm học sinh</Button>
        </form>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.students.map((student) => (
          <Card key={student.id} className="bg-white/90">
            <div className="grid justify-items-center gap-3 text-center">
              <Avatar name={student.name} size="lg" />
              <h3 className="text-xl font-black text-[#273055]">{student.name}</h3>
              <Badge className="bg-[#f5f7ff] text-[#63709d]">{student.gender === "female" ? "Nữ" : "Nam"} • {student.dateOfBirth ?? "15/03/2016"}</Badge>
              <Badge className="bg-[#fff0f7] text-[#de4f89]">{teamName(data.teams, student.teamId, "Tổ 1")}</Badge>
              <p className="font-black text-[#ff9a00]">⭐ {student.points} điểm</p>
              <Button size="sm" variant="danger" onClick={() => deleteStudent(student.id)}>Xóa</Button>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
}

function StudentProfilePage() {
  const { id } = useParams();
  const { data } = useAppData();
  const student = data.students.find((item) => item.id === id);
  if (!student) return <Card>Không tìm thấy học sinh.</Card>;
  return (
    <Page>
      <PageHeading title={student.name} description="Hồ sơ học sinh" />
      <Card className="bg-white/90">
        <div className="flex flex-col items-center gap-4 text-center">
          <Avatar name={student.name} size="xl" />
          <p className="text-5xl font-black text-[#7c5cff]">{student.points}</p>
          <Badge>Điểm hiện tại</Badge>
        </div>
      </Card>
    </Page>
  );
}

function TeamsPage() {
  const { data, updateTeamScore } = useAppData();
  return (
    <Page>
      <PageHeading title="TỔ / NHÓM" description="Theo dõi điểm thi đua của từng tổ." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...data.teams].sort((a, b) => b.score - a.score).map((team, index) => (
          <Card key={team.id} className="bg-white/90">
            <div className="flex items-center gap-4">
              <Avatar name={team.name} size="lg" />
              <div>
                <Badge>#{index + 1}</Badge>
                <h3 className="mt-2 text-2xl font-black">{team.name}</h3>
                <p className="text-4xl font-black text-[#ff8f70]">{team.score}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="mint" onClick={() => updateTeamScore(team.id, 1)}>+1</Button>
              <Button size="sm" variant="sunny" onClick={() => updateTeamScore(team.id, 5)}>+5</Button>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
}

function PointsPage() {
  const { data, applyPoints } = useAppData();
  const [studentId, setStudentId] = useState(data.students[0]?.id ?? "");
  return (
    <Page>
      <PageHeading title="TÍCH ĐIỂM" description="Cộng điểm nhanh cho học sinh." />
      <Card className="bg-white/90">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>{data.students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</Select>
          <Button onClick={() => applyPoints(studentId, data.pointActions.find((a) => a.points > 0) ?? { id: createId("bonus"), name: "Khen thưởng", points: 5, type: "reward" })}>⭐ +5</Button>
        </div>
      </Card>
      <div className="grid gap-2">
        {data.pointActions.map((action) => (
          <Card key={action.id} className="flex items-center justify-between bg-white/90 py-3">
            <div>
              <p className="font-black">{action.name}</p>
              <p className="text-sm text-[#6a6f91]">{action.points > 0 ? "+" : ""}{action.points} điểm</p>
            </div>
            <Button size="sm" variant={action.points > 0 ? "mint" : "peach"} onClick={() => applyPoints(studentId, action)}>{action.points > 0 ? "Cộng" : "Trừ"}</Button>
          </Card>
        ))}
      </div>
    </Page>
  );
}

function RewardsPage() {
  const { data } = useAppData();
  return <Page><PageHeading title="QUÀ TẶNG" description="Phần thưởng và quà khích lệ." /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{data.rewards.map((reward) => <Card key={reward.id} className="bg-white/90"><h3 className="text-xl font-black">{reward.name}</h3><p className="mt-2 text-sm text-[#6a6f91]">{reward.description}</p><p className="mt-4 font-black text-[#ff9a00]">⭐ {reward.requiredPoints} điểm</p></Card>)}</div></Page>;
}

function RecognitionPage() {
  const { data, addRecognition } = useAppData();
  const [studentId, setStudentId] = useState(data.students[0]?.id ?? "");
  const [message, setMessage] = useState("Tích cực phát biểu xây dựng bài!");
  const [latest, setLatest] = useState<Recognition | null>(null);
  const student = data.students.find((item) => item.id === (latest?.studentId ?? studentId));
  return (
    <Page>
      <PageHeading title="TUYÊN DƯƠNG" description="Tạo lời khen và khoảnh khắc chúc mừng." />
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Card className="bg-white/90">
          <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); const saved = addRecognition({ studentId, type: "Tuyên dương", title: "Học sinh tích cực", message }); setLatest(saved); confetti(); }}>
            <Field label="Học sinh"><Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>{data.students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</Select></Field>
            <Field label="Lời nhắn"><Textarea value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
            <Button type="submit"><PartyPopper size={18} />Tuyên dương</Button>
          </form>
        </Card>
        <Card className="bg-gradient-to-br from-[#fff7d4] via-[#fff2fb] to-[#e9e6ff] text-center">
          <Sparkles className="mx-auto text-[#7c5cff]" size={54} />
          <h3 className="mt-3 text-4xl font-black text-[#2c2f77]">{latest?.title ?? "Học sinh tích cực"}</h3>
          {student ? <div className="mt-8 grid justify-items-center gap-4"><Avatar name={student.name} size="xl" /><h4 className="text-4xl font-black">{student.name}</h4><p className="max-w-2xl text-xl font-semibold text-[#5e668b]">{latest?.message ?? message}</p></div> : null}
        </Card>
      </div>
    </Page>
  );
}

function LuckyWheelPage() {
  const { data, setWheelStudentBag } = useAppData();
  const [winner, setWinner] = useState<Student | undefined>();
  const spin = () => {
    const result = pickWithoutRepeat(data.students, data.wheelStudentBag);
    setWinner(result.selected);
    setWheelStudentBag(result.nextBag);
    confetti({ particleCount: 160, spread: 98 });
  };
  return (
    <Page>
      <PageHeading title="VÒNG QUAY" description="Quay chọn học sinh may mắn." action={<Button onClick={spin}><Rocket size={18} />Quay ngay</Button>} />
      <Card className="grid min-h-[520px] place-items-center bg-gradient-to-br from-[#8fd8ff] via-[#fff0ad] to-[#ff9fd0]">
        <motion.div animate={{ rotate: winner ? 1440 : 0 }} transition={{ duration: 1.25, ease: "easeOut" }} className="grid h-[min(68vw,440px)] w-[min(68vw,440px)] place-items-center rounded-full border-[18px] border-white bg-conic-gradient shadow-[0_20px_0_rgba(41,48,77,0.12)]">
          <div className="rounded-full bg-white/90 p-10 text-center">
            <WandSparkles className="mx-auto text-[#7c5cff]" size={48} />
            <p className="mt-2 text-3xl font-black">Spin</p>
          </div>
        </motion.div>
        <AnimatePresence mode="wait">
          {winner ? <motion.div key={winner.id} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-6 grid justify-items-center gap-3"><Avatar name={winner.name} size="lg" /><h3 className="text-3xl font-black">{winner.name}</h3></motion.div> : null}
        </AnimatePresence>
      </Card>
    </Page>
  );
}

function GamesPage() {
  return <Page><PageHeading title="TRÒ CHƠI" description="Không gian mini game cho lớp học." /><div className="grid gap-4 md:grid-cols-3"><GameCard title="Chọn học sinh" icon={BookOpen} /><GameCard title="Nhanh tay giơ tay" icon={Heart} /><GameCard title="Đố vui" icon={Sparkles} /></div></Page>;
}

function SettingsPage() {
  const { data, updateClassroomSettings } = useAppData();
  const [draft, setDraft] = useState(data.classroomSettings);
  return (
    <Page>
      <PageHeading title="CÀI ĐẶT LỚP HỌC" description="Thiết lập tên lớp, giáo viên và năm học." />
      <Card className="mx-auto w-full max-w-2xl bg-white/90">
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); updateClassroomSettings(draft); }}>
          <div className="grid justify-items-center gap-3 text-center">
            <Avatar name={draft.className} size="xl" />
            <Button type="button" variant="ghost"><MonitorPlay size={18} />Đổi ảnh lớp</Button>
          </div>
          <Field label="🏫 Tên lớp"><Input value={draft.className} onChange={(e) => setDraft({ ...draft, className: e.target.value })} /></Field>
          <Field label="👩‍🏫 Tên giáo viên"><Input value={draft.teacherName} onChange={(e) => setDraft({ ...draft, teacherName: e.target.value })} /></Field>
          <Field label="📅 Năm học"><Input value={draft.schoolYear} onChange={(e) => setDraft({ ...draft, schoolYear: e.target.value })} /></Field>
          <Button type="submit" className="w-full"><Sparkles size={18} />Lưu thay đổi</Button>
        </form>
      </Card>
    </Page>
  );
}

function OnboardingPage() {
  const { updateClassroomSettings } = useAppData();
  const [draft, setDraft] = useState({ id: "classroom-settings", className: "", teacherName: "", schoolYear: "" });
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-2xl bg-white/95">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#7c5cff]">🎉 Chào mừng đến với Lớp Học Vui!</p>
          <h1 className="mt-2 text-3xl font-black text-[#273055]">Hãy thiết lập lớp học của bạn trước nhé!</h1>
        </div>
        <form className="mt-6 grid gap-4" onSubmit={(e) => { e.preventDefault(); updateClassroomSettings(draft); }}>
          <Field label="🏫 Tên lớp"><Input value={draft.className} onChange={(e) => setDraft({ ...draft, className: e.target.value })} /></Field>
          <Field label="👩‍🏫 Tên giáo viên"><Input value={draft.teacherName} onChange={(e) => setDraft({ ...draft, teacherName: e.target.value })} /></Field>
          <Field label="📅 Năm học"><Input value={draft.schoolYear} onChange={(e) => setDraft({ ...draft, schoolYear: e.target.value })} /></Field>
          <Button type="submit" className="w-full"><Rocket size={18} />Bắt đầu</Button>
        </form>
      </Card>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, action }: { icon: LucideIcon; title: string; action?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#f3efff] text-[#7c5cff]"><Icon size={20} /></div>
        <h3 className="text-lg font-black tracking-wide text-[#6a4feb]">{title}</h3>
      </div>
      {action ? <span className="text-sm font-black text-[#7c5cff]">{action}</span> : null}
    </div>
  );
}

function PageHeading({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#7c5cff]">Lớp học</p>
        <h1 className="mt-1 text-3xl font-black text-[#273055] md:text-5xl">{title}</h1>
        <p className="mt-2 max-w-3xl font-semibold text-[#6a6f91]">{description}</p>
      </div>
      {action}
    </header>
  );
}

function Mascot({ side }: { side: "left" | "right" }) {
  return (
    <div className={`relative flex ${side === "left" ? "justify-end" : "justify-start"} pt-6`}>
      <div className="grid h-40 w-40 place-items-center rounded-[38%] bg-white/70 text-7xl shadow-[0_20px_40px_rgba(93,67,201,0.12)]">{side === "left" ? "🧒" : "👧"}</div>
      <div className="absolute top-2 text-3xl">{side === "left" ? "🏆" : "🎁"}</div>
    </div>
  );
}

function StudentPreviewCard({ student }: { student: Student }) {
  return (
    <div className="grid justify-items-center rounded-[1.4rem] border border-[#edf0ff] bg-[#fbfbff] p-4 text-center shadow-[0_8px_18px_rgba(51,52,96,0.05)]">
      <Avatar name={student.name} size="md" />
      <p className="mt-3 font-black text-[#ff4f72]">{student.name}</p>
      <p className="text-sm font-semibold text-[#6a6f91]">{student.gender === "female" ? "Nữ" : "Nam"} • {student.dateOfBirth ?? "15/03/2016"}</p>
      <Badge className="mt-2 bg-[#fff0f7] text-[#d0477f]">{teamNameFallback(student.teamId)}</Badge>
      <p className="mt-3 font-black text-[#ff9a00]">⭐ {student.points} điểm</p>
    </div>
  );
}

function LeaderboardRow({ student, rank }: { student: Student; rank: number }) {
  const rankTone = rank === 1 ? "bg-[#fff1c2] text-[#b27c00]" : rank === 2 ? "bg-[#eef1f8] text-[#78819f]" : rank === 3 ? "bg-[#ffe2c7] text-[#c96e2f]" : "bg-[#f4f6ff] text-[#69739a]";
  return (
    <div className="flex items-center gap-3 rounded-[1.2rem] border border-[#edf0ff] bg-white px-4 py-3">
      <div className={`grid h-10 w-10 place-items-center rounded-full font-black ${rankTone}`}>{rank}</div>
      <Avatar name={student.name} size="sm" />
      <div className="min-w-0">
        <p className="truncate font-black text-[#273055]">{student.name}</p>
        <p className="text-sm text-[#6a6f91]">{teamNameFallback(student.teamId)}</p>
      </div>
      <p className="ml-auto font-black text-[#ff9a00]">⭐ {student.points}</p>
    </div>
  );
}

function TeamCompetitionRow({ team, rank }: { team: Team; rank: number }) {
  const colors = ["#ff7f96", "#60d394", "#5b8cff", "#8f6bff"];
  const color = colors[(rank - 1) % colors.length];
  return (
    <div className="rounded-[1.2rem] border border-[#edf0ff] bg-[#fbfbff] p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-xl shadow-sm">🏆</div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-[#273055]">{team.name}</p>
          <div className="mt-3 h-3 rounded-full bg-[#eef1f8]">
            <div className="h-3 rounded-full" style={{ width: `${Math.min(100, (team.score / 60) * 100)}%`, background: color }} />
          </div>
        </div>
        <p className="font-black" style={{ color }}>⭐ {team.score}</p>
      </div>
    </div>
  );
}

function RecognitionPreview({ recognition, student, teacherName }: { recognition?: Recognition; student?: Student; teacherName: string }) {
  return (
    <div className="relative overflow-hidden rounded-[1.4rem] border border-[#fff0c7] bg-gradient-to-br from-[#fff7dc] via-white to-[#fff0f5] p-4">
      <div className="absolute right-3 top-3 text-4xl opacity-80">✨</div>
      <p className="font-black text-[#ff8a00]">HỌC SINH TÍCH CỰC</p>
      <div className="mt-4 flex items-center gap-3">
        <Avatar name={student?.name ?? "Nguyễn Minh Quân"} size="md" />
        <div>
          <p className="font-black text-[#273055]">{student?.name ?? "Nguyễn Minh Quân"}</p>
          <p className="text-sm font-semibold text-[#6a6f91]">{recognition?.message ?? `${teacherName} khen bạn rất tuyệt!`}</p>
        </div>
      </div>
    </div>
  );
}

function ActivityFeed({ items }: { items: { text: string; delta: string; positive: boolean; time: string }[] }) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div key={item.text} className="flex items-center gap-3 rounded-[1.2rem] bg-[#fbfbff] p-3">
          <div className={`font-black ${item.positive ? "text-emerald-600" : "text-rose-500"}`}>{item.delta}</div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[#273055]">{item.text}</p>
            <p className="text-sm text-[#7c82a3]">{item.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function GameCard({ title, icon: Icon }: { title: string; icon: LucideIcon }) {
  return (
    <Card className="grid min-h-52 place-items-center bg-white/90 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-[1.4rem] bg-[#f3efff] text-[#7c5cff]"><Icon size={30} /></div>
      <p className="mt-4 text-2xl font-black">{title}</p>
    </Card>
  );
}

function teamNameFallback(teamId: string | undefined) {
  return teamId ? `Tổ ${teamId.slice(-1)}` : "Tổ 1";
}

function teamName(teams: Team[], id: string | undefined, fallback: string) {
  return teams.find((team) => team.id === id)?.name ?? fallback;
}

function formatClassroomTitle(settings: { className: string; teacherName: string }) {
  return `${settings.className} - ${settings.teacherName}`;
}

function newStudent(): Student {
  return { id: createId("student"), name: "", points: 0, totalRewards: 0 };
}

export default function App() {
  return <Layout />;
}
