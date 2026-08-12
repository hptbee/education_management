# Chibi Classroom Manager

A local-first classroom management and gamification app for teachers to use during class.

The app is designed for a single classroom and focuses on student profiles, classroom identity, points, rewards, team competition, recognition, random student selection, and simple classroom games. It uses a cute, playful, chibi-inspired visual style suitable for elementary students and projector display.

## Tech Stack

- React
- Vite
- TypeScript
- React Router
- Tailwind CSS
- shadcn/ui-inspired local UI components
- Lucide React
- Framer Motion
- canvas-confetti
- localStorage for persistence

## Constraints

- Local-first only
- No backend
- No authentication
- No APIs
- No cloud services
- No Redux or unnecessary state management libraries

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Current Features

- Classroom dashboard
- Classroom settings with avatar upload
- Student management
- Detailed student profile pages
- Configurable point actions
- Point history
- Team creation and scoring
- Projector-friendly leaderboard
- Reward creation and redemption
- Recognition ceremony screen
- Lucky Wheel random student selector
- Random student classroom games
- Local image uploads stored as data URLs
- English and Vietnamese UI language support

## Persistence

All structured app data is stored in `localStorage` under the browser profile. Data remains available after refreshes and browser restarts on the same device and browser.

Uploaded images are currently stored as local data URLs. If image size becomes a problem later, image storage can move to IndexedDB while keeping structured data in `localStorage`.

The selected UI language is also saved locally in `localStorage`.

## Project Scope

See [docs/PROJECT_SCOPE.md](./docs/PROJECT_SCOPE.md) for the full product requirements and implementation scope.
