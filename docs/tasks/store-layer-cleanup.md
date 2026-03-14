# Store Layer Cleanup — Task Document

## Quick Context Recovery

1. `docs/tasks/store-layer-cleanup.md` (this file)
2. `CLAUDE.md` (project conventions)
3. `src/stores/metadata/types.ts` (MetadataState interface — 27 methods, PathContext type)
4. `src/stores/metadata/protocolSlice.ts` (representative slice — duplicated helpers, cross-store calls)
5. `src/stores/metadataStore.ts` (store composition, subscriptions)
6. `src/stores/StoreSync.tsx` (orchestration hub)

## Key Decisions (carry forward)

1. **Extract shared helpers first, then decouple.** `getPathRoot` (5 copies), `guardAgainstViewerMode` (4 copies), `showErrorToast` (4 copies) → single source of truth in `src/stores/helpers.ts`. Low risk, zero behavior change.

2. **Stores must not call other stores.** Currently protocolSlice and stateSlice call `useHistoryStore.getState().addSystemEvent()` (6 call sites). Replace with: slice methods return a side-effect descriptor, callers (hooks) execute side effects. This decouples stores and makes testing trivial.

3. **Stores must not show toasts.** 27 `showErrorToast` calls across 4 slices. Replace with: slice methods throw on error (they already do in some paths), callers (hooks) catch and show toasts. Stores become pure state + persistence.

4. **Don't break the API.** All 27 store methods keep the same signatures. Callers (hooks, components) won't change in Phase 1. The refactoring is internal to the store layer.

5. **planningStore.getGoalsCollectionPath is the same pattern as getPathRoot** but with different return format (`/goals` suffix). Extract alongside getPathRoot.

6. **Test the extracted helpers and the decoupled patterns.** pathUtils is pure → unit test. Store error handling → mock test. System event orchestration → hook-level test.

## Agent Orchestration Strategy

**Main context = executor + orchestrator.**

- Phase 1 (helpers) can be done by main context — small, focused
- Phase 2 (decouple side effects) needs careful per-file edits — parallel subagents per slice
- Phase 3 (remove toast coupling) — parallel subagents per slice
- Testing — parallel subagents per test file

## Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Extract shared store helpers | DONE |
| 2 | Decouple cross-store side effects | DONE |
| 3 | Remove UI (toast) coupling from stores | DONE |
| 4 | Test coverage | DONE |
| R | Review | DONE |

## Current Test Count

**12 test files / 166 tests** (after Phase 2 — 1 test merged) — obtain fresh count with `npm run test:run` before each phase.

---

## Phase 1 — Extract Shared Store Helpers

**Goal:** Eliminate 13 duplicate helper definitions across 5 store files. Zero behavior change.

**Critical Context:**
- `getPathRoot()` — identical in 5 files (metadataStore.ts, protocolSlice.ts, innerfaceSlice.ts, stateSlice.ts, groupSlice.ts)
- `guardAgainstViewerMode()` + `isViewerMode()` — identical in 4 slice files
- `showErrorToast()` — identical in 4 slice files (calls useUIStore.getState().showToast)
- `getGoalsCollectionPath()` in planningStore.ts — same logic as getPathRoot + `/goals`
- All duplicates are character-for-character identical

### Tasks

- [x] **T1.1** Create `src/stores/helpers.ts`:
  ```typescript
  import type { PathContext } from './metadata/types';
  import { useUIStore } from './uiStore';

  export const getPathRoot = (context: PathContext | null): string => {
      if (!context) throw new Error('No active context for metadata operation');
      if (context.type === 'personality') return `users/${context.uid}/personalities/${context.pid}`;
      if (context.type === 'viewer') return `users/${context.targetUid}/personalities/${context.personalityId}`;
      return `teams/${context.teamId}/roles/${context.roleId}`;
  };

  export const getCollectionPath = (context: PathContext, collection: string): string => {
      return `${getPathRoot(context)}/${collection}`;
  };

  export const isViewerMode = (context: PathContext | null): boolean =>
      context?.type === 'viewer';

  export const guardAgainstViewerMode = (context: PathContext | null, allowInCoachMode = false): void => {
      if (isViewerMode(context) && !allowInCoachMode) {
          console.warn('[MetadataStore] Blocked mutation in viewer/coach mode');
          throw new Error('Cannot modify data in coach/viewer mode');
      }
  };

  export const showErrorToast = (message: string): void => {
      useUIStore.getState().showToast(message, 'error');
  };
  ```

- [x] **T1.2** Update all 5 metadata files to import from `../helpers` (or `./helpers`):
  - `metadataStore.ts` — remove local getPathRoot (lines 18-27), import from helpers
  - `protocolSlice.ts` — remove getPathRoot (11-16), isViewerMode (18), guardAgainstViewerMode (20-25), showErrorToast (9). Import all from `../helpers`
  - `innerfaceSlice.ts` — same pattern
  - `stateSlice.ts` — same pattern
  - `groupSlice.ts` — same pattern

- [x] **T1.3** Update `planningStore.ts`:
  - Remove local `getGoalsCollectionPath` (lines 14-23)
  - Import `getCollectionPath` from `./helpers`
  - Replace usage: `getGoalsCollectionPath(context)` → `getCollectionPath(context, 'goals')`

### Verification
```bash
npm run typecheck && npm run lint
npm run test:run
# Verify no remaining local definitions:
grep -rn "const getPathRoot" src/stores/ --include="*.ts"     # Should only be in helpers.ts
grep -rn "const guardAgainstViewerMode" src/stores/ --include="*.ts"  # Should only be in helpers.ts
grep -rn "const showErrorToast" src/stores/ --include="*.ts"  # Should only be in helpers.ts
```

---

## Phase 2 — Decouple Cross-Store Side Effects

**Goal:** Remove 6 `useHistoryStore.getState().addSystemEvent()` calls from metadata slices. Stores return "what happened", callers decide side effects.

**Critical Context:**
- protocolSlice: 3 addSystemEvent calls (add, update-link, update-unlink)
- stateSlice: 3 addSystemEvent calls (add-link, update-link, update-unlink)
- System events only fire for personality context (not role/viewer)
- System events are fire-and-forget (no error handling needed)
- Called from: addProtocol, updateProtocol, addState, updateState

### Strategy

Store methods return an optional array of system event descriptors alongside performing their Firestore operations. Calling hooks execute the events.

**Option A (minimal change):** Add an `onSystemEvent` callback parameter to the store.
**Option B (clean):** Store methods return `{ success: boolean, systemEvents?: SystemEventDescriptor[] }`.
**Option C (pragmatic):** Move system event logic to the form hooks that call these methods — they already know the context.

**Decision: Option C.** The form hooks (`useProtocolForm`, `useInnerfaceForm`, `useStateForm`) already have all the context needed. Moving 6 calls from stores to hooks is straightforward and eliminates the `useHistoryStore` import from slices entirely.

### Tasks

- [x] **T2.1** `protocolSlice.ts` — Remove system event logic:
  - Remove `import { useHistoryStore } from '../historyStore'` (line 6)
  - In `addProtocol()` (lines 38-46): remove the system event block. Just do `addDoc` and return `docRef.id`
  - In `updateProtocol()` (lines 62-86): remove the added/removed target diffing and system event block
  - Change `addProtocol` return type to `Promise<string>` (return new doc ID)
  - Change `updateProtocol` to accept and return the target diff info if needed

- [x] **T2.2** `stateSlice.ts` — Remove system event logic:
  - Remove `import { useHistoryStore } from '../historyStore'` (line 6)
  - In `addState()` (lines 38-52): remove system event block
  - In `updateState()` (lines 62-96): remove target diff + system event block

- [x] **T2.3** Move system event logic to form hooks:
  - `useProtocolForm.ts` — after calling `addProtocol()` / `updateProtocol()`, fire system events for linked/unlinked targets
  - `useStateForm.ts` — after calling `addState()` / `updateState()`, fire system events for linked/unlinked innerfaces
  - These hooks already import `useHistoryStore` or can be given access via the auth context

### Verification
```bash
npm run typecheck && npm run lint
npm run test:run
# Verify no remaining cross-store imports in slices:
grep -rn "useHistoryStore" src/stores/metadata/ --include="*.ts"  # Should be 0
```

---

## Phase 3 — Remove UI (Toast) Coupling from Stores

**Goal:** Stores throw errors on failure. Callers (hooks) catch and show toasts. Stores become pure state + persistence.

**Critical Context:**
- 27 `showErrorToast` call sites across 4 slices
- All follow identical pattern: `catch (err) { showErrorToast(message); }`
- Callers (form hooks) already have their own try/catch with toasts
- Some store methods re-throw after toast (inconsistent)

### Strategy

Remove `showErrorToast()` calls from slices. Let errors propagate to callers. Callers already handle errors.

**Risk:** Some store methods are called directly from components (not via hooks). Need to verify all call sites.

### Tasks

- [x] **T3.1** Audit all direct store method callers:
  - Search for `useMetadataStore` usage in components (not hooks)
  - List any component that calls a store method directly
  - These need error handling added at the call site

- [x] **T3.2** Remove `showErrorToast` from all 4 slices:
  - `protocolSlice.ts`: 9 call sites → remove, ensure error is thrown
  - `innerfaceSlice.ts`: 8 call sites → same
  - `stateSlice.ts`: 6 call sites → same
  - `groupSlice.ts`: 4 call sites → same
  - Remove `import { useUIStore }` from all slices
  - Remove `showErrorToast` helper from all slices

- [x] **T3.3** Remove `showErrorToast` from `src/stores/helpers.ts`:
  - After all slices no longer use it, remove the export
  - Remove `import { useUIStore }` from helpers

- [x] **T3.4** Ensure all callers handle errors:
  - Form hooks (useProtocolForm, useInnerfaceForm, useStateForm) — already have try/catch + toast
  - Direct component callers (from T3.1 audit) — add try/catch + toast at call site
  - DnD hooks (reorder operations) — verify error handling

### Verification
```bash
npm run typecheck && npm run lint
npm run test:run
# Verify no remaining UI imports in stores:
grep -rn "useUIStore" src/stores/ --include="*.ts" | grep -v "uiStore.ts" | grep -v ".test."  # Should be 0
grep -rn "showErrorToast" src/stores/ --include="*.ts" | grep -v ".test."  # Should be 0
```

---

## Phase 4 — Test Coverage

**Goal:** Cover extracted helpers, decoupled patterns, and error propagation with tests.

### Tasks

- [x] **T4.1** `src/stores/helpers.test.ts` — Shared helper tests:
  - `getPathRoot()`:
    - personality context → `users/{uid}/personalities/{pid}`
    - role context → `teams/{teamId}/roles/{roleId}`
    - viewer context → `users/{targetUid}/personalities/{personalityId}`
    - null context → throws
  - `getCollectionPath()`:
    - personality + 'goals' → correct path
    - personality + 'protocols' → correct path
  - `guardAgainstViewerMode()`:
    - viewer context → throws
    - viewer context + allowInCoachMode → does NOT throw
    - personality context → does NOT throw
    - role context → does NOT throw
    - null context → does NOT throw (it's not viewer)
  - `isViewerMode()`:
    - viewer → true
    - personality → false
    - role → false
    - null → false

- [x] **T4.2** Update `protocolSlice.test.ts`:
  - Verify addProtocol returns doc ID
  - Verify updateProtocol no longer calls addSystemEvent
  - Verify errors propagate (no toast, error thrown)
  - Remove mock for useHistoryStore if no longer needed

- [x] **T4.3** `src/features/protocols/hooks/useProtocolForm.test.ts` — Form hook tests:
  - After addProtocol: system events created for linked targets
  - After updateProtocol: system events for added/removed targets
  - Error from store → toast shown, error handled
  - Delete → toast shown

- [x] **T4.4** `src/features/innerfaces/hooks/useInnerfaceForm.test.ts` — Same pattern:
  - CRUD operations → correct store calls
  - Error handling → toast shown

- [x] **T4.5** `src/features/dashboard/hooks/useStateForm.test.ts` — Same pattern:
  - After addState: system events for linked innerfaces
  - Error handling → toast shown

### Parallelization
```
T4.1 — SEQUENTIAL FIRST (helpers must exist)
T4.2 + T4.3 + T4.4 + T4.5 — PARALLEL (independent test files)
```

### Verification
```bash
npm run test:run    # All pass
npm run typecheck   # Clean
npm run lint        # Clean
```

---

## Phase R — Review

**Review agent prompt:**
> Review the store layer after cleanup. Check:
> 1. `grep -rn "const getPathRoot" src/stores/` — should only be in helpers.ts
> 2. `grep -rn "const guardAgainstViewerMode" src/stores/` — should only be in helpers.ts
> 3. `grep -rn "useHistoryStore" src/stores/metadata/` — should be 0 (no cross-store imports in slices)
> 4. `grep -rn "useUIStore" src/stores/ | grep -v uiStore.ts | grep -v .test.` — should be 0
> 5. Run `npm run typecheck && npm run lint && npm run test:run` — all clean
> 6. Verify helpers.test.ts covers all exported functions
> 7. Verify form hooks handle errors and show toasts

---

## Baseline Metrics

| Metric | Before | After |
|--------|--------|-------|
| Duplicate getPathRoot | 5 | 1 |
| Duplicate guardAgainstViewerMode | 4 | 1 |
| Duplicate showErrorToast | 4 (27 call sites) | 0 (removed) |
| Cross-store .getState() in slices | 8 | 0 |
| Store → UI coupling (toast calls) | 27 | 0 |
| Test files | 12 | 13 |
| Test cases | 167 | 182 |
