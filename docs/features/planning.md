# Planning

**Feature**: `src/features/planning/`
**Store**: `src/stores/planningStore.ts`

## Overview

The Planning feature allows users to set target scores for each Innerface and configure how frequently linked Protocols should be performed. A pace calculator computes the estimated time to reach each goal based on the configured action frequency.

## Components

```
PlanningModal (opened from InnerfaceCard)
├── Interactive score slider (currentScore → targetScore)
├── Linked protocols list
│   └── ProtocolRow (toggle, action count per week)
├── Pace selector (Slow | Medium | Fast)
├── Estimated time display
└── Save / Delete buttons
```

### Interactive Score Slider

A draggable progress bar from `currentScore` to `currentScore + 10`. Snaps to 0.1 increments. Color gradient interpolates between the current tier color and the target tier color.

### Protocol Configuration

Each linked protocol shows:
- Toggle to activate/deactivate for this goal
- Action count per week (editable number input)
- XP contribution calculation

## Hooks

### usePlanningLogic

**File**: `src/features/planning/hooks/usePlanningLogic.ts`

```typescript
usePlanningLogic({ innerface, isOpen, onClose }): {
  currentScore: number;
  targetScore: number;
  setTargetScore: (score: number) => void;
  balance: Record<string, number>;        // protocolId → weight multiplier
  setBalance: (b: Record<string, number>) => void;
  actionCounts: Record<string, number>;   // protocolId → per-week count
  setActionCounts: (c: Record<string, number>) => void;
  isSubmitting: boolean;
  isCustomizing: boolean;
  setIsCustomizing: (v: boolean) => void;
  deactivatedProtocols: Set<string>;
  handleProtocolToggle: (id: string) => void;
  linkedProtocols: Protocol[];
  pointsNeeded: number;
  handleSave: () => Promise<void>;
  handleDelete: () => Promise<void>;
  hasExistingPlan: boolean;
  progressBarRef: React.RefObject;
  handleMouseDown: (e: React.MouseEvent) => void;
  currentColor: string;
  targetColor: string;
  scoreGradient: string;
  targetPercent: number;
}
```

**Default Pace**: Medium = 3 actions/week for each linked protocol. Adjustable per-protocol.

**Points Needed**: `(targetScore - currentScore) * 100` (converted to XP).

## Pace Calculator

**File**: `src/features/planning/utils/paceCalculator.ts`

```typescript
const PACE_CONFIGS: Record<SmartPlannerPace, PaceConfig> = {
  slow:   { checksPerWeek: 2, color: 'var(--correct-color)' },   // Green
  medium: { checksPerWeek: 3, color: 'var(--main-color)' },      // Yellow/Main
  fast:   { checksPerWeek: 5, color: 'var(--warning-color)' },   // Orange
};
```

**Key Functions**:

| Function | Purpose |
|----------|---------|
| `getWeeklySchedule(checksPerWeek)` | Returns a `boolean[7]` (Mon-Sun) of which days to perform the action |
| `calculateWeeksToGoal(xpNeeded, weeklyXP)` | `ceil(xpNeeded / weeklyXP)` |
| `formatWeeksToGoal(weeks)` | Human-readable: "2 weeks", "~1 month", "~3 months" |

**Weekly XP Calculation**: For each active protocol, `actionCount * protocol.weight * 100` gives weekly XP. Sum across all active protocols.

## Types

**File**: `src/features/planning/types.ts`

```typescript
type PlanningPeriod = 'week' | 'month' | 'quarter' | 'year';
type SmartPlannerPace = 'slow' | 'medium' | 'fast';

interface PlanningGoal {
  innerfaceId: string | number;
  targetScore: number;
  balance: Record<string, number>;       // protocolId → weight multiplier
  actionCounts?: Record<string, number>; // protocolId → per-week count
  createdAt: number;
  updatedAt: number;
}
```

## Store Integration

- **planningStore** — CRUD for goals, real-time subscription, scoped to active context
- **metadataStore** — Protocol and innerface data for linking
- **historyStore** — Weekly progress calculation against goals (via `getWeeklyProgress()`)

## Integration with Dashboard

The `WeeklyFocus` component on the Dashboard consumes planning goals to render 7-day completion grids:

```
getWeeklyProgress(goals, history, protocols, innerfaces) → WeeklyActionProgress[]
```

Each `WeeklyActionProgress` contains:
- `planned` — Target check-ins for the period
- `completed` — Actual check-ins this week
- `bonus` — Check-ins beyond the target
- `isLowFrequency` — `< 0.8/week` (shown as period view instead of daily)
- `isCapped` — Capped at 7/week for display; `realTarget` holds the actual value

## User Flows

**Set Goal for an Innerface**:
1. User opens an InnerfaceCard and accesses the planning modal
2. Drags the target score slider (0.1 snap increments)
3. Configures per-protocol action counts (or uses pace presets)
4. Save → `planningStore.setGoal()` writes to Firestore with merge semantics

**View Progress**:
1. Dashboard's WeeklyFocus computes `getWeeklyProgress()` from goals + this week's history
2. Shows 7-day checkmark grid per protocol with completion dots
3. Crown icon appears when weekly goal is fully met

**Delete Goal**:
1. User opens planning modal for an innerface with existing goal
2. Clicks delete
3. `planningStore.deleteGoal()` removes the goal document
4. WeeklyFocus no longer tracks that innerface
