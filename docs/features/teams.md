# Teams

**Feature**: `src/features/teams/`
**Stores**: `src/stores/team/`
**Invite Page**: `src/pages/JoinInvitePage.tsx`

## Overview

Teams enable collaborative use of MonkeyLearn. A team owner creates Roles (templates containing pre-configured Powers, Actions, and Dimensions), generates invite links, and shares them with participants. When a participant joins, the role template is copied into a new Personality in their account. The owner can then view each member's progress via viewer mode.

## Components

```
TeamsDropdown (in Header)
├── Team list
│   └── TeamItem (name, icon, member count)
│       ├── Role list
│       │   └── RoleItem (name, member list)
│       │       └── MemberItem (name, avatar → viewer mode)
│       ├── "Design Role" button → role context switch
│       └── "Manage" button → TeamSettingsModal
├── "Create Team" button
└── "Join Team" button → JoinTeamModal

JoinInvitePage (/invite/:code)
├── Invite validation
├── Team/role info display
└── Join confirmation
```

### TeamsDropdown

**File**: `src/features/teams/components/TeamsDropdown.tsx`

Header dropdown showing all teams the user owns or is a member of. For each team:
- Team icon + name + member count
- Expandable role list with member details
- "Design Role" switches to role context for template editing
- "Manage" opens TeamSettingsModal for team/role CRUD

### TeamSettingsModal

CRUD form for teams with:
- Team name, icon, icon color
- Role management (create, edit, delete roles)
- Invite link generation
- Member list per role

### RoleSettingsModal

CRUD form for roles with:
- Role name, icon, icon color, theme
- Template data preview (innerfaces, protocols, states count)
- Invite code generation
- Member list with viewer mode access

## Hooks

### useJoinInviteLogic

**File**: `src/features/teams/hooks/useJoinInviteLogic.ts`

Handles the invite join flow for `/invite/:code`:
1. Validate invite code (expiry, single-use)
2. Fetch team and role metadata
3. On confirmation, execute `joinTeam()` batch write

### useRoleForm

**File**: `src/features/teams/hooks/useRoleForm.ts`

Manages role CRUD with template data extraction from the current metadata store state.

## Types

**File**: `src/types/team.ts`

```typescript
interface Team {
  id: string;
  name: string;
  icon?: string;
  iconColor?: string;
  ownerId: string;
  memberUids: string[];
  createdAt: number;
}

interface TeamRole {
  id: string;
  teamId: string;
  name: string;
  icon?: string;
  iconColor?: string;
  currentTheme?: string;
  favThemes?: string[];
  activeInviteCode?: string;
  templateData: RoleTemplate;
}

interface RoleTemplate {
  innerfaces: Innerface[];
  protocols: Protocol[];
  states: StateData[];
  groups: Record<string, { icon: string; color?: string }>;
  protocolGroupOrder: string[];
  innerfaceGroupOrder: Record<string, string[]>;
  pinnedProtocolIds: string[];
}

interface TeamInvite {
  code: string;                 // 8-character alphanumeric lowercase
  teamId: string;
  roleId: string;
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
  singleUse: boolean;
  used?: boolean;
}

interface TeamMembership {
  teamId: string;
  roleId: string;
  personalityId: string;       // Copied personality in user's account
  joinedAt: number;
  invitedBy: string;
}

interface RoleMember {
  uid: string;
  displayName: string;
  icon?: string;
  personalityId: string;
  joinedAt: number;
  lastActiveAt?: number;
}
```

## Store Architecture

### teamStore

**File**: `src/stores/team/teamStore.ts`

Dual subscription: owned teams (`ownerId == uid`) + member teams (`memberUids array-contains uid`). Deduplicates results via Map. Memberships loaded separately from user document.

### roleStore

**File**: `src/stores/team/roleStore.ts`

`roles: Record<teamId, TeamRole[]>`. Role creation uses batch writes to atomically create the role document and all template sub-collections. Role updates perform full replacement (delete old sub-collections, write new ones).

### inviteStore

**File**: `src/stores/team/inviteStore.ts`

On-demand operations (no persistent subscription).

**generateInviteLink(teamId, roleId, uid, options?)**: Creates or reuses a persistent invite code. Writes to `team_invites/{code}` and updates `roles/{roleId}.activeInviteCode`. Returns full URL (`/invite/{code}`).

**joinTeam(uid, inviteCode)**: The most complex operation in the app — a single batch write that:

1. Validates invite (expiry check, single-use check)
2. Creates a new personality from the role template
3. Copies all sub-collections with ID remapping:
   - States: `st-{timestamp}-{index}`
   - Innerfaces: `if-{timestamp}-{index}`
   - Protocols: `pr-{timestamp}-{index}`
4. Remaps all internal references (targets, innerfaceIds, stateIds, goals)
5. Copies groups metadata and settings
6. Adds `TeamMembership` to user document
7. Updates `team.memberUids` with `arrayUnion`
8. Creates `RoleMember` document under the role
9. Marks invite as used (if single-use)

### roleMembersStore

**File**: `src/stores/team/roleMembersStore.ts`

`roleMembers: Record<"{teamId}/{roleId}", RoleMember[]>`. Supports both one-time fetch and real-time subscription. Cache key format: `{teamId}/{roleId}`.

## User Flows

**Create Team**:
1. Owner clicks "Create Team" in TeamsDropdown
2. Fills team name, icon, color
3. `createTeam()` writes team doc with owner as sole member

**Design Role Template**:
1. Owner clicks "Design Role" on a team role
2. `switchToRole(teamId, roleId)` changes active context
3. All UI (Powers, Actions, Dimensions) now edits the role template
4. Changes are saved to `teams/{teamId}/roles/{roleId}/` sub-collections

**Generate Invite**:
1. Owner opens RoleSettingsModal
2. Clicks "Generate Invite Link"
3. `generateInviteLink()` creates/reuses invite code
4. URL copied to clipboard

**Join Team** (via invite):
1. Participant receives `/invite/{code}` link
2. `JoinInvitePage` validates code, shows team/role info
3. On confirmation, `joinTeam()` executes the batch write
4. New personality created with copied template data
5. Auto-switches to the new personality

**View Member Progress**:
1. Owner expands a role's member list in TeamsDropdown
2. Clicks on a member
3. `switchToViewer()` enters read-only viewer mode
4. `ViewerBanner` shows with member name and exit button
