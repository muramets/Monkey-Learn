# MonkeyLearn

A gamified personal development platform that turns life into an RPG. Users build digital characters ("Personalities"), track real-world attributes through "Powers" (skills/attributes), and level up via daily habits through "Actions" (protocols). The platform emphasizes community through Teams, Roles, and invite-based collaboration.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| UI Framework | React | 19.2 |
| Language | TypeScript | 5.9 |
| Bundler | Vite | 7.2 |
| State Management | Zustand | 5.0 |
| Backend | Firebase (Firestore, Auth, Storage, Functions) | 12.7 |
| Server State | React Query | 5.90 |
| Styling | TailwindCSS | 3.4 |
| UI Primitives | Radix UI (Dialog, Dropdown, Tabs, Tooltip, Popover) | — |
| Animation | Framer Motion | 12.27 |
| Rich Text | TipTap | 3.17 |
| Drag & Drop | @dnd-kit | 6.3 |
| Icons | FontAwesome 7.1 + Lucide React | — |

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | System design, patterns, data flow, component hierarchy |
| [Data Model](./data-model.md) | Firestore schema, Zustand stores, sync mechanism |
| **Features** | |
| [Dashboard](./features/dashboard.md) | User profile, states grid, quick actions |
| [Protocols (Actions)](./features/protocols.md) | Habit tracking, scoring, drag-and-drop, groups |
| [Innerfaces (Powers)](./features/innerfaces.md) | Attributes, decay system, categories, priorities |
| [History](./features/history.md) | Check-in log, filters, pagination, analytics |
| [Personalities](./features/personalities.md) | Character switching, themes, avatars, viewer mode |
| [Teams](./features/teams.md) | Collaboration, roles, invites, admin view |
| [Planning](./features/planning.md) | Goals, balance, pace calculator |

## Project Structure

```
src/
├── main.tsx                    # Entry point
├── App.tsx                     # Provider composition + root component
├── components/
│   ├── layout/                 # Layout, Header, Navigation, AnimatedRoutes
│   ├── ui/
│   │   ├── atoms/              # Button, Avatar, Icon, Tooltip, ProgressBar
│   │   ├── molecules/          # Modal, Toast, Input, ColorPicker, IconPicker
│   │   ├── organisms/          # EntitySelector
│   │   └── RichTextEditor/     # TipTap-based WYSIWYG editor
│   ├── modals/                 # Settings modals for each entity
│   └── logic/                  # ThemeController
├── config/                     # Firebase client config
├── constants/                  # Navigation order, DnD config, group presets
├── contexts/                   # AuthProvider, ScoreProvider, QueryProvider
├── features/
│   ├── dashboard/              # UserProfile, StatesGrid, QuickActions
│   ├── protocols/              # Protocol CRUD, scoring, DnD, filtering
│   ├── innerfaces/             # Innerface CRUD, decay, categories
│   ├── history/                # History feed, filters, pagination
│   ├── personalities/          # Character management, avatar upload
│   ├── teams/                  # Teams, roles, invites, admin view
│   ├── planning/               # Goals, pace calculator
│   └── groups/                 # Group management components
├── hooks/                      # Global hooks (swipe, scroll lock, DnD, etc.)
├── pages/                      # Route-level page components
├── stores/
│   ├── personalityStore.ts     # Character selection + context switching
│   ├── historyStore.ts         # Check-in log with transactions
│   ├── metadataStore.ts        # Composed store (4 slices)
│   ├── metadata/               # protocolSlice, innerfaceSlice, stateSlice, groupSlice
│   ├── planningStore.ts        # Goals per innerface
│   ├── uiStore.ts              # Toast + overlay state
│   ├── team/                   # teamStore, roleStore, inviteStore, roleMembersStore
│   └── StoreSync.tsx           # Subscription orchestration
├── types/                      # Shared types (personality, history, team)
├── utils/                      # Pure functions (XP, themes, colors, markdown)
└── styles/                     # Global CSS
```

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (port 5173)
npm run dev

# Build for production
npm run build

# Preview production build (port 4173)
npm run preview
```

## Environment Variables

Firebase config is loaded from `.env.development` / `.env.production`:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```
