# Innerfaces (Powers)

**Route**: `/powers`
**Page**: `src/pages/innerfaces/InnerfacesPage.tsx`
**Feature**: `src/features/innerfaces/`

## Overview

Innerfaces represent trackable attributes (skills, foundations, habits) that accumulate score over time through Protocol check-ins. Each innerface has an initial score and a current score that changes with every linked protocol application. Innerfaces support decay — automatic score reduction when a user is inactive — and are organized by category and group.

## Components

```
InnerfacesPage
├── CategoryTabs (Skill | Foundation | Uncategorized)
│   └── GroupAccordion[]
│       ├── Group header (icon, color, collapse)
│       └── InnerfaceCard[] (score bar, level, trend, decay badge)
├── InnerfaceSettingsModal
└── DragOverlay (ghost card during drag)
```

### CategoryTabs

Three tabs driven by `CATEGORY_CONFIG`:

| Category | Label | Icon |
|----------|-------|------|
| `skill` | Skills | Sparkles |
| `foundation` | Foundations | Layers |
| `null` | Uncategorized | Inbox |

Category order is configurable via drag-and-drop and persisted to `settings/app.categoryOrder`.

### InnerfaceCard

Displays:
- Innerface name + icon with custom color
- Score bar showing current level progress (0-100%)
- Level number with tier-based coloring
- Trend indicator (today vs yesterday)
- Decay badge (if decay is enabled)
- Priority indicator (low/medium/high)

### GroupAccordion

Same pattern as Protocols — collapsible groups with custom icons/colors, persisted collapse state, and group-level drag handles.

## Hooks

### useInnerfaceForm

**File**: `src/features/innerfaces/hooks/useInnerfaceForm.ts`

```typescript
useInnerfaceForm({ innerfaceId, onClose, isOpen }): {
  formState: {
    name, description, group, initialScore, color, icon, hover,
    protocolIds,
    category: PowerCategory,
    priority: 'low' | 'medium' | 'high',
    decayEnabled, decayAmount, decayFrequency, decayInterval
  };
  uiState: { isGroupDropdownOpen, isCoachMode };
  data: { availableGroups, protocols, groupsMetadata };
  handlers: {
    handleSubmit, handleDelete, handleDeleteGroup,
    toggleProtocol, updateGroupMetadata
  };
}
```

**Decay Settings UI**: Amount displayed as 1-100 XP, stored as weight 0.01-1.0 (`weight = xp / 100`).

**Initial Score Adjustment**: When `initialScore` changes on an existing innerface, `currentScore` is shifted by the delta to preserve the user's accumulated progress.

**Bidirectional Protocol Sync**: When a protocol is toggled in the innerface form, the protocol's `targets` array is also updated to maintain consistency.

### useInnerfaceDnD

**File**: `src/features/innerfaces/hooks/useInnerfaceDnD.ts`

```typescript
useInnerfaceDnD({
  innerfaces, groupOrder, categoryOrder,
  onReorderCategories, onReorderGroups, onMoveInnerface
}): {
  items, sensors, activeId, activeItem, activeGroup, activeCategory, isValidDrop;
  handleDragStart, handleDragOver, handleDragEnd;
  innerfacesByCategory;
  getGroupsForCategory;
  categoryIds, activeCategoryOrder;
}
```

Three-level drag hierarchy:
1. **Category reorder** — Drag category tabs to reorder
2. **Group reorder** — Drag group headers within a category
3. **Item drag** — Move innerfaces between groups (within same category only)

Validation: Items cannot be dragged to a different category. Invalid drops show visual feedback via `isValidDrop` flag.

Uses debounced saves (1000ms) with refs to prevent stale closures. Preserves empty groups during drag via `dragStartGroupsRef`.

## Types

**File**: `src/features/innerfaces/types.ts`

```typescript
type PowerCategory = 'skill' | 'foundation' | null;

interface Innerface {
  id: number | string;
  name: string;
  icon: string;
  description?: string;
  hover?: string;
  initialScore: number;
  currentScore?: number;
  color?: string;
  versionTimestamp?: string;        // Hard reset marker
  order?: number;
  group?: string;
  deletedAt?: string;
  category?: PowerCategory;
  lastCheckInDate?: string;
  decaySettings?: DecaySettings;
  priority?: 'low' | 'medium' | 'high';
  createdAt?: string;
}

interface DecaySettings {
  enabled: boolean;
  amount: number;                   // Weight 0.01-1.0
  frequency: 'day' | 'week' | 'month';
  interval?: number;               // Multiplier (default: 1)
  lastDecayDate?: string;
}
```

### Priority Weights

Used in weighted level calculations (`src/utils/xpUtils.ts`):

| Priority | Weight |
|----------|--------|
| `low` | 1 |
| `medium` | 3 |
| `high` | 10 |

## Constants

**File**: `src/features/innerfaces/constants.ts`

```typescript
const CATEGORY_CONFIG = {
  skill: { label: 'Skills', icon: Sparkles },
  foundation: { label: 'Foundations', icon: Layers },
  uncategorized: { label: 'Uncategorized', icon: Inbox }
};
```

## Store Integration

- **metadataStore** (innerfaceSlice) — CRUD, soft delete/restore, move between groups, reorder within groups, category/group ordering
- **metadataStore** (groupSlice) — Group rename/delete affects innerfaces
- **historyStore** — Score updates via `addCheckin()` transactions (atomic increment on `currentScore`)
- **planningStore** — Goals keyed by `innerfaceId`

## Decay System

Decay is an automated score reduction that fires when a user hasn't checked in for a specified period.

**Configuration per Innerface**:
- `enabled` — Toggle decay on/off
- `amount` — XP to deduct per cycle (1-100 UI → 0.01-1.0 weight)
- `frequency` — Cycle length: `day`, `week`, or `month`
- `interval` — Multiplier (e.g., interval=2 + frequency=week → every 2 weeks)

**Execution**: A Firebase Cloud Function (`functions/src/index.ts`) runs on a schedule, checks each innerface's `lastDecayDate` against the decay interval, applies negative score changes, and logs `type: 'decay'` history records.

**Score Floor**: Scores are capped at 0 minimum (`max(0, currentScore - amount)`).

## User Flows

**Create Innerface**:
1. User opens InnerfaceSettingsModal
2. Fills form: name, icon, initial score, category, priority, decay settings
3. Optionally links protocols (bidirectional)
4. Submit → `addInnerface()` writes to Firestore with `createdAt`

**Manual Score Adjustment**:
1. User changes `initialScore` in the form
2. `currentScore` shifts by the delta
3. A `manual_adjustment` history record is logged

**Hard Reset**:
1. User sets a new `versionTimestamp`
2. Score resets to `initialScore`
3. Previous history remains but no longer contributes to current score
