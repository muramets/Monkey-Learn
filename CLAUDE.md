# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript compile + Vite bundle
npm run typecheck    # Type-check without emitting
npm run lint         # ESLint
npm run test:run     # Vitest single run
npm run test:watch   # Vitest watch mode
```

**Post-edit verification** (run after every change):
```bash
npm run typecheck && npm run lint
```

## Architecture

### Overview
A gamified self-development PWA — users track habits ("Protocols"), level up personal attributes ("Innerfaces/Powers"), and collaborate through Teams. Inspired by MonkeyType's design language.

### Stack
- **React 19** + TypeScript 5.9 (strict mode)
- **Vite 7** for build
- **Zustand 5** for client state (domain-sliced stores)
- **TanStack Query 5** for server state caching (staleTime: 60s)
- **Firebase 12** — Auth (Google), Firestore (real-time subscriptions)
- **Framer Motion** for animations (touch: slide transitions, desktop: instant)
- **Tailwind CSS 3** with CSS variable theming (100+ MonkeyType themes)
- **Radix UI** for accessible primitives (Dialog, Dropdown, Tabs, Tooltip, Popover)
- **@dnd-kit** for drag-and-drop (sortable lists)
- **Tiptap 3** for rich-text editing
- **FontAwesome 7** + **Lucide React** for icons

### Directory Layout
```
src/
  components/              # Reusable UI (Atomic Design)
    layout/                # Layout, Header, Navigation, AnimatedRoutes, ThemeController
    ui/atoms/              # Button, Card, AppIcon, Avatar, ProgressBar, Tooltip
    ui/molecules/          # Modal, Toast, Input, ColorPicker, IconPicker, GlobalLoader
    ui/organisms/          # EntitySelector
    ui/RichTextEditor/     # Custom Tiptap editor (components/, hooks/, utils/)
  contexts/                # React Context (Auth, Score, QueryProvider)
  stores/                  # Zustand stores
    metadataStore.ts       # Composed: protocols + innerfaces + states + groups slices
    metadata/              # Slice definitions and types
    historyStore.ts        # Check-in history (real-time Firestore)
    personalityStore.ts    # User personalities, stats
    planningStore.ts       # Weekly goals
    uiStore.ts             # Toast, overlays
    team/                  # Team, Role, Invite, RoleMembers stores
    StoreSync.tsx          # Subscription orchestration
  features/                # Feature modules (domain-scoped)
    dashboard/             # Main hub: StateCard, QuickActionCard, UserProfile, WeeklyFocus
    protocols/             # Habits/actions: ProtocolRow, ProtocolsList, useScores
    innerfaces/            # Powers/attributes: level, decay, grouping
    history/               # Activity feed with filtering, comments
    planning/              # Weekly goal setting
    teams/                 # Multiplayer collaboration
    personalities/         # Character system
    groups/                # Action grouping
    comments/              # Check-in comments overlay
  pages/                   # Route-level components
  hooks/                   # Global hooks (useSwipeNavigation, useTouchDevice, useSortableList)
  utils/                   # Pure functions (themeManager, xpUtils, colorUtils, markdownUtils)
  config/                  # Firebase config, admin list, icon registry
  constants/               # Navigation, common, DnD defaults
  types/                   # Shared TypeScript interfaces
  styles/                  # allThemes.ts (100+ MonkeyType themes, auto-generated)
  test/                    # Test setup
```

### State Management
- **Zustand stores** — domain-scoped, composed via slices. `metadataStore` combines 4 slices (protocols, innerfaces, states, groups)
- **React Context** — Auth, Score tracking, React Query client
- **StoreSync** orchestrates real-time Firestore subscriptions, scoped by `PathContext` (personality / role / viewer)
- **Optimistic UI** — local state updated immediately, Firestore write in background, rollback on failure
- **hasPendingWrites** flag prevents onSnapshot from overwriting in-flight optimistic state

### Data Flow
```
User Action → Hook (e.g., useScores.applyProtocol)
  ├─ Optimistic Update (Zustand store)
  ├─ Toast notification
  └─ Background Firestore write (transaction)
       └─ onSnapshot fires → Store update → Re-render
```

### Routing
| Route | Component | Access |
|-------|-----------|--------|
| `/login` | LoginPage | Public |
| `/invite/:code` | JoinInvitePage | Public |
| `/` | Dashboard | Private |
| `/actions` | ProtocolsList | Private |
| `/skills` | InnerfacesPage | Private (legacy `/powers` redirects) |
| `/history` | HistoryPage | Private |
| `/settings` | SettingsPage | Private (no nav) |

Page order for swipe navigation: `['/', '/actions', '/stats', '/skills', '/history', '/settings']`

Touch devices get Framer Motion slide animations (tween, 450ms). Desktop renders instantly.

### Theme System
CSS custom properties injected at runtime via `themeManager.ts`. 100+ themes from MonkeyType in `styles/allThemes.ts`. Tailwind maps: `bg-primary`, `text-primary`, `main`, `sub`, `sub-alt`, `error`, `correct`.

Z-index scale: `base(0)` → `sticky(100)` → `dropdown(200)` → `popover(300)` → `modal(400)` → `toast(500)`

## Working Rules

### Language
- Think and reason internally in English.
- All responses to the user must be in Russian with English technical terminology preserved (component names, library names, CLI commands, etc.).

### Before Editing Code
- Always provide a brief overview in Russian before touching any code: what the issue is, why it exists, what changes will be made, and potential side effects.
- **Never commit or push without explicit user instruction.**
- For a feature — discuss its final state and how it integrates with existing functionality. For a refactor — discuss how it fits the overall app and where else the data/logic is used.

### After Editing Code
- Always run `npm run typecheck && npm run lint` after changes.
- Fix all lint/type errors following best practices — no hacks or workarounds.
- Run `npm run test:run` before declaring work complete. Lint/typecheck pass is NOT a substitute for passing tests.

### Separation of Concerns
- Hooks = I/O + orchestration only. Components = presentation only. Pure functions = separate files in `utils/`.
- When creating a new hook or component, immediately extract pure logic into a `utils` file. Never "write everything together and refactor later."
- One handler / hook / util = one file. When new functionality contains 2+ files of the same domain — immediately place them in a dedicated folder.

### Design System
- Prioritize existing design tokens from `src/components/ui/` and Tailwind config.
- If existing tokens are insufficient, extend the global design system — never hardcode values.
- All new UI must use CSS variables that respond to theme changes.

## Deeper Documentation

Detailed architecture, data model, and feature docs live in `docs/`:
- `docs/architecture.md` — Provider hierarchy, core patterns, data flow, component hierarchy
- `docs/data-model.md` — Firestore schema and entity relationships
- `docs/features/` — Per-feature documentation

## Agentic Task Documents

For multi-phase work requiring coordinated agent execution across sessions, create a **task document** in `docs/tasks/`. The task doc is the orchestration blueprint — optimized for agents that may lose context between sessions.

### Required sections (in order):

**1. Quick Context Recovery** (top of file)
- Ordered list of 3-5 files to read when context is lost
- Starts with the task doc itself, then key source files
- Agent reads these in order and recovers full context without asking questions

**2. Key Decisions (carry forward)**
- 3-7 critical architectural decisions that MUST survive context loss
- Each: what was decided + why (rejected alternative optional but valuable)
- These are the "if you forget everything else, remember THIS" items

**3. Agent Orchestration Strategy**
- Who is executor (main context) vs subagent (reviews, parallel work)
- Explicit statement: "Main context = executor + orchestrator"

**4. Phase Status Table** — one-line status per phase (TODO / IN PROGRESS / DONE)

**5. Current Test Count** — running total updated after every phase. Obtained by running `npm run test:run`, never copied from memory.

**6. Per-phase sections** — each phase contains:
- **Goal**: one sentence
- **Critical Context**: gotchas, prerequisites, warnings about traps
- **Tasks** with checkboxes: exact file paths to create/modify, edge cases to cover
- **Parallelization plan** (which tasks can run as parallel subagents):
  ```
  T1.1 — SEQUENTIAL FIRST (foundation)
  T1.2 + T1.3 + T1.4 — PARALLEL subagents
  T1.5 — SEQUENTIAL LAST (depends on above)
  ```
- **Verification**: exact shell commands to run
- **MANDATORY: Update this file before proceeding** — mark tasks, update status table, record test count

**7. Review Gates** — after each phase:
- Full prompt for review agent (specific questions, not just a checklist)
- "Fix all findings before moving to next phase"

**8. FINAL phase**: Double review-fix cycle (R1 Architecture + R2 Production Readiness)

### Separation: Feature Doc vs Task Doc
- **Feature doc** (`docs/features/`): business goal, user flow, roadmap, current state, technical details. Lives forever.
- **Task doc** (`docs/tasks/`): execution plan, phases, agent assignments, test counts, review gates. After completion, moved to `docs/archive/tasks/`.
- Feature doc = "what and why". Task doc = "how and in what order".

## Current Build State

**Bundle**: Single chunk — 2,337 KB min / 710 KB gzip (no code splitting). Vite warns about chunk size.

**Known performance issues** (as of March 2026):
- No `React.lazy()` / code splitting — all pages loaded eagerly in AnimatedRoutes.tsx
- Framer Motion: 10 nested `layout` animations per ProtocolRow (200 synchronous DOM reads for 20 items)
- `transition-all` used in ~94 places instead of specific transition properties
- `backdrop-blur` on overlays — expensive GPU operation on mobile Safari
- Global touch event listeners for swipe navigation (conflicts with DnD, scrolling)
- Touch detection logic duplicated (useTouchDevice.ts + AnimatedRoutes.tsx)
- allThemes.ts (2,439 lines) loaded eagerly
- Permanent `willChange: 'transform'` on root background div (intentional fix for compositing tint)
