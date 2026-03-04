# History

**Route**: `/history`
**Page**: `src/pages/history/HistoryPage.tsx`
**Feature**: `src/features/history/`

## Overview

The History page displays a chronological feed of all check-in events. It supports filtering by protocol, innerface, event type, and date range, with cursor-based pagination. Events can be deleted (with score reversion) and commented on.

## Components

```
HistoryPage
├── HistoryFilter (type selector, protocol/innerface multi-select, date range)
├── ActiveFiltersList (applied filter chips with remove)
├── HistoryList
│   └── HistoryEvent[] (icon, title, XP delta, timestamp, targets, comment)
├── Load More button (cursor-based pagination)
└── DebugPanel (system/decay events, toggle visibility)
```

### HistoryEvent

Renders a single check-in record with:
- Protocol icon with custom color
- Protocol name
- XP delta badge (green for positive, red for negative)
- Relative timestamp (via `date-fns`)
- Affected innerface names
- Optional comment (click to edit via CommentInputOverlay)
- Delete button with transaction-based score reversion

### HistoryFilter

Filter controls:
- **Type**: All types | Actions | Manual | System | Decay
- **Protocol**: Multi-select entity picker
- **Innerface**: Multi-select entity picker
- **Date range**: Start/end date inputs

System and decay events are hidden by default and toggled via the Debug panel.

## Hooks

### useHistoryFeed

**File**: `src/features/history/hooks/useHistoryFeed.ts`

```typescript
interface HistoryFilters {
  protocolIds?: string[];
  innerfaceIds?: string[];
  type?: 'All types' | 'Actions' | 'Manual' | 'System' | 'Decay';
  timeRange?: { start: Date; end: Date } | null;
}

useHistoryFeed(filters: HistoryFilters): {
  history: HistoryRecord[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  error: string | null;
}
```

**Pagination**: 50 records per page with cursor-based offset. The `loadMore()` function fetches the next page and appends to the existing list.

**Optimistic Delete**: Record removed from UI immediately. On error, the record is restored to its original position.

**Delete Transaction**: Calls `historyStore.deleteCheckin()` which runs a Firestore transaction to revert innerface scores and decrement personality stats. System events (`type: 'system'`) skip stat reversion.

## Types

**File**: `src/types/history.ts`

```typescript
interface HistoryRecord {
  id: string;
  type: 'protocol' | 'manual_adjustment' | 'system' | 'decay';
  protocolId: string | number;
  protocolName: string;
  protocolIcon: string;
  timestamp: string;                    // ISO format
  weight: number;
  targets: (string | number)[];         // Affected innerface IDs
  changes: Record<string | number, number>;  // Per-innerface score deltas
  details?: {
    from?: number;
    to?: number;
    [key: string]: unknown;
  };
  deletedAt?: string;
  comment?: string;
}
```

### Record Types

| Type | Source | Weight | Example |
|------|--------|--------|---------|
| `protocol` | User check-in | Protocol weight | "Completed meditation" |
| `manual_adjustment` | Score edit | Delta | "Adjusted score from 3 to 5" |
| `system` | Auto-generated | 0 | "Added Power to Action" |
| `decay` | Cloud Function | Negative | "Power decayed by 0.05" |

## Store Integration

- **historyStore** — Real-time subscription (last 7 days), append-only log, transaction-based delete with score reversion
- **metadataStore** — Protocol/innerface names for display
- **personalityStore** — Stats decremented on event deletion
- **uiStore** — CommentInputOverlay for editing check-in comments

## Comment System

Users can add or edit comments on any history record:
1. Click comment icon on a HistoryEvent
2. `uiStore.openCommentOverlay(checkinId, initialComment)` opens the overlay
3. User types comment and submits
4. `historyStore.updateCheckin()` saves with 3-attempt exponential backoff (100ms, 200ms, 400ms) to handle race conditions

## Data Flow

```
Real-time subscription (last 7 days, ordered by timestamp desc)
    │
    ├── Client-side filtering (by type, protocol, innerface, date range)
    │
    ├── Pagination (50 per page, cursor-based)
    │
    └── Rendered as HistoryEvent components
```

The subscription only covers the last 7 days for performance. Historical data beyond 7 days is accessible through pagination which queries Firestore directly with cursor-based offsets.
