# Project Scope: Local Classroom Management

## Overview

This project is a local-first classroom management and gamification application for a teacher to use during class.

The application represents one classroom and runs entirely in the browser. There is no backend, authentication, API, or cloud infrastructure at this stage. All data persists locally on the teacher's device.

## Technology Stack

- React
- Vite
- TypeScript
- React Router
- Tailwind CSS for styling
- shadcn/ui for reusable UI components
- localStorage for structured persistence
- IndexedDB may be used for uploaded images if localStorage becomes impractical
- Lucide React for icons
- Framer Motion for animations
- canvas-confetti for celebration effects

Do not use Redux or unnecessary state management libraries.

Do not use:

- Material UI
- Ant Design
- Bootstrap
- CSS Modules

## Product Principles

- Keep the project simple, maintainable, and pragmatic.
- Make the experience friendly, colorful, playful, and suitable for elementary school students.
- Prioritize large text, clear controls, and fast teacher interactions.
- Make key screens suitable for TV or projector display.
- Make student avatars visually important.
- Keep teacher-only notes private from public presentation screens.

## Core Features

### 1. Classroom Settings

Teachers can customize:

- Classroom name
- Classroom avatar or uploaded image
- Optional school year

```ts
interface Classroom {
  id: string;
  name: string;
  avatar?: string;
  schoolYear?: string;
}
```

Classroom information must persist locally.

### 2. Student Management

Teachers can add, edit, delete, and view detailed student profiles.

```ts
interface Student {
  id: string;
  name: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: "male" | "female";
  previousClass?: string;
  previousAchievements?: string;
  classroomRole?: string;
  potentialNote?: string;
  teamId?: string;
  points: number;
  totalRewards?: number;
}
```

Student profiles should display:

- Large avatar
- Name
- Date of birth
- Gender
- Previous class
- Previous achievements
- Classroom role
- Teacher notes about student potential
- Current points
- Team

Potential notes are free text for teacher use only, such as strengths, confidence, creativity, leadership potential, or areas for improvement.

### 3. Points System

Each student has a current point balance. Teachers can quickly add or subtract points using configurable actions.

Default positive examples:

- Answer correctly: +1
- Good participation: +1
- Help a classmate: +2
- Excellent performance: +5

Default negative examples:

- Swearing: -5
- Fighting: -10
- Not paying attention: -3

```ts
interface PointAction {
  id: string;
  name: string;
  points: number;
  type: "reward" | "penalty";
  icon?: string;
}

interface PointHistory {
  id: string;
  studentId: string;
  actionId?: string;
  actionName: string;
  points: number;
  createdAt: string;
  note?: string;
}
```

Every point change must create a history record. Student profiles must show point history.

### 4. Rewards And Gifts

Teachers can define rewards students redeem with points.

```ts
interface Reward {
  id: string;
  name: string;
  image?: string;
  description?: string;
  requiredPoints: number;
}

interface RewardHistory {
  id: string;
  studentId: string;
  rewardId: string;
  rewardName: string;
  pointsSpent: number;
  createdAt: string;
}
```

Teachers can add, edit, delete, upload images for, and set point costs for rewards. Redeeming a reward deducts points and records reward history.

### 5. Team Competition

Teachers can create teams, rename teams, change team avatars, and assign students.

```ts
interface Team {
  id: string;
  name: string;
  avatar?: string;
  score: number;
}
```

Team views should show:

- Team avatar
- Team name
- Members
- Current score
- Ranking

Quick actions:

- +1
- +5
- -1
- Reset score

Add a projector-friendly leaderboard and presentation mode.

### 6. Lucky Wheel

The Lucky Wheel initially supports random student selection and should be designed to support teams, rewards, and activities later.

```ts
type LuckyWheelMode = "student" | "team" | "reward" | "activity";
```

Requirements:

- Display student names and/or avatars
- Use a spinning animation
- Show a clear winner
- Avoid selecting the same student repeatedly until others have had a chance
- Use a reusable random selection utility

### 7. Random Student Games

Create a Games section with a simple, extensible structure.

Initial games:

- Random Student: randomly select a student with a fun animation and show avatar, name, and team.
- Quick Answer: start a round, select a student, then allow correct, incorrect, or skip. Correct answers add points.
- Who Is Next: rapidly cycle through student avatars and names before selecting one.

Suggested structure:

```text
src/features/games/
├── RandomStudentGame/
├── QuickAnswerGame/
└── WhoIsNextGame/
```

Do not over-engineer the game architecture.

### 8. Student Recognition

Teachers can recognize students for achievements or positive behavior.

Example recognition types:

- Student of the Day
- Excellent Progress
- Good Behavior
- Smart Answer
- Helpful Friend
- Great Improvement

```ts
interface Recognition {
  id: string;
  studentId: string;
  type: string;
  title: string;
  message?: string;
  createdAt: string;
}
```

Teachers can select a student, choose a recognition type, add a custom message, and save it. Recognition presentation mode should look attractive when shown to the whole class.

### 9. Student Profile

Student profiles should help teachers quickly understand progress.

Sections:

- Basic Information: avatar, name, date of birth, gender, previous class
- Achievements: previous achievements, recognitions, rewards received
- Classroom: team, classroom role, current points
- Teacher Notes: potential, strengths, areas to improve, free text notes
- Activity History: point history, penalty history, reward history, recognition history

### 10. Dashboard

The dashboard provides a classroom overview:

- Classroom avatar and name
- Total students
- Current team rankings
- Top students by points
- Recent recognitions
- Quick actions

Quick actions:

- Lucky Wheel
- Games
- Add Points
- Recognition
- Rewards
- Teams

### 11. Navigation

Suggested navigation:

```text
Dashboard

Classroom
├── Students
├── Teams
└── Classroom Settings

Activities
├── Lucky Wheel
├── Games
└── Recognition

Gamification
├── Points
├── Rewards
└── Leaderboard
```

Keep navigation simple and avoid too many nested levels.

## Data Persistence

Use localStorage for all structured application data. Create reusable hooks or a small storage service to avoid duplicated localStorage logic.

Suggested organization:

```text
src/
├── hooks/
│   └── useLocalStorage.ts
│
├── services/
│   └── storage/
│       ├── classroomStorage.ts
│       ├── studentStorage.ts
│       ├── teamStorage.ts
│       └── rewardStorage.ts
```

It is acceptable to simplify this if a single storage layer is easier to maintain.

All data must persist after refreshing, closing, and reopening the application.

## Image Storage

Support uploads for:

- Classroom avatar
- Student avatar
- Team avatar
- Reward image

Store small images locally. If localStorage becomes problematic for images, use IndexedDB for image data while keeping structured data simple.

Do not add a backend.

## Suggested Project Structure

Use feature-based organization where appropriate.

```text
src/
├── components/
│   ├── ui/
│   ├── layout/
│   └── common/
│
├── features/
│   ├── classroom/
│   ├── students/
│   ├── teams/
│   ├── points/
│   ├── rewards/
│   ├── lucky-wheel/
│   ├── games/
│   └── recognition/
│
├── pages/
├── hooks/
├── services/
├── types/
├── utils/
├── App.tsx
└── main.tsx
```

Avoid unnecessary layers such as repositories, domain services, use cases, or enterprise-style architecture.

## Visual Design: Cute Chibi Classroom Theme

The application must have a cute, playful, modern Chibi Classroom visual style. This is a main product requirement, not a decorative afterthought.

The application should not look like:

- An enterprise dashboard
- A corporate admin panel
- A traditional school management system
- A plain CRUD application
- A generic Bootstrap-style application

Instead, it should feel like a fun and interactive digital classroom for elementary school students and teachers.

### Overall Design Direction

Visual inspiration:

- Cute chibi characters
- Children's educational games
- Modern classroom apps
- Soft rounded UI
- Playful gamification
- Friendly and colorful interfaces
- Sticker-like cards and elements
- Cartoon classroom atmosphere

The design should remain clean and usable. Avoid making the UI too childish, cluttered, or visually chaotic. The teacher must be able to use the application quickly during class.

Design keywords:

- Cute
- Chibi
- Friendly
- Playful
- Colorful
- Rounded
- Soft
- Cheerful
- Modern
- Interactive
- Gamified

### Color System

Use a soft, cheerful color palette with pastel or bright-but-soft colors.

Preferred directions:

- Sky blue
- Soft purple
- Warm yellow
- Peach or orange
- Light pink
- Mint green

Avoid:

- Large areas of dark gray
- Corporate blue-only dashboards
- Harsh colors
- Too many competing colors

Use colors consistently for semantic meaning:

- Positive points: cheerful green
- Rewards: yellow or gold
- Recognition: purple or gold
- Team competition: friendly team accent colors
- Penalties: soft red without aggressive or scary styling

### UI Components

Major UI components should use rounded, friendly styling.

Cards should have:

- Large rounded corners
- Soft shadows
- Spacious padding
- Optional decorative elements
- Slight hover animation where appropriate

Cards should feel like physical game cards or stickers.

Buttons should:

- Use rounded corners or pill-like shapes
- Be large enough for quick teacher interaction
- Use clear Lucide React icons
- Provide playful hover and press feedback

Important quick actions such as `+1`, `+5`, `-1`, `Start`, `Pick Student`, and `Spin` should be visually prominent.

Icons should be large, friendly, easy to understand, and not overused.

### Student Avatars

Student avatars are important visual elements.

Each student should have:

- A circular or rounded avatar
- A decorative border or frame
- Clear display on profile cards and presentation screens

When no custom avatar is uploaded, generate or assign a friendly placeholder based on the student name and, where appropriate, gender. The UI should make future custom chibi avatar support easy to add.

Do not implement AI avatar generation at this stage. Support uploaded photos and friendly placeholder avatars.

### Chibi Illustration Use

Use a consistent chibi or cartoon illustration style where decorative characters are helpful.

Possible uses:

- Empty states
- Congratulations screens
- Recognition screens
- Lucky Wheel results
- Reward screens

Examples:

- Cute chibi teacher
- Happy student
- Celebrating students
- Trophy celebration
- Gift box character

Do not use decorative illustrations everywhere. Use them selectively to improve emotional engagement.

### Dashboard Design

The dashboard should feel like a Classroom Home, not an admin panel.

Example sections:

- Classroom avatar and name
- Cute welcome area
- Quick action cards
- Top students
- Team ranking
- Recent recognition

The classroom header can include a friendly illustration or decorative background. It should feel welcoming, such as "Good morning, Class 2/7!"

### Student Profile Design

Student profiles should feel like collectible character cards.

The profile should emphasize:

- Large avatar
- Student name
- Current points
- Team
- Classroom role
- Strengths and teacher notes

The actual UI should be polished, spacious, colorful, and suitable for both teacher review and selective classroom display.

### Points Animation

Point changes should provide visual feedback.

When adding points, show an animated positive indicator such as `+5`. When subtracting points, show a softer negative indicator such as `-3`.

Avoid making negative actions visually harsh or humiliating when displayed publicly. Detailed penalty reasons should primarily remain in teacher views.

### Rewards Design

Rewards should look like collectible items.

Each reward card should include:

- Image
- Reward name
- Required points
- Cute badge or label

Use playful reward card styling.

### Team Competition Design

Teams should feel like game teams.

Each team should have:

- Team avatar or mascot
- Team name
- Score
- Rank

Use animated or visually engaging ranking changes where appropriate. The ranking screen should look exciting when projected in front of students.

### Lucky Wheel Design

The Lucky Wheel should be one of the most visually exciting screens.

Requirements:

- Large colorful wheel
- Student names or avatars
- Smooth spinning animation
- Clear pointer
- Confetti or celebration effect when a student is selected
- Fun result display with a large student avatar and name

### Recognition Screen Design

Recognition should feel like a celebration ceremony.

Possible effects:

- Confetti
- Stars
- Trophy visuals
- Sparkles
- Cute decorative illustrations

The screen must work well in fullscreen mode on a projector, with large readable text and a visually clear student focus.

### Animations

Use subtle and meaningful animations for:

- Card hover
- Button press
- Point increase and decrease
- Lucky Wheel spinning
- Ranking changes
- Confetti for rewards and recognition
- Smooth page transitions where appropriate

Do not animate everything. Animations should improve feedback, excitement, and classroom engagement. Respect `prefers-reduced-motion` where practical.

### Typography

Use friendly, highly readable typography.

Requirements:

- Correct support for Vietnamese characters
- Large readable headings
- Clear body text
- Good projector readability

Avoid overly decorative fonts for important information. If a playful display font is used, reserve it for headings. Body text must remain highly readable.

### Responsive Behavior

Primary targets:

1. Laptop
2. TV or projector
3. Tablet

Support fullscreen presentation mode.

In presentation mode:

- Hide unnecessary navigation
- Use very large text
- Maximize student names and avatars
- Prioritize visual impact

### Dark Mode

Do not prioritize dark mode in the initial version. The primary visual theme should be a bright, cheerful classroom. Structure the color system with CSS variables so dark mode can be added later if needed.

### UI Technology

Use the following UI stack:

- Tailwind CSS for styling
- shadcn/ui for reusable UI components
- Lucide React for icons
- Framer Motion for animations
- canvas-confetti for celebration effects

Do not use:

- Material UI
- Ant Design
- Bootstrap
- CSS Modules

Use shadcn/ui components as a foundation, but customize them heavily with Tailwind CSS. The final UI must not look like a generic shadcn dashboard or enterprise admin application.

### Tailwind Theme Architecture

Create a small design token system through Tailwind configuration and global CSS variables.

Use tokens for:

- Brand and accent colors
- Positive, reward, recognition, team, and penalty colors
- Border radius
- Shadows
- Spacing scale for large classroom-friendly controls
- Motion timing where appropriate

Do not hardcode random colors throughout the application. Use reusable Tailwind theme values, CSS variables, or a centralized theme configuration.

### Design Rule

Before implementing a new page or component, ask: "Would this look fun and engaging when displayed to an entire classroom?"

If the answer is no, improve the visual design.

The final application should feel like a cute, modern, gamified digital classroom dashboard with chibi-inspired visuals. It should not feel like an admin dashboard with colorful buttons.

## Implementation Order

### Phase 1

1. Project setup
2. App layout
3. Navigation
4. Classroom settings
5. Student management
6. Student profile

### Phase 2

1. Points system
2. Point history
3. Configurable point actions
4. Team management
5. Team leaderboard

### Phase 3

1. Rewards
2. Reward redemption
3. Recognition system
4. Recognition presentation screen

### Phase 4

1. Lucky Wheel
2. Random Student
3. Quick Answer game
4. Who Is Next game

## Code Quality Requirements

- Use TypeScript properly.
- Avoid `any`.
- Keep components focused.
- Reuse UI components where appropriate.
- Keep business logic out of large page components when possible.
- Use meaningful names.
- Avoid duplicated localStorage logic.
- Do not over-engineer.
- Do not add backend functionality.
- Do not add authentication.
- Do not add APIs.
- Do not add cloud services.

## Final Result

At completion, the teacher can:

1. Create and customize a classroom.
2. Add and manage students.
3. Maintain detailed student profiles.
4. Add and deduct points.
5. Configure positive and negative behavior actions.
6. Track point history.
7. Create teams and manage competition.
8. Create rewards and allow students to redeem them.
9. Recognize and praise students.
10. Randomly select students using a lucky wheel.
11. Play simple classroom games based on student selection.
12. Display key activities in fullscreen or presentation mode.

All data must persist locally without requiring a backend.
