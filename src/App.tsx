import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import {
  Gift,
  GraduationCap,
  Home,
  Medal,
  Plus,
  Settings,
  Sparkles,
  Star,
  Trophy,
  Users,
  WandSparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { Avatar } from "./components/Avatar";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "./components/ui";
import { useAppData } from "./store/AppDataContext";
import type { PointAction, Recognition, Reward, Student, Team } from "./types/models";
import { createId } from "./utils/id";
import { readImageFile } from "./utils/images";
import { pickWithoutRepeat } from "./utils/randomSelection";

const nav = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/students", label: "Students", icon: GraduationCap },
  { to: "/teams", label: "Teams", icon: Users },
  { to: "/points", label: "Points", icon: Star },
  { to: "/rewards", label: "Rewards", icon: Gift },
  { to: "/recognition", label: "Recognition", icon: Medal },
  { to: "/lucky-wheel", label: "Lucky Wheel", icon: WandSparkles },
  { to: "/games", label: "Games", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },
];

const recognitionTypes = ["Student of the Day", "Excellent Progress", "Good Behavior", "Smart Answer", "Helpful Friend", "Great Improvement"];

function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="grid gap-6">
      {children}
    </motion.div>
  );
}

function Layout() {
  const { data } = useAppData();
  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="mx-auto grid max-w-[1500px] gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-[2.25rem] border-4 border-white/80 bg-white/80 p-4 shadow-[0_18px_0_rgba(124,92,255,0.10)] backdrop-blur">
          <div className="mb-5 flex items-center gap-3 rounded-[1.75rem] bg-[#fff0ad] p-3">
            <Avatar src={data.classroom.avatar} name={data.classroom.name} />
            <div>
              <p className="text-lg font-black text-[#29304d]">Chibi Classroom</p>
              <p className="font-bold text-[#74633a]">{data.classroom.name}</p>
            </div>
          </div>
          <nav className="grid gap-2">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `flex min-h-12 items-center gap-3 rounded-2xl px-4 font-extrabold transition hover:bg-[#eefaff] ${
                      isActive ? "bg-[#7c5cff] text-white shadow-[0_8px_0_#5d43c9]" : "text-[#4c557c]"
                    }`
                  }
                >
                  <Icon size={21} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 rounded-[2.25rem] border-4 border-white/70 bg-white/45 p-4 shadow-[0_18px_50px_rgba(41,48,77,0.10)] backdrop-blur lg:p-7">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/students/:id" element={<StudentProfilePage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/points" element={<PointsPage />} />
            <Route path="/rewards" element={<RewardsPage />} />
            <Route path="/recognition" element={<RecognitionPage />} />
            <Route path="/lucky-wheel" element={<LuckyWheelPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function Header({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-[1.5rem] bg-[#ffd86f] shadow-[0_8px_0_#e3b83f]">
          <Icon size={32} />
        </div>
        <div>
          <p className="font-black uppercase tracking-wide text-[#7c5cff]">Classroom Home</p>
          <h1 className="text-3xl font-black text-[#29304d] md:text-5xl">{title}</h1>
          <p className="mt-1 max-w-2xl text-lg font-semibold text-[#5e668b]">{description}</p>
        </div>
      </div>
      {action}
    </header>
  );
}

function Dashboard() {
  const { data } = useAppData();
  const topStudents = [...data.students].sort((a, b) => b.points - a.points).slice(0, 3);
  const rankedTeams = [...data.teams].sort((a, b) => b.score - a.score);
  return (
    <Page>
      <section className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#8fd8ff] via-[#b89cff] to-[#ff9fd0] p-6 text-white shadow-[0_18px_0_rgba(124,92,255,0.22)]">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-xl font-black">Good morning, {data.classroom.name}!</p>
            <h1 className="mt-2 text-4xl font-black md:text-6xl">Ready for a bright class adventure?</h1>
            <p className="mt-3 text-lg font-bold text-white/90">{data.students.length} students, {data.teams.length} teams, lots of stars to win.</p>
          </div>
          <Avatar src={data.classroom.avatar} name={data.classroom.name} size="xl" />
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {nav.slice(3, 9).map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to}>
              <Card className="grid min-h-36 place-items-center text-center transition hover:-translate-y-1">
                <Icon className="text-[#7c5cff]" size={34} />
                <strong className="text-lg">{item.label}</strong>
              </Card>
            </Link>
          );
        })}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <h2 className="mb-4 text-2xl font-black">Top Students</h2>
          <div className="grid gap-3">
            {topStudents.map((student) => <StudentRow key={student.id} student={student} />)}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-2xl font-black">Team Ranking</h2>
          <div className="grid gap-3">
            {rankedTeams.map((team, index) => <TeamRank key={team.id} team={team} rank={index + 1} />)}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-2xl font-black">Recent Recognition</h2>
          <HistoryList items={data.recognitions.slice(0, 5).map((item) => `${item.title} - ${studentName(data.students, item.studentId)}`)} empty="No celebrations yet." />
        </Card>
      </div>
    </Page>
  );
}

function StudentsPage() {
  const { data, saveStudent, deleteStudent } = useAppData();
  const [draft, setDraft] = useState<Student>(newStudent());
  const edit = (student: Student) => setDraft(student);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    saveStudent(draft);
    setDraft(newStudent());
  };
  return (
    <Page>
      <Header icon={GraduationCap} title="Student Cards" description="Manage students, avatars, teams, roles, and teacher-only potential notes." />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card>
          <h2 className="mb-4 text-2xl font-black">{draft.name ? "Student Details" : "Add Student"}</h2>
          <form className="grid gap-3" onSubmit={submit}>
            <Field label="Name"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></Field>
            <Field label="Avatar"><ImagePicker onImage={(avatar) => setDraft({ ...draft, avatar })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date of birth"><Input type="date" value={draft.dateOfBirth ?? ""} onChange={(e) => setDraft({ ...draft, dateOfBirth: e.target.value })} /></Field>
              <Field label="Gender"><Select value={draft.gender ?? ""} onChange={(e) => setDraft({ ...draft, gender: e.target.value as Student["gender"] || undefined })}><option value="">Not set</option><option value="male">Male</option><option value="female">Female</option></Select></Field>
            </div>
            <Field label="Team"><Select value={draft.teamId ?? ""} onChange={(e) => setDraft({ ...draft, teamId: e.target.value || undefined })}><option value="">No team</option>{data.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</Select></Field>
            <Field label="Previous class"><Input value={draft.previousClass ?? ""} onChange={(e) => setDraft({ ...draft, previousClass: e.target.value })} /></Field>
            <Field label="Classroom role"><Input value={draft.classroomRole ?? ""} onChange={(e) => setDraft({ ...draft, classroomRole: e.target.value })} /></Field>
            <Field label="Previous achievements"><Textarea value={draft.previousAchievements ?? ""} onChange={(e) => setDraft({ ...draft, previousAchievements: e.target.value })} /></Field>
            <Field label="Potential note"><Textarea value={draft.potentialNote ?? ""} onChange={(e) => setDraft({ ...draft, potentialNote: e.target.value })} /></Field>
            <div className="flex gap-3"><Button type="submit"><Plus size={20} />Save Student</Button><Button type="button" variant="ghost" onClick={() => setDraft(newStudent())}>Clear</Button></div>
          </form>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          {data.students.map((student) => (
            <Card key={student.id} className="grid gap-4">
              <div className="flex items-center gap-4">
                <Avatar src={student.avatar} name={student.name} size="lg" />
                <div>
                  <h3 className="text-2xl font-black">{student.name}</h3>
                  <Badge>{student.points} stars</Badge>
                  <p className="mt-2 font-bold text-[#687092]">{teamName(data.teams, student.teamId)}</p>
                </div>
              </div>
              <p className="rounded-2xl bg-[#fff7db] p-3 font-semibold text-[#5e668b]">{student.potentialNote || "No teacher note yet."}</p>
              <div className="flex flex-wrap gap-2">
                <Link to={`/students/${student.id}`}><Button size="sm" variant="mint">View Profile</Button></Link>
                <Button size="sm" variant="ghost" onClick={() => edit(student)}>Edit</Button>
                <Button size="sm" variant="danger" onClick={() => deleteStudent(student.id)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Page>
  );
}

function StudentProfilePage() {
  const { id } = useParams();
  const { data } = useAppData();
  const student = data.students.find((item) => item.id === id);
  if (!student) return <Page><Card>Student not found.</Card></Page>;
  return (
    <Page>
      <Header icon={GraduationCap} title={student.name} description="A collectible-style student profile with progress, rewards, recognition, and teacher notes." />
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card className="text-center">
          <div className="flex justify-center"><Avatar src={student.avatar} name={student.name} size="xl" /></div>
          <h2 className="mt-4 text-4xl font-black">{student.name}</h2>
          <p className="mt-2 text-5xl font-black text-[#7c5cff]">{student.points}</p>
          <Badge>Current points</Badge>
          <div className="mt-5 grid gap-2 text-left font-bold text-[#5e668b]">
            <p>Team: {teamName(data.teams, student.teamId)}</p>
            <p>Role: {student.classroomRole || "Not set"}</p>
            <p>Gender: {student.gender || "Not set"}</p>
            <p>Birthday: {student.dateOfBirth || "Not set"}</p>
            <p>Previous class: {student.previousClass || "Not set"}</p>
          </div>
        </Card>
        <div className="grid gap-5">
          <Card><h3 className="text-2xl font-black">Achievements</h3><p className="mt-2 font-semibold">{student.previousAchievements || "No previous achievements recorded."}</p></Card>
          <Card><h3 className="text-2xl font-black">Teacher Notes</h3><p className="mt-2 font-semibold">{student.potentialNote || "No potential note recorded."}</p></Card>
          <Card><h3 className="mb-3 text-2xl font-black">Activity History</h3><HistoryList items={[
            ...data.pointHistory.filter((item) => item.studentId === student.id).map((item) => `${item.points > 0 ? "+" : ""}${item.points} ${item.actionName}`),
            ...data.rewardHistory.filter((item) => item.studentId === student.id).map((item) => `Redeemed ${item.rewardName} for ${item.pointsSpent} points`),
            ...data.recognitions.filter((item) => item.studentId === student.id).map((item) => `Recognition: ${item.title}`),
          ]} empty="No activity yet." /></Card>
        </div>
      </div>
    </Page>
  );
}

function TeamsPage() {
  const { data, saveTeam, deleteTeam, updateTeamScore, resetTeamScore } = useAppData();
  const [draft, setDraft] = useState<Team>({ id: createId("team"), name: "", score: 0 });
  return (
    <Page>
      <Header icon={Users} title="Team Competition" description="Create friendly teams, assign students, and run projector-ready score battles." />
      <Card>
        <form className="grid gap-3 md:grid-cols-[1fr_auto_auto]" onSubmit={(e) => { e.preventDefault(); saveTeam(draft); setDraft({ id: createId("team"), name: "", score: 0 }); }}>
          <Input placeholder="Team name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
          <ImagePicker onImage={(avatar) => setDraft({ ...draft, avatar })} />
          <Button type="submit">Save Team</Button>
        </form>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...data.teams].sort((a, b) => b.score - a.score).map((team, index) => (
          <Card key={team.id}>
            <div className="flex items-center gap-4"><Avatar src={team.avatar} name={team.name} size="lg" /><div><Badge>Rank {index + 1}</Badge><h2 className="text-3xl font-black">{team.name}</h2><p className="text-5xl font-black text-[#ff8f70]">{team.score}</p></div></div>
            <p className="my-4 font-bold text-[#5e668b]">Members: {data.students.filter((s) => s.teamId === team.id).map((s) => s.name).join(", ") || "No members yet"}</p>
            <div className="flex flex-wrap gap-2"><Button size="sm" variant="mint" onClick={() => updateTeamScore(team.id, 1)}>+1</Button><Button size="sm" variant="sunny" onClick={() => updateTeamScore(team.id, 5)}>+5</Button><Button size="sm" variant="peach" onClick={() => updateTeamScore(team.id, -1)}>-1</Button><Button size="sm" variant="ghost" onClick={() => resetTeamScore(team.id)}>Reset</Button><Button size="sm" variant="danger" onClick={() => deleteTeam(team.id)}>Delete</Button></div>
          </Card>
        ))}
      </div>
    </Page>
  );
}

function LeaderboardPage() {
  const { data } = useAppData();
  return (
    <Page>
      <div className="rounded-[3rem] bg-gradient-to-br from-[#ffd86f] via-[#ff9fd0] to-[#8fd8ff] p-8 text-center shadow-[0_18px_0_rgba(124,92,255,0.18)]">
        <Trophy className="mx-auto" size={64} />
        <h1 className="mt-3 text-5xl font-black">Team Leaderboard</h1>
        <div className="mt-8 grid gap-4">
          {[...data.teams].sort((a, b) => b.score - a.score).map((team, index) => <TeamRank key={team.id} team={team} rank={index + 1} big />)}
        </div>
      </div>
    </Page>
  );
}

function PointsPage() {
  const { data, savePointAction, deletePointAction, applyPoints } = useAppData();
  const [studentId, setStudentId] = useState(data.students[0]?.id ?? "");
  const [draft, setDraft] = useState<PointAction>({ id: createId("action"), name: "", points: 1, type: "reward" });
  return (
    <Page>
      <Header icon={Star} title="Points & Behavior" description="Quickly reward participation or record soft penalties with history." />
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Card className="grid gap-4">
          <Field label="Choose student"><Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>{data.students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <div className="grid gap-3">{data.pointActions.map((action) => <Button key={action.id} variant={action.points > 0 ? "mint" : "peach"} onClick={() => applyPoints(studentId, action)} disabled={!studentId}>{action.points > 0 ? "+" : ""}{action.points} {action.name}</Button>)}</div>
        </Card>
        <Card>
          <h2 className="mb-4 text-2xl font-black">Configurable Actions</h2>
          <form className="mb-5 grid gap-3 md:grid-cols-[1fr_120px_150px_auto]" onSubmit={(e) => { e.preventDefault(); savePointAction(draft); setDraft({ id: createId("action"), name: "", points: 1, type: "reward" }); }}>
            <Input placeholder="Action name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
            <Input type="number" value={draft.points} onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })} />
            <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as PointAction["type"] })}><option value="reward">Reward</option><option value="penalty">Penalty</option></Select>
            <Button type="submit">Save</Button>
          </form>
          <div className="grid gap-2">{data.pointActions.map((action) => <div key={action.id} className="flex items-center justify-between rounded-2xl bg-white p-3 font-bold"><span>{action.name} ({action.points})</span><Button size="sm" variant="danger" onClick={() => deletePointAction(action.id)}>Delete</Button></div>)}</div>
        </Card>
      </div>
      <Card><h2 className="mb-3 text-2xl font-black">Point History</h2><HistoryList items={data.pointHistory.slice(0, 12).map((item) => `${studentName(data.students, item.studentId)}: ${item.points > 0 ? "+" : ""}${item.points} ${item.actionName}`)} empty="No point changes yet." /></Card>
    </Page>
  );
}

function RewardsPage() {
  const { data, saveReward, deleteReward, redeemReward } = useAppData();
  const [studentId, setStudentId] = useState(data.students[0]?.id ?? "");
  const [draft, setDraft] = useState<Reward>({ id: createId("reward"), name: "", requiredPoints: 10 });
  return (
    <Page>
      <Header icon={Gift} title="Rewards & Gifts" description="Create collectible rewards students can redeem with their points." />
      <Card>
        <form className="grid gap-3 md:grid-cols-[1fr_140px_1fr_auto_auto]" onSubmit={(e) => { e.preventDefault(); saveReward(draft); setDraft({ id: createId("reward"), name: "", requiredPoints: 10 }); }}>
          <Input placeholder="Reward name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
          <Input type="number" value={draft.requiredPoints} onChange={(e) => setDraft({ ...draft, requiredPoints: Number(e.target.value) })} />
          <Input placeholder="Description" value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <ImagePicker onImage={(image) => setDraft({ ...draft, image })} />
          <Button type="submit">Save</Button>
        </form>
      </Card>
      <Field label="Redeem for student"><Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>{data.students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.points} pts)</option>)}</Select></Field>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{data.rewards.map((reward) => <Card key={reward.id} className="grid gap-3"><Avatar src={reward.image} name={reward.name} size="lg" /><h2 className="text-2xl font-black">{reward.name}</h2><Badge>{reward.requiredPoints} points</Badge><p className="font-semibold text-[#5e668b]">{reward.description}</p><Button variant="sunny" onClick={() => { if (redeemReward(studentId, reward)) confetti(); }}>Redeem</Button><Button variant="danger" size="sm" onClick={() => deleteReward(reward.id)}>Delete</Button></Card>)}</div>
    </Page>
  );
}

function RecognitionPage() {
  const { data, addRecognition } = useAppData();
  const [studentId, setStudentId] = useState(data.students[0]?.id ?? "");
  const [type, setType] = useState(recognitionTypes[0]);
  const [message, setMessage] = useState("");
  const [latest, setLatest] = useState<Recognition | null>(null);
  const student = data.students.find((item) => item.id === (latest?.studentId ?? studentId));
  return (
    <Page>
      <Header icon={Medal} title="Recognition Ceremony" description="Celebrate students with a fullscreen-friendly praise screen." />
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Card>
          <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); const saved = addRecognition({ studentId, type, title: type, message }); setLatest(saved); setMessage(""); confetti({ particleCount: 140, spread: 90 }); }}>
            <Field label="Student"><Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>{data.students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
            <Field label="Recognition type"><Select value={type} onChange={(e) => setType(e.target.value)}>{recognitionTypes.map((item) => <option key={item}>{item}</option>)}</Select></Field>
            <Field label="Message"><Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Great participation today!" /></Field>
            <Button type="submit">Celebrate</Button>
          </form>
        </Card>
        <Card className="min-h-[520px] bg-gradient-to-br from-[#fff0ad] via-[#ffe0f0] to-[#e4dcff] text-center">
          <Sparkles className="mx-auto text-[#7c5cff]" size={54} />
          <p className="mt-4 text-2xl font-black text-[#7c5cff]">Congratulations</p>
          <h2 className="text-5xl font-black">{latest?.title ?? type}</h2>
          {student ? <div className="mt-8 flex flex-col items-center gap-4"><Avatar src={student.avatar} name={student.name} size="xl" /><h3 className="text-5xl font-black">{student.name}</h3><p className="max-w-2xl text-2xl font-bold text-[#5e668b]">{latest?.message || message || "Great progress today!"}</p></div> : null}
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
    confetti({ particleCount: 120, spread: 100 });
  };
  return (
    <Page>
      <Header icon={WandSparkles} title="Lucky Wheel" description="Spin a colorful no-repeat student selector for classroom activities." action={<Button size="lg" onClick={spin}>Spin Wheel</Button>} />
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card className="grid min-h-[560px] place-items-center overflow-hidden bg-gradient-to-br from-[#8fd8ff] via-[#fff0ad] to-[#ff9fd0]">
          <motion.div animate={{ rotate: winner ? 1440 : 0 }} transition={{ duration: 1.4, ease: "easeOut" }} className="grid h-[min(72vw,520px)] w-[min(72vw,520px)] place-items-center rounded-full border-[18px] border-white bg-conic-gradient shadow-[0_20px_0_rgba(41,48,77,0.14)]">
            <div className="rounded-full bg-white/90 p-8 text-center"><WandSparkles className="mx-auto text-[#7c5cff]" size={48} /><p className="mt-2 text-3xl font-black">Spin!</p></div>
          </motion.div>
        </Card>
        <Card className="grid place-items-center text-center">
          <AnimatePresence mode="wait">
            {winner ? <motion.div key={winner.id} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="grid justify-items-center gap-4"><Badge>Today's Lucky Student</Badge><Avatar src={winner.avatar} name={winner.name} size="xl" /><h2 className="text-5xl font-black">{winner.name}</h2><p className="text-xl font-bold text-[#5e668b]">{teamName(data.teams, winner.teamId)}</p></motion.div> : <p className="text-2xl font-black">Ready to pick a student?</p>}
          </AnimatePresence>
        </Card>
      </div>
    </Page>
  );
}

function GamesPage() {
  const { data, applyPoints, setWheelStudentBag } = useAppData();
  const [selected, setSelected] = useState<Student | undefined>();
  const pick = () => { const result = pickWithoutRepeat(data.students, data.wheelStudentBag); setSelected(result.selected); setWheelStudentBag(result.nextBag); };
  const correctAction = data.pointActions.find((a) => a.points > 0) ?? { id: "quick-correct", name: "Quick Answer Correct", points: 1, type: "reward" as const };
  return (
    <Page>
      <Header icon={Sparkles} title="Random Student Games" description="Simple projector-friendly games powered by random student selection." action={<Button onClick={pick}>Pick Student</Button>} />
      <div className="grid gap-5 xl:grid-cols-3">
        {["Random Student", "Quick Answer", "Who Is Next?"].map((game) => <Card key={game} className="min-h-72 text-center"><h2 className="text-3xl font-black">{game}</h2><p className="mt-3 font-bold text-[#5e668b]">{game === "Quick Answer" ? "Pick a student, then mark correct or skip." : "Cycle through names and reveal a lucky classmate."}</p></Card>)}
      </div>
      <Card className="grid justify-items-center gap-4 bg-gradient-to-br from-[#e4dcff] to-[#eefaff] text-center">
        {selected ? <><Avatar src={selected.avatar} name={selected.name} size="xl" /><h2 className="text-5xl font-black">{selected.name}</h2><p className="text-xl font-bold">{teamName(data.teams, selected.teamId)}</p><div className="flex flex-wrap justify-center gap-3"><Button variant="mint" onClick={() => applyPoints(selected.id, correctAction)}>Correct +{correctAction.points}</Button><Button variant="ghost" onClick={pick}>Skip</Button></div></> : <h2 className="text-4xl font-black">Start a game to choose a student.</h2>}
      </Card>
    </Page>
  );
}

function SettingsPage() {
  const { data, updateClassroom } = useAppData();
  const [draft, setDraft] = useState(data.classroom);
  return (
    <Page>
      <Header icon={Settings} title="Classroom Settings" description="Customize the local classroom identity shown across the app." />
      <Card>
        <form className="grid gap-4 max-w-2xl" onSubmit={(e) => { e.preventDefault(); updateClassroom(draft); }}>
          <div className="flex items-center gap-4"><Avatar src={draft.avatar} name={draft.name} size="lg" /><ImagePicker onImage={(avatar) => setDraft({ ...draft, avatar })} /></div>
          <Field label="Classroom name"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></Field>
          <Field label="School year"><Input value={draft.schoolYear ?? ""} onChange={(e) => setDraft({ ...draft, schoolYear: e.target.value })} /></Field>
          <Button type="submit">Save Classroom</Button>
        </form>
      </Card>
    </Page>
  );
}

function StudentRow({ student }: { student: Student }) {
  return <Link to={`/students/${student.id}`} className="flex items-center gap-3 rounded-2xl bg-white p-3"><Avatar src={student.avatar} name={student.name} size="sm" /><strong>{student.name}</strong><Badge className="ml-auto">{student.points}</Badge></Link>;
}

function TeamRank({ team, rank, big = false }: { team: Team; rank: number; big?: boolean }) {
  return <div className={`flex items-center gap-4 rounded-[1.5rem] bg-white/85 p-4 ${big ? "text-3xl" : ""}`}><Badge>#{rank}</Badge><Avatar src={team.avatar} name={team.name} size={big ? "lg" : "sm"} /><strong className="mr-auto">{team.name}</strong><span className="font-black text-[#ff8f70]">{team.score}</span></div>;
}

function HistoryList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="rounded-2xl bg-white p-4 font-bold text-[#687092]">{empty}</p>;
  return <div className="grid gap-2">{items.map((item, index) => <p key={`${item}-${index}`} className="rounded-2xl bg-white p-3 font-bold text-[#4c557c]">{item}</p>)}</div>;
}

function ImagePicker({ onImage }: { onImage: (image: string) => void }) {
  return <label className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-4 font-bold shadow-[0_6px_0_rgba(41,48,77,0.12)]"><Plus size={18} />Upload image<input className="hidden" type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (file) onImage(await readImageFile(file)); }} /></label>;
}

function newStudent(): Student {
  return { id: createId("student"), name: "", points: 0, totalRewards: 0 };
}

function studentName(students: Student[], id: string) {
  return students.find((student) => student.id === id)?.name ?? "Unknown student";
}

function teamName(teams: Team[], id?: string) {
  return teams.find((team) => team.id === id)?.name ?? "No team";
}

export default function App() {
  return <Layout />;
}
