# Dashboard

**Route**: `/`
**Page**: `src/pages/dashboard/DashboardPage.tsx`
**Feature**: `src/features/dashboard/`

## Overview

The Dashboard is the landing page. It displays the user's profile with level/XP, a grid of States (composite score cards), and a grid of pinned Quick Actions for rapid check-ins.

## Components

```
DashboardPage
├── UserProfile
│   ├── Avatar (with animated glow rings)
│   ├── Level + XP progress bar
│   ├── WeeklyFocus (7-day protocol completion grid)
│   └── UserStats (today/month check-ins and XP)
├── StatesGrid
│   └── StateCard[] (level number, progress bar, trend indicator)
├── QuickActionsGrid
│   └── QuickActionCard[] (drag-and-drop, swipe-to-apply)
├── StateSettingsModal
└── AddQuickActionModal
```

### UserProfile

Renders a profile card with an avatar surrounded by counter-rotating animated glow rings. Displays the user's weighted level (calculated across all innerfaces using priority weights), XP progress bar, and embedded sub-components.

**Level Calculation**: `calculateWeightedLevel()` from `src/utils/xpUtils.ts` computes a weighted average: `Sum(Level_i * PriorityWeight_i) / Sum(PriorityWeight_i)`.

### UserStats

Shows four metrics: check-ins today, XP today, check-ins this month, XP this month. Clicking navigates to `/history`.

### WeeklyFocus

Renders a 7-day completion grid for each protocol that has a planning goal. Uses `getWeeklyProgress()` from `src/utils/weeklyProgressUtils.ts` to calculate planned vs completed counts. Features pagination dots for multiple protocols, mini-calendar with hover tooltips, and a crown icon when a protocol's weekly goal is fully met.

### StatesGrid

Renders `StateCard` components in a responsive grid. Each card displays:

- Giant level number with tier-based coloring (red 1-3, gold 4-6, green 7-9, purple 10-19, blue 20+)
- Level progress bar (0-100%)
- Trend indicator comparing today vs yesterday score
- Ambient glow animation
- Dependency count ("3 Powers, 2 Dimensions")

Clicking a card opens `StateSettingsModal`.

### QuickActionsGrid

Renders pinned protocols as `QuickActionCard` components with `@dnd-kit` drag-and-drop support. Includes a DragOverlay for visual feedback during reordering and an "Add" button that opens `AddQuickActionModal`.

### QuickActionCard

3-phase visual feedback on interaction:
1. **Shake** (300ms) — tilt animation
2. **Scale + Color** (500ms) — card scales with green/red gradient overlay
3. **Content Swap** (800ms) — shows XP feedback with direction indicator

Supports bidirectional application (`+` / `-`) via left/right interaction areas. Touch devices get a pulse animation fallback.

## Hooks

### useStateForm

**File**: `src/features/dashboard/hooks/useStateForm.ts`

```typescript
useStateForm({ stateId, onClose, isOpen }): {
  formState: { name, description, hover, icon, color, innerfaceIds };
  handlers: { handleSubmit, handleDelete, toggleInnerface };
}
```

Manages State CRUD with optimistic close, undo support via toast callback, and default values (`icon: 'scale-balanced'`, `color: '#7fb3d3'`).

## Types

**File**: `src/features/dashboard/types.ts`

```typescript
interface StateData {
  id: string;
  name: string;
  icon?: string;
  subtext?: string;
  description?: string;
  hover?: string;
  score?: number;
  yesterdayScore?: number;
  color?: string;
  innerfaceIds?: (number | string)[];
  stateIds?: string[];          // Nested state references
  order?: number;
  deletedAt?: string;
}
```

## Store Integration

- **metadataStore** (stateSlice) — CRUD operations on states, dimensions collapse toggle
- **metadataStore** (protocolSlice) — Pinned protocols list, reorder quick actions
- **personalityStore** — User stats for profile display
- **uiStore** — Toast notifications for actions

## User Flows

**Apply Quick Action**:
1. User taps/swipes a QuickActionCard (left = `-`, right = `+`)
2. 3-phase animation plays
3. `useScores.applyProtocol(id, direction)` fires
4. Optimistic stats update on personality
5. Toast shows XP gained/lost
6. Background transaction writes to Firestore

**Reorder Quick Actions**:
1. User long-presses (touch) or drags (mouse) a card
2. DragOverlay renders the card above others
3. On drop, `reorderQuickActions()` saves new order optimistically + to Firestore
