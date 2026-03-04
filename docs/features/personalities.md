# Personalities

**Feature**: `src/features/personalities/`
**Store**: `src/stores/personalityStore.ts`
**Dropdown**: `src/components/layout/PersonalityDropdown.tsx`

## Overview

Personalities are the top-level data container — each represents a distinct character profile with its own set of Powers, Actions, Dimensions, History, and Goals. Users can create multiple personalities and switch between them, with each personality maintaining independent progress. Personalities also serve as the bridge for team collaboration: joining a team copies a role template into a new personality.

## Components

### PersonalityDropdown

**File**: `src/components/layout/PersonalityDropdown.tsx`

MonkeyType-style dropdown in the header:
- Avatar + personality name + count badge
- Design/Coach mode indicators (for role/viewer contexts)
- Gear icon → opens `PersonalitySettingsModal`
- "Create new" button at bottom
- List of all personalities with active indicator

### PersonalitySettingsModal

**File**: `src/components/modals/PersonalitySettingsModal.tsx`

Form fields:
- Name
- Description
- Icon (FontAwesome picker) + icon color (hex)
- Avatar (emoji or image upload with crop)
- Mottos (array with active toggle)
- Danger zone: delete personality

## Hooks

### usePersonalityForm

**File**: `src/features/personalities/hooks/usePersonalityForm.ts`

```typescript
usePersonalityForm({ personalityId, onClose, isOpen }): {
  formState: { name, description, icon, color, avatar, mottos };
  uiState: { isConfirmingDelete, isCropping, tempImage, isSubmitting };
  refs: { fileInputRef };
  handlers: {
    handleSubmit, handleDelete,
    handleFileSelect, handleCropComplete, handleCancelCrop,
    addMotto, updateMotto, deleteMotto, handleMottoToggle
  };
}
```

**Avatar Upload**:
1. User selects file via hidden `<input type="file">`
2. Image cropper opens (`ImageCropper` component)
3. On crop complete: resize to 512x512
4. Upload to Firebase Storage at `avatars/{userId}/{timestamp}_avatar.jpg`
5. URL stored in personality document

**Motto Management**:
- Mottos are an array of `{ id, text, isActive }` objects
- Only one motto can be active at a time (toggle deactivates others)
- Legacy migration: string mottos converted to `Motto[]` format on load
- Active motto displayed in `PersonalityMottoBanner` component in Layout

## Types

**File**: `src/types/personality.ts`

```typescript
interface Motto {
  id: string;
  text: string;
  isActive: boolean;
}

interface Personality {
  id: string;
  name: string;
  description?: string;
  mottos?: Motto[];
  avatar?: string;              // Emoji or Storage URL
  icon?: string;                // FontAwesome icon name
  iconColor?: string;           // Hex color
  currentTheme?: string;        // Theme name (e.g., "serika_dark")
  favThemes?: string[];
  createdAt: number;
  stats?: PersonalityStats;
  lastActiveAt: number;
  sourceTeamId?: string;        // Present if created from team invite
  sourceRoleId?: string;
}

interface PersonalityStats {
  totalCheckins: number;
  totalXp: number;
  lastDailyUpdate: string;      // "YYYY-MM-DD"
  dailyCheckins: number;
  dailyXp: number;
  lastMonthlyUpdate: string;    // "YYYY-MM"
  monthlyCheckins: number;
  monthlyXp: number;
}
```

## Context System

The `ActiveContext` union type drives data isolation:

```typescript
type ActiveContext =
  | { type: 'personality'; uid: string; pid: string }
  | { type: 'role'; teamId: string; roleId: string }
  | { type: 'viewer'; targetUid: string; personalityId: string;
      teamId: string; roleId: string; displayName: string };
```

### Personality Context
Default mode. All data scoped to `users/{uid}/personalities/{pid}/`. Full CRUD access.

### Role Context
Editing a team role template. Data at `teams/{teamId}/roles/{roleId}/`. No history. Used for designing role templates before sharing.

### Viewer Context
Admin viewing a team member's progress. Data at `users/{targetUid}/personalities/{personalityId}/`. Read-only with optional coach mode exceptions for certain updates (e.g., `updateInnerface`, `updateProtocol` with `allowInCoachMode`).

**Viewer Mode Flow**:
1. Admin clicks a team member in TeamsDropdown
2. `switchToViewer()` saves current context to `pre_viewer_context` in localStorage
3. All subscriptions re-bind to target user's data
4. `ViewerBanner` displays target user name with exit button
5. `exitViewerMode()` restores previous context from localStorage

## Store Integration

- **personalityStore** — CRUD, context switching, subscription, default personality creation
- **StoreSync** — Re-subscribes all stores when `activeContext` changes
- **historyStore** — Scoped to active personality
- **metadataStore** — Scoped to active personality/role/viewer
- **planningStore** — Scoped to active personality/role/viewer

## Persistence

Stored in localStorage:
- `active_personality_id` — Last active personality ID
- `active_context` — Serialized `ActiveContext`
- `pre_viewer_context` — Context backup before entering viewer mode

## User Flows

**Switch Personality**:
1. User clicks personality in dropdown
2. `switchPersonality(uid, pid)` updates `lastActiveAt` on the personality doc
3. Active context saved to localStorage
4. `StoreSync` detects context change via `contextHash`
5. All subscriptions unsubscribe and re-subscribe to new personality's data

**Create Personality**:
1. User clicks "Create new" in dropdown
2. `addPersonality(uid, name, data?)` creates personality doc + default groups via batch write
3. Auto-switches to new personality

**Default Personality Initialization**:
On first login (no personalities exist), `ensureDefaultPersonality(uid)` creates a "Main" personality with seeded default groups (`Body`, `Mind`, `Growth`, `Business`, `Rest`, `Substances`). Waits 1 second to avoid race conditions with subscription initialization.
