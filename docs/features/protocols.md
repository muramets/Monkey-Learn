# Protocols (Actions)

**Route**: `/actions`
**Page**: `src/pages/protocols/index.ts`
**Feature**: `src/features/protocols/`

## Overview

Protocols are the core interaction unit — repeatable actions (habits, exercises, routines) that, when applied, grant XP to linked Innerfaces (Powers). Each protocol has a weight (0.01-1.0) that determines its XP value (`weight * 100`). Protocols are organized into groups and support drag-and-drop reordering.

## Components

```
ProtocolsPage
├── SearchBar + Filters
├── ActiveFiltersList (applied filter chips)
├── GroupAccordion[]
│   ├── Group header (icon, color, collapse toggle)
│   └── ProtocolCard[] (drag handle, title, XP badge, targets)
├── ProtocolSettingsModal
└── DragOverlay (ghost card during drag)
```

### ProtocolCard

Displays protocol title, icon, XP value badge, linked innerface count, and a drag handle. Clicking opens `ProtocolSettingsModal`. Cards in a `justDropped` state show a brief highlight animation. Deleted protocols show with reduced opacity and a restore button.

### GroupAccordion

Collapsible group container with:
- Custom icon and color from `groupsMetadata`
- Protocol count badge
- Collapse/expand toggle (persisted to localStorage via `useCollapsedGroups`)
- Group-level drag handle for reordering groups

## Hooks

### useScores

**File**: `src/features/protocols/hooks/useScores.ts`

The primary hook for protocol application and score calculation.

```typescript
useScores(): {
  history: HistoryRecord[];
  applyProtocol: (protocolId, direction: '+' | '-') => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  innerfaces: Innerface[];
  protocols: Protocol[];
  states: StateData[];
  isLoading: boolean;
  loadingProgress: number;
}
```

**applyProtocol flow**:
1. Find protocol by ID
2. Build `HistoryRecord` with targets, weight (negated for `-` direction), timestamp
3. Call `personalityStore.optimisticUpdateStats()` for immediate UI feedback
4. Show toast with XP value
5. Call `historyStore.addCheckin()` in background (Firestore transaction)

**Score Calculation**:
- Innerface scores are derived from the Firestore `currentScore` field
- State scores = weighted average of linked innerface scores
- "Yesterday's score" computed by subtracting today's history deltas

### useProtocolForm

**File**: `src/features/protocols/hooks/useProtocolForm.ts`

```typescript
useProtocolForm({ protocolId, onClose, isOpen }): {
  formState: { title, description, hover, group, icon, xp, targets, color, instruction, hasInstruction };
  availableGroups: string[];
  innerfaces: Innerface[];
  groupsMetadata: Record<string, { icon?, color? }>;
  handleSubmit, handleDelete, handleDeleteGroup, handleUpdateGroupMetadata;
}
```

**XP Conversion**: UI displays 1-100, stored as weight 0.01-1.0 (`weight = xp / 100`).

**Submit Flow**:
1. Close modal optimistically
2. Build protocol data with weight conversion
3. If editing: `updateProtocol()` detects target changes and logs system events for link/unlink
4. If creating: `addProtocol()` logs system events for each linked innerface

### useProtocolDnD

**File**: `src/features/protocols/hooks/useProtocolDnD.ts`

```typescript
useProtocolDnD({
  groupedProtocols, onReorderGroups, onReorderProtocols, onMoveProtocol
}): {
  sensors: Sensor[];
  active: { id, protocol, group };
  justDroppedId: string | null;
  handleDragStart, handleDragOver, handleDragEnd;
  optimisticGroupedProtocols;
}
```

Supports three drag operations:
1. **Group reorder** — Drag group headers to reorder groups
2. **Item reorder** — Drag items within the same group
3. **Item move** — Drag items between groups

Uses local state for optimistic rendering during drag. Refs prevent stale closures in debounced save callbacks. The `justDroppedId` state triggers a highlight animation on the dropped card.

### useProtocolsFiltering

**File**: `src/features/protocols/hooks/useProtocolsFiltering.ts`

```typescript
useProtocolsFiltering(protocols, innerfaceMap): {
  searchQuery, setSearchQuery;
  activeFilters, toggleFilter, removeFilter, clearAllFilters;
  filteredProtocols;
}
```

Search scope: protocol title, group name, linked innerface names. Returns protocols matching all active filters.

### useProtocolsGrouping

**File**: `src/features/protocols/hooks/useProtocolsGrouping.ts`

```typescript
useProtocolsGrouping(filteredProtocols, groupOrder): {
  groupedProtocols: [string, Protocol[]][];
  protocolGroups: string[];
}
```

Groups protocols by `protocol.group` (defaulting to `'ungrouped'`), sorts within groups by `order` field, and sorts groups according to `protocolGroupOrder` metadata.

## Types

**File**: `src/features/protocols/types.ts`

```typescript
interface Protocol {
  id: number | string;
  title: string;
  description: string;
  icon: string;
  color?: string;
  group?: string;
  deletedAt?: string;
  weight: number;               // 0.01-1.0
  targets: (number | string)[]; // Linked innerface IDs
  hover?: string;
  instruction?: string;         // Rich text (markdown)
  order?: number;
}
```

## Store Integration

- **metadataStore** (protocolSlice) — CRUD, soft delete/restore, pinning, reordering, group moves
- **metadataStore** (groupSlice) — Group rename/delete affects protocols
- **historyStore** — `addCheckin()` for protocol application
- **personalityStore** — Optimistic stats update on apply

## User Flows

**Apply Protocol** (from QuickActions or direct):
1. User triggers `+` or `-` on a protocol
2. `useScores.applyProtocol()` runs optimistic update + background transaction
3. Each target innerface score incremented by `weight` (or `-weight`)
4. Personality stats updated atomically
5. History record created

**Create Protocol**:
1. User opens ProtocolSettingsModal (no `protocolId`)
2. Fills form: title, XP (1-100), icon, targets, group, optional instruction
3. Submit → `addProtocol()` writes to Firestore
4. System events logged for each linked innerface

**Delete Protocol**:
1. Soft delete sets `deletedAt`
2. Protocol removed from `pinnedProtocolIds` via batch write
3. Toast shows with undo action → `restoreProtocol()` clears `deletedAt`

**Drag-and-Drop Reorder**:
1. Long-press (touch, 250ms) or mouse drag (10px threshold)
2. DragOverlay shows ghost card
3. Optimistic local state updates during drag
4. On drop: batch write updates `order` fields for all affected protocols
