# Architecture

## Provider Hierarchy

The app composes providers top-down in `src/App.tsx`:

```
<QueryProvider>              ← React Query (staleTime: 60s)
  <AuthProvider>             ← Firebase Auth (Google sign-in)
    <ScoreProvider>          ← Loading state + progress animation
      <TooltipProvider>      ← Radix UI tooltips
        <Router>
          <StoreSync />      ← Subscription orchestration
          <ThemeController/> ← CSS variable injection
          <Toast />          ← Global notifications
          <CommentOverlay /> ← Check-in comment input
          <AnimatedRoutes /> ← Route definitions + transitions
        </Router>
      </TooltipProvider>
    </ScoreProvider>
  </AuthProvider>
</QueryProvider>
```

A fixed background `div` with `translate3d(0,0,0)` sits below all content to force GPU compositing and prevent theme transition tint artifacts.

## Core Patterns

### Context-Driven Data Isolation

All data operations are scoped through `PathContext`, allowing identical UI to serve three contexts:

```typescript
type PathContext =
  | { type: 'personality'; uid: string; pid: string }
  | { type: 'role'; teamId: string; roleId: string }
  | { type: 'viewer'; targetUid: string; personalityId: string };
```

- **Personality**: User's own character data at `users/{uid}/personalities/{pid}/`
- **Role**: Team role template at `teams/{teamId}/roles/{roleId}/`
- **Viewer**: Admin viewing a participant's data (read-only, with coach mode exceptions)

Every store slice resolves Firestore paths dynamically via `getPathRoot(context)`. Viewer mode blocks mutations through `guardAgainstViewerMode()`, with an optional `allowInCoachMode` bypass for role-level edits.

### Modular Zustand Store Slices

The `metadataStore` composes four domain slices into a single store:

```typescript
// src/stores/metadataStore.ts
export const useMetadataStore = create<MetadataState>((set, get) => ({
  ...createInnerfaceSlice(set, get),
  ...createProtocolSlice(set, get),
  ...createStateSlice(set, get),
  ...createGroupSlice(set, get),
}));
```

Each slice manages its own CRUD, reordering, and Firestore writes while sharing state through the composed store. The `MetadataState` interface (defined in `src/stores/metadata/types.ts`) exposes 26 action methods across the four domains.

### Real-Time Firestore Subscriptions

`StoreSync` (`src/stores/StoreSync.tsx`) orchestrates all real-time listeners:

```
Phase 1 (always):
  subscribeToPersonalities(uid)
  subscribeToTeams(uid)

Phase 1.5 (if no personalities):
  ensureDefaultPersonality(uid)  ← creates "Main" personality

Phase 2 (context-dependent):
  personality → subscribeToHistory + subscribeToGoals + subscribeToMetadata
  role        → subscribeToRoles + subscribeToGoals + subscribeToMetadata
  viewer      → subscribeToHistory + subscribeToGoals + subscribeToMetadata
```

All subscriptions return cleanup functions. `contextHash = JSON.stringify(activeContext)` triggers re-subscription when context changes.

### Optimistic UI with Rollback

The app prioritizes perceived performance:

1. Generate unique ID synchronously
2. Update local Zustand state immediately
3. Show toast notification
4. Fire async Firestore write in background
5. Rollback on failure

This pattern appears in protocol application (`useScores`), entity CRUD operations, drag-and-drop reordering, and modal form submissions (modal closes before API response).

### Pending Write Protection

During batch operations (group renames, reorders), the `hasPendingWrites` flag prevents Firestore `onSnapshot` callbacks from overwriting in-flight optimistic state. A 500ms cleanup timeout resets the flag after the batch completes.

## Routing

**File**: `src/components/layout/AnimatedRoutes.tsx`

| Route | Component | Layout | Access |
|-------|-----------|--------|--------|
| `/login` | `LoginPage` | None | Public |
| `/invite/:code` | `JoinInvitePage` | None | Public |
| `/` | `Dashboard` | Full | Private |
| `/actions` | `ProtocolsList` | Full | Private |
| `/powers` | `InnerfacesPage` | Full | Private |
| `/history` | `HistoryPage` | Full | Private |
| `/settings` | `SettingsPage` | Full (no nav) | Private |

### Page Transitions

Touch devices get slide animations via Framer Motion. Direction is determined by comparing page indices in `PAGE_ORDER`:

```typescript
const PAGE_ORDER = ['/', '/actions', '/powers', '/history', '/settings'];
```

- Forward navigation slides left-to-right
- Backward navigation slides right-to-left
- Desktop renders instantly (no animation)
- Touch detection: `ontouchstart`, `navigator.maxTouchPoints`, or `pointer: coarse` media query
- Transition: `tween`, cubic-bezier `[0.25, 0.1, 0.25, 1]`, 450ms

## Data Flow

```
User Action (e.g., check-in)
    │
    ▼
Hook (useScores.applyProtocol)
    │
    ├── Optimistic Update (personalityStore.optimisticUpdateStats)
    ├── Show Toast (uiStore.showToast)
    │
    ▼
Background Write (historyStore.addCheckin)
    │
    ├── Firestore Transaction:
    │     1. Read innerface docs
    │     2. Read personality doc
    │     3. Write history record
    │     4. Update innerface scores (atomic increment)
    │     5. Update personality stats (checkins, XP)
    │
    ▼
Firestore onSnapshot fires
    │
    ▼
Store updates → Components re-render
```

## App Initialization Sequence

```
1. main.tsx renders <App> in StrictMode
2. App.tsx calls initTheme() → loads theme from localStorage (default: serika_dark)
3. AuthProvider checks Firebase auth state
4. If not authenticated → LoginPage
5. If authenticated → AppContent renders
6. StoreSync subscribes to personalities + teams
7. If no personalities → ensureDefaultPersonality() creates "Main"
8. Active context set from localStorage or first personality
9. Context-specific subscriptions start (metadata, history, goals)
10. ScoreProvider tracks loading across all stores
11. Progress bar fills smoothly (decoupled from actual data loading)
12. Once initialized → GlobalLoader dismissed, UI ready
```

### Loading Progress Animation

`ScoreProvider` (`src/contexts/ScoreProvider.tsx`) drives a visual progress bar that fills independently of actual data loading:

- Fills to ~90% at a decelerating rate (`diff * 0.1` step)
- When data loads, accelerates to 100%
- 500ms settle time at 100% before dismissing loader
- Update interval: 50ms

## Component Hierarchy

### Layout Shell

```
Layout (src/components/layout/Layout.tsx)
├── ViewerBanner              ← Shows when in viewer mode
├── PersonalityMottoBanner    ← Active motto display
└── #app .content-grid
    ├── Header
    │   ├── Logo (MonkeyType SVG + "monkeylearn" text)
    │   ├── Settings link
    │   ├── TeamsDropdown
    │   ├── PersonalityDropdown
    │   └── Logout dropdown (email + sign out)
    ├── Navigation (hidden on /settings)
    │   ├── Dashboard tab
    │   ├── Actions tab
    │   ├── Powers tab (expandable → History)
    │   └── Spacer dividers
    └── Main content area
        └── {children} (page component)
```

### Navigation

Bottom tab bar at 39px height with `text-[11px]` font. The Powers tab expands on hover to reveal the History link with a slide-in animation (300ms opacity + translateX transition).

### UI Component Library

Follows Atomic Design:

| Level | Path | Components |
|-------|------|------------|
| Atoms | `src/components/ui/atoms/` | AppIcon, Avatar, Button, Card, OverflowTooltip, ProgressBar, Tooltip |
| Molecules | `src/components/ui/molecules/` | ActiveFiltersList, CollapsibleSection, ColorPicker, CommentInputOverlay, ConfirmButton, GlobalLoader, IconPicker, ImageCropper, Input, Modal, MonkeyTypeLoader, SortableItem, Toast, TruncatedTooltip |
| Organisms | `src/components/ui/organisms/` | EntitySelector |

### Button Variants

`Button` component uses CVA (Class Variance Authority):

- `primary` — main color, filled
- `secondary` — sub-alt background
- `danger` — error color
- `ghost` — transparent, hover sub-alt
- `neutral` — sub-color text
- `history` — outlined, error/correct coloring

### Modal System

All settings modals follow a consistent pattern:

```
SettingsModal
├── Form with controlled state (custom useXxxForm hook)
├── Optimistic close (modal closes before API response)
├── Undo support via toast action callback
└── Delete confirmation with soft-delete semantics
```

Modals: `StateSettingsModal`, `ProtocolSettingsModal`, `InnerfaceSettingsModal`, `PersonalitySettingsModal`, `TeamSettingsModal`, `RoleSettingsModal`, `JoinTeamModal`

## Theme System

**File**: `src/utils/themeManager.ts`

Themes are applied as CSS custom properties on `document.documentElement`:

```typescript
interface Theme {
  name: string;
  bgColor: string;       // --bg-color
  mainColor: string;     // --main-color
  subColor: string;      // --sub-color
  textColor: string;     // --text-color
  subAltColor?: string;  // --sub-alt-color (derived if missing)
  errorColor?: string;   // Default: #ca4754
  correctColor?: string; // Default: #98c379
}
```

Each color also generates an `-rgb` variant (e.g., `--bg-color-rgb: 50 52 55`) for use with Tailwind's `rgb(.../ <alpha>)` opacity syntax. The `<meta name="theme-color">` tag updates to match the background.

**Tailwind Integration** (`tailwind.config.js`):

```
bg-primary     → var(--bg-color-rgb)
bg-secondary   → var(--sub-alt-color-rgb)
text-primary   → var(--text-color-rgb)
text-secondary → var(--sub-color-rgb)
main           → var(--main-color-rgb)
sub            → var(--sub-color-rgb)
sub-alt        → var(--sub-alt-color-rgb)
error          → var(--error-color)
correct        → var(--correct-color)
```

**Z-Index Stacking**: `base(0)` → `sticky(100)` → `dropdown(200)` → `popover(300)` → `modal(400)` → `toast(500)`

## XP & Level System

**File**: `src/utils/xpUtils.ts`

```
XP_PER_LEVEL = 100
Level = floor(totalXP / 100)
Progress = totalXP % 100

Score ↔ XP: scoreToXP(5.45) = 545, xpToScore(545) = 5.45
Weight ↔ XP: weight 0.05 = 5 XP per check-in
```

**Weighted Level** (used for user profile):
```
weightedLevel = Sum(Level_i * Weight_i) / Sum(Weight_i)
```

Where `Weight_i` is the innerface's priority weight: `low=1`, `medium=3`, `high=10`.

## Color Tiers

**File**: `src/utils/colorUtils.ts`

| Level Range | Color | Hex |
|-------------|-------|-----|
| 1-3 | Red | `#CA4754` |
| 4-6 | Gold | `#E2B714` |
| 7-9 | Green | `#98C379` |
| 10-19 | Purple | `#C678DD` |
| 20+ | Blue | `#61AFEF` |

Smooth interpolation between tiers is available via `getInterpolatedColor()`.
