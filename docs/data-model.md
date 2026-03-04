# Data Model

## Firestore Schema

### User Data

```
users/{uid}/
├── (profile document)
│   ├── uid: string
│   ├── email: string
│   ├── displayName: string
│   ├── photoURL: string
│   ├── createdAt: Timestamp
│   ├── lastLogin: Timestamp
│   └── teamMemberships: Record<teamId, TeamMembership>
│
└── personalities/{pid}/
    ├── (personality document)
    │   ├── name: string
    │   ├── description?: string
    │   ├── avatar?: string          # Emoji or Storage URL
    │   ├── icon?: string            # FontAwesome icon name
    │   ├── iconColor?: string       # Hex color
    │   ├── currentTheme?: string    # Theme name
    │   ├── favThemes?: string[]
    │   ├── mottos?: Motto[]
    │   ├── createdAt: number
    │   ├── lastActiveAt: number
    │   ├── sourceTeamId?: string    # If created from team invite
    │   ├── sourceRoleId?: string
    │   └── stats: PersonalityStats
    │
    ├── innerfaces/{id}              # Powers/Attributes
    │   ├── name: string
    │   ├── icon: string
    │   ├── description?: string
    │   ├── hover?: string
    │   ├── initialScore: number
    │   ├── currentScore?: number
    │   ├── color?: string
    │   ├── category?: 'skill' | 'foundation' | null
    │   ├── priority?: 'low' | 'medium' | 'high'
    │   ├── group?: string
    │   ├── order?: number
    │   ├── versionTimestamp?: string
    │   ├── lastCheckInDate?: string
    │   ├── decaySettings?: DecaySettings
    │   ├── createdAt?: string
    │   └── deletedAt?: string       # Soft delete marker
    │
    ├── protocols/{id}               # Actions/Habits
    │   ├── title: string
    │   ├── description: string
    │   ├── icon: string
    │   ├── color?: string
    │   ├── weight: number           # 0.01-1.0 (XP = weight * 100)
    │   ├── targets: (string|number)[]  # Linked innerface IDs
    │   ├── hover?: string
    │   ├── instruction?: string     # Rich text (markdown)
    │   ├── group?: string
    │   ├── order?: number
    │   └── deletedAt?: string
    │
    ├── states/{id}                  # Dimensions (0-10 composite scores)
    │   ├── name: string
    │   ├── icon?: string
    │   ├── subtext?: string
    │   ├── description?: string
    │   ├── hover?: string
    │   ├── score?: number
    │   ├── yesterdayScore?: number
    │   ├── color?: string
    │   ├── innerfaceIds?: (string|number)[]
    │   ├── stateIds?: string[]      # Nested state references
    │   ├── order?: number
    │   └── deletedAt?: string
    │
    ├── history/{recordId}           # Append-only check-in log
    │   ├── type: 'protocol' | 'manual_adjustment' | 'system' | 'decay'
    │   ├── protocolId: string|number
    │   ├── protocolName: string
    │   ├── protocolIcon: string
    │   ├── timestamp: string        # ISO format
    │   ├── weight: number
    │   ├── targets: (string|number)[]
    │   ├── changes: Record<id, number>  # Per-innerface deltas
    │   ├── details?: { from?: number; to?: number }
    │   ├── comment?: string
    │   └── deletedAt?: string
    │
    ├── goals/{innerfaceId}          # Planning goals
    │   ├── innerfaceId: string|number
    │   ├── targetScore: number
    │   ├── balance: Record<protocolId, number>     # Weight multipliers
    │   ├── actionCounts?: Record<protocolId, number>  # Per-week target
    │   ├── createdAt: number
    │   └── updatedAt: number
    │
    └── settings/
        └── app                      # App-level settings
            ├── groupsMetadata: Record<name, { icon, color? }>
            ├── protocolGroupOrder: string[]
            ├── innerfaceGroupOrder: Record<category, string[]>
            ├── categoryOrder: string[]
            ├── pinnedProtocolIds: string[]
            └── isDimensionsCollapsed: boolean
```

### Team Data

```
teams/{teamId}/
├── (team document)
│   ├── name: string
│   ├── icon?: string
│   ├── iconColor?: string
│   ├── ownerId: string
│   ├── memberUids: string[]
│   └── createdAt: number
│
└── roles/{roleId}/
    ├── (role document)
    │   ├── name: string
    │   ├── icon?: string
    │   ├── iconColor?: string
    │   ├── currentTheme?: string
    │   ├── favThemes?: string[]
    │   ├── activeInviteCode?: string
    │   └── templateData: RoleTemplate
    │
    ├── innerfaces/{id}          # Template innerfaces
    ├── protocols/{id}           # Template protocols
    ├── states/{id}              # Template states
    ├── goals/{innerfaceId}      # Template goals
    ├── settings/
    │   └── app                  # Template settings
    └── members/{uid}            # Role members
        ├── uid: string
        ├── displayName: string
        ├── icon?: string
        ├── personalityId: string    # User's copied personality
        ├── joinedAt: number
        └── lastActiveAt?: number
```

### Invite Data

```
team_invites/{code}/
├── code: string               # 8-character alphanumeric
├── teamId: string
├── roleId: string
├── createdBy: string
├── createdAt: number
├── expiresAt?: number
├── singleUse: boolean
└── used?: boolean
```

## Key Types

### PersonalityStats

```typescript
interface PersonalityStats {
  totalCheckins: number;
  totalXp: number;
  lastDailyUpdate: string;    // "YYYY-MM-DD"
  dailyCheckins: number;
  dailyXp: number;
  lastMonthlyUpdate: string;  // "YYYY-MM"
  monthlyCheckins: number;
  monthlyXp: number;
}
```

Stats use atomic increments in Firestore transactions. Daily and monthly counters reset when the date changes (compared against `lastDailyUpdate` / `lastMonthlyUpdate`).

### DecaySettings

```typescript
interface DecaySettings {
  enabled: boolean;
  amount: number;              // Weight 0.01-1.0 (UI shows 1-100 XP)
  frequency: 'day' | 'week' | 'month';
  interval?: number;           // Multiplier (default: 1)
  lastDecayDate?: string;
}
```

Decay is processed by a Firebase Cloud Function (`functions/src/index.ts`) that runs on a schedule, applying negative score changes and logging `type: 'decay'` history records.

### TeamMembership

```typescript
interface TeamMembership {
  teamId: string;
  roleId: string;
  personalityId: string;      // Copied personality in user's account
  joinedAt: number;
  invitedBy: string;
}
```

Stored as a map field on the user document (`teamMemberships`), keyed by `teamId`.

## Zustand Stores

### Store Overview

| Store | File | Firestore Sync | Key State |
|-------|------|---------------|-----------|
| `personalityStore` | `src/stores/personalityStore.ts` | `onSnapshot` | `personalities[]`, `activeContext` |
| `historyStore` | `src/stores/historyStore.ts` | `onSnapshot` (7 days) | `history[]`, `pendingCheckins` |
| `metadataStore` | `src/stores/metadataStore.ts` | `onSnapshot` (4 listeners) | `innerfaces[]`, `protocols[]`, `states[]`, group metadata |
| `planningStore` | `src/stores/planningStore.ts` | `onSnapshot` | `goals: Record<innerfaceId, PlanningGoal>` |
| `uiStore` | `src/stores/uiStore.ts` | None (in-memory) | `toast`, `commentOverlay` |
| `teamStore` | `src/stores/team/teamStore.ts` | `onSnapshot` (dual) | `teams[]`, `memberships`, `roles` |
| `roleStore` | `src/stores/team/roleStore.ts` | `onSnapshot` | `roles: Record<teamId, TeamRole[]>` |
| `inviteStore` | `src/stores/team/inviteStore.ts` | None (on-demand) | `isLoading`, `error` |
| `roleMembersStore` | `src/stores/team/roleMembersStore.ts` | `onSnapshot` | `roleMembers: Record<key, RoleMember[]>` |

### personalityStore

**State**: `personalities[]`, `activePersonalityId`, `activeContext`, `isLoading`, `error`

**Key Actions**:
- `subscribeToPersonalities(uid)` — Real-time listener, sorted alphabetically, handles remote deletion
- `switchPersonality(uid, pid)` — Updates `lastActiveAt`, persists to localStorage
- `switchToRole(teamId, roleId)` — Synchronous context switch to team role
- `switchToViewer(...)` — Admin mode with pre-viewer context backup
- `exitViewerMode()` — Restores previous context from localStorage
- `ensureDefaultPersonality(uid)` — Creates "Main" personality with default groups if none exist
- `optimisticUpdateStats(pid, checkinsDelta, xpDelta)` — Immediate stats update for UI

**Persistence**: `active_personality_id`, `active_context`, `pre_viewer_context` stored in localStorage.

### historyStore

**State**: `history[]`, `isLoading`, `pendingCheckins: Set<string>`

**Key Actions**:
- `addCheckin(uid, pid, record, applyToScore?, customId?)` — Firestore transaction: creates history record, updates innerface scores (atomic increment), updates personality stats. XP = `weight * 100`. Score capped at 0 minimum.
- `updateCheckin(uid, pid, id, data)` — With 3-attempt exponential backoff (100ms, 200ms, 400ms) for race conditions.
- `deleteCheckin(uid, pid, id)` — Transaction: reverts innerface scores, decrements stats, deletes record. Skips stat reversion for system events.
- `subscribeToHistory(uid, pid)` — Subscribes to last 7 days, ordered by timestamp desc.

### metadataStore (Composed)

**Composed from 4 slices** via spread operator in `create()`:

| Slice | File | Responsibilities |
|-------|------|-----------------|
| `innerfaceSlice` | `src/stores/metadata/innerfaceSlice.ts` | CRUD, move, reorder, category/group ordering |
| `protocolSlice` | `src/stores/metadata/protocolSlice.ts` | CRUD, pin/unpin, reorder, move between groups |
| `stateSlice` | `src/stores/metadata/stateSlice.ts` | CRUD, reorder, collapse toggle |
| `groupSlice` | `src/stores/metadata/groupSlice.ts` | Rename, delete, restore groups across entities |

**Subscription**: `subscribeToMetadata(context)` creates 4 parallel `onSnapshot` listeners (innerfaces, protocols, states, settings/app). A `loadedCount` tracker gates the loading state. Snapshot updates are suppressed when `hasPendingWrites` is true.

**Cross-Slice Operations**:
- `groupSlice.renameGroup()` — Batch updates innerfaces, protocols, group metadata, and all order fields atomically
- `groupSlice.deleteGroup()` — Ungroups all items, removes from metadata and order fields
- `protocolSlice.addProtocol()` — Logs system events for each linked innerface (personality context only)

### planningStore

**State**: `goals: Record<innerfaceId, PlanningGoal>`, `isLoading`, `error`

**Key Actions**:
- `setGoal(context, goalData)` — Merge write with `createdAt`/`updatedAt` timestamps
- `deleteGoal(context, innerfaceId)` — Deletes goal document
- `subscribeToGoals(context)` — Real-time listener, supports all three context types

### uiStore

**State**: `toast { message, type, isVisible, actionLabel?, onAction? }`, `commentOverlay { isOpen, checkinId, initialComment? }`

In-memory only — no Firestore sync.

### Team Stores

**teamStore**: Dual subscription (owned teams via `ownerId==uid` + member teams via `memberUids array-contains uid`). Deduplicates via Map. Memberships loaded from user document.

**roleStore**: `roles: Record<teamId, TeamRole[]>`. Role creation uses batch writes to atomically create the role document and all template sub-collections (innerfaces, protocols, states, settings). Role updates perform full replacement (delete old, write new).

**inviteStore**: On-demand operations (no persistent subscription). `joinTeam()` performs a complex batch write:
1. Validate invite (expiry, single-use)
2. Create personality from role template with ID remapping
3. Copy all sub-collections with remapped references
4. Add team membership to user doc
5. Update team's `memberUids` with `arrayUnion`
6. Create `RoleMember` document

ID mapping strategy: `st-{timestamp}-{index}`, `if-{timestamp}-{index}`, `pr-{timestamp}-{index}`.

**roleMembersStore**: `roleMembers: Record<"{teamId}/{roleId}", RoleMember[]>`. Supports both one-time fetch and real-time subscription.

## Sync Orchestration

`StoreSync` (`src/stores/StoreSync.tsx`) manages the subscription lifecycle:

```
User authenticates
    │
    ├── Subscribe to personalities (always)
    ├── Subscribe to teams (always)
    │
    ▼
Active context set (from localStorage or first personality)
    │
    ├── personality context:
    │     subscribeToHistory(uid, pid)
    │     subscribeToGoals({type: 'personality', uid, pid})
    │     subscribeToMetadata({type: 'personality', uid, pid})
    │
    ├── role context:
    │     clearHistory()
    │     subscribeToRoles(teamId)
    │     subscribeToGoals({type: 'role', teamId, roleId})
    │     subscribeToMetadata({type: 'role', teamId, roleId})
    │
    └── viewer context:
          subscribeToHistory(targetUid, personalityId)
          subscribeToGoals({type: 'viewer', targetUid, personalityId})
          subscribeToMetadata({type: 'viewer', targetUid, personalityId})
```

Context changes trigger full re-subscription via `contextHash = JSON.stringify(activeContext)` dependency. All previous subscriptions are cleaned up before new ones start.

## Soft Delete Pattern

All destructive operations set `deletedAt: new Date().toISOString()` instead of removing documents. This preserves referential integrity in history records and enables undo functionality via toast action callbacks. Restoration clears the `deletedAt` field using `deleteField()`.

## Transaction Patterns

**Check-in Transaction** (`historyStore.addCheckin`):
1. Read all target innerface docs
2. Read personality doc
3. Write history record
4. Update each innerface: `currentScore = max(0, current + weight)`
5. Update personality stats with atomic increments (or reset if date changed)

**Delete Check-in Transaction** (`historyStore.deleteCheckin`):
1. Read history record
2. Read all target innerface docs
3. Read personality doc
4. Delete history record
5. Revert each innerface score
6. Decrement personality stats (skip for system events)

All transactions follow the read-all-first-then-write-all pattern required by Firestore.
