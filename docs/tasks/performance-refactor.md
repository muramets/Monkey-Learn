# Performance & Mobile Optimization — Task Document

## Quick Context Recovery

Read these files in order to recover full context:
1. `docs/tasks/performance-refactor.md` (this file)
2. `CLAUDE.md` (project overview, architecture, conventions)
3. `src/components/layout/AnimatedRoutes.tsx` (routing, page loading, touch detection)
4. `src/features/protocols/components/ProtocolRow.tsx` (heaviest list component)
5. `src/features/protocols/hooks/useScores.ts` (critical business logic — XP, check-ins)
6. `src/App.tsx` (provider hierarchy, root background layer)
7. `vite.config.ts` (build config — currently no code splitting)

## Key Decisions (carry forward)

1. **Test before refactor.** Phase 0 creates a test safety net covering pure utils, core business logic, and Firestore operations. No performance changes until tests pass green.

2. **Code splitting is the highest-impact performance fix.** Current bundle: 2,337 KB / 710 KB gzip — single chunk, zero lazy loading. On iOS Safari, parsing 2.3 MB JS blocks first render.

3. **Framer Motion `layout` is the costliest runtime issue.** Each `layout` prop triggers synchronous `getBoundingClientRect()`. ProtocolRow has 10 nested layout elements × N rows = 10N synchronous DOM reads per list change.

4. **`willChange: 'transform'` on root div in App.tsx is intentional.** Comment says "fix compositing tint issues". Do NOT remove blindly — test on iOS Safari first.

5. **ReactMarkdown `components` objects are identical across 6 files.** Extract to a single shared module-level constant — not `useMemo` (they don't depend on props).

6. **Touch detection must be a singleton, not per-component state.** Current `useTouchDevice` hook creates `useState` + `useEffect` + resize listener per import. Device type doesn't change.

7. **allThemes.ts (2,439 lines) loaded eagerly.** Should be lazy-loaded — themes are only needed when user opens the theme picker.

8. **Firebase mock strategy: `vi.mock('firebase/firestore')` at module level.** All store slices import Firestore functions directly — mock them, not the store methods. Test business logic (score calculation, transaction assembly) separately from network.

## Agent Orchestration Strategy

**Main context = executor + orchestrator.**

- Main agent executes phases sequentially, running verification after each
- Subagents used for parallel file edits within a phase (e.g., Phase 3 transition-all replacements across 52 files)
- Phase 0 subagents can run in parallel per test domain (utils, hooks, stores)
- Review subagent runs after each phase with specific review prompt

## Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| **0** | **Testing Foundation** | **DONE** |
| 1 | Code Splitting & Lazy Loading | DONE |
| 2 | Framer Motion Layout Optimization | DONE |
| 3 | CSS Transition Optimization | DONE |
| 4 | React Rendering Optimization | DONE |
| 5 | Mobile Touch & UX | DONE |
| 6 | GPU & Compositing Cleanup | DONE |
| R | Final Review | DONE |

## Current Test Count

**12 test files / 167 tests** (after Phase 0) — obtain fresh count with `npm run test:run` before each phase.

---

## Phase 0 — Testing Foundation

**Goal:** Cover critical business logic and data layer with tests BEFORE any refactoring. This is the safety net that catches regressions.

**Critical Context:**
- Currently 3 test files: sanity.test.ts (2 tests), FilterDropdown.test.tsx (11 tests), EntitySelector.test.tsx (7 tests)
- Vitest configured with jsdom, globals, CSS support
- No Firebase mocking infrastructure exists yet
- Pure utility functions are the easiest and highest-value targets
- The check-in transaction (historyStore.addCheckin) is the most critical path — if refactoring breaks this, users lose data

**What NOT to test (diminishing returns):**
- UI-only components with no business logic (pure layout/styling)
- Third-party library behavior (Framer Motion, Radix, dnd-kit)
- CSS transitions and animations (manual verification)
- StoreSync orchestration (integration test territory — too complex for safety-net scope)

### Wave 0A — Pure Utility Functions (zero mocking needed)

- [x] **T0A.1** `src/utils/xpUtils.test.ts` — XP & Level system:
  - `calculateLevel()`: 0 XP, 99 XP (just below level up), 100 XP (exact level), 545 XP, negative XP edge case
  - `scoreToXP()`: 0, 5.45 → 545, fractional rounding (0.005 → 1?)
  - `xpToScore()`: 0, 545 → 5.45, 1 → 0.01
  - `calculateWeightedLevel()`: empty array, single innerface, mixed priorities (low/medium/high), deleted innerface filtering, all-zero scores
  - Import constants `XP_PER_LEVEL`, `PRIORITY_WEIGHTS` and verify values

- [x] **T0A.2** `src/utils/colorUtils.test.ts` — Color tier system:
  - `getScoreColor()`: score 0 (red), 3.5 (gold), 6 (green), 10 (purple), 20+ (blue), boundary values (exactly 3, 6, 9, 19)
  - `getInterpolatedColor()`: within-tier, cross-tier boundary, level 0, high level
  - `interpolateColor()`: same color → same, black→white factor 0.5 → mid gray
  - `getTierColor()`: each tier boundary
  - `getLevelGradient()`: same level, cross-tier span

- [x] **T0A.3** `src/utils/weeklyProgressUtils.test.ts` — Weekly progress:
  - `getWeeklyProgress()`: no goals, single goal, multiple goals with varied frequencies, history records spanning the week, high-freq vs low-freq classification (threshold 0.8/week)
  - `getProgressDots()`: planned 5 / completed 3 / maxDots 7, edge cases (0 planned, completed > planned)
  - `getDailyCheckIns()`: empty history, history with multiple days, multiple checkins same day, full week
  - Note: uses `date-fns` — test with deterministic dates (mock `Date.now()` or pass dates explicitly)

- [x] **T0A.4** `src/utils/markdownUtils.test.ts` — Markdown parsing:
  - `parseMarkdownSections()`: empty string, no headers, single H1, nested H2/H3, preamble before first header
  - `nestMarkdownSections()`: flat list, proper nesting, out-of-order levels (H3 before H2)

- [x] **T0A.5** `src/utils/themeManager.test.ts` — Pure subset only:
  - `hexToRgb()`: valid hex (#ffffff → "255 255 255"), shorthand (#fff), invalid input
  - `hexToHSL()`: pure black, pure white, primary red/green/blue, known hex → expected HSL
  - Skip DOM-dependent functions (applyTheme, setTheme, initTheme) — these are tested manually

### Wave 0B — Core Business Logic Hooks (mock stores, no Firebase)

- [x] **T0B.1** Create `src/test/mocks/firebase.ts` — shared Firebase mock:
  ```typescript
  // Mock factory for firebase/firestore
  vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    addDoc: vi.fn(),
    writeBatch: vi.fn(() => ({ set: vi.fn(), update: vi.fn(), delete: vi.fn(), commit: vi.fn() })),
    runTransaction: vi.fn(),
    onSnapshot: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    increment: vi.fn((n) => ({ _increment: n })),
    Timestamp: { now: vi.fn(() => ({ toDate: () => new Date() })) },
    serverTimestamp: vi.fn(),
  }));
  ```
  Also create `src/test/mocks/stores.ts` — mock factories for Zustand stores (personality, metadata, history, ui)

- [x] **T0B.2** `src/features/protocols/hooks/useScores.test.ts` — Score calculation logic:
  - Test pure calculation functions extracted from the hook:
    - `calculateInnerfaceScore(innerfaceId)` given innerfaces array → correct score
    - `calculateStateScore(stateId)` given states + innerfaces → correct recursive average
    - `calculateStateScore()` with cycle detection → no infinite loop
    - `calculateInnerfaceScoreAtDate(innerfaceId, date)` given history → correctly reverses changes after target date
    - `calculateStateScoreAtDate(stateId, date)` → same pattern
  - Test `innerfacesWithScores` memoization: same input → same reference
  - Test `statesWithScores` memoization with invalid child reference filtering
  - Note: `applyProtocol()` is the Firebase transaction path — tested in Wave 0C

- [x] **T0B.3** `src/features/planning/hooks/usePlanningLogic.test.ts` — Planning logic (if complex enough):
  - Target score manipulation: increment/decrement within bounds
  - Action count filtering: deactivated protocols set to 0 on save
  - Progress bar snap calculation: raw value → snapped to 0.1 precision
  - Skip: DOM interaction (mouse tracking), store writes (Wave 0C)

### Wave 0C — Store Operations (mock Firebase, test business logic)

- [x] **T0C.1** `src/stores/historyStore.test.ts` — Check-in transaction (CRITICAL PATH):
  - `addCheckin()` — verify transaction assembles correct writes:
    - History record created with correct fields (protocolId, direction, weight, targets, timestamp)
    - Innerface scores updated: `newScore = Math.max(0, currentScore + weight)`
    - Personality stats updated: totalCheckins incremented, totalXP updated, daily/monthly counters
    - Negative score protection: weight that would drop below 0 → score stays at 0
  - `deleteCheckin()` — verify transaction reverses:
    - History record deleted
    - Innerface scores decremented
    - Personality stats decremented
  - `updateCheckinComment()` — verify comment field updated
  - Mock `runTransaction` to capture the transaction function and call it with mock `transaction` object
  - Test error path: transaction throws → verify no state corruption

- [x] **T0C.2** `src/stores/metadata/protocolSlice.test.ts` — Protocol CRUD:
  - `addProtocol()` — verify `addDoc` called with correct collection + data
  - `updateProtocol()` — verify `updateDoc` called with correct fields
  - `deleteProtocol()` — verify soft delete: `writeBatch` sets `deletedAt`, removes from pinned
  - `restoreProtocol()` — verify `deletedAt` removed
  - `reorderProtocols()` — verify batch write with new order indices
  - `guardAgainstViewerMode()` — verify mutations blocked in viewer context

- [x] **T0C.3** `src/stores/metadata/innerfaceSlice.test.ts` — Innerface CRUD:
  - Same pattern as T0C.2: add, update, soft delete, restore, reorder
  - `initialScore` handling: new innerface gets initialScore, affects XP calculation
  - Priority weight validation: low/medium/high

- [x] **T0C.4** `src/stores/planningStore.test.ts` — Planning CRUD:
  - `setGoal()` — verify `setDoc` with merge called, goal keyed by innerfaceId
  - `deleteGoal()` — verify `deleteDoc` called
  - Path context resolution: personality vs role vs viewer → correct Firestore path

### Parallelization
```
Wave 0A: T0A.1 + T0A.2 + T0A.3 + T0A.4 + T0A.5 — ALL PARALLEL (zero dependencies)
         ↓ (must pass before 0B starts — confirms test infra works)
Wave 0B: T0B.1 — SEQUENTIAL FIRST (creates shared mocks)
         T0B.2 + T0B.3 — PARALLEL (independent hooks)
         ↓
Wave 0C: T0C.1 — SEQUENTIAL FIRST (most critical path)
         T0C.2 + T0C.3 + T0C.4 — PARALLEL (independent store slices)
```

### Verification
```bash
npm run test:run                    # ALL tests pass
npm run test:run -- --coverage      # Review coverage report (optional but recommended)
npm run typecheck && npm run lint   # No type errors in test files
```

**Target:** 15+ test files, 100+ test cases. Coverage of every pure util function, core hook calculation, and Firestore write operation.

### Review Gate

**Review agent prompt:**
> Review the test suite created in Phase 0. Check:
> 1. Are all pure functions in `src/utils/` covered? Run `grep -r "export" src/utils/*.ts` and verify each export has corresponding test cases.
> 2. Do store tests mock Firebase at the module level and verify the ARGUMENTS passed to Firestore functions (not just that they were called)?
> 3. Does `historyStore.test.ts` cover the negative-score edge case (`Math.max(0, ...)`)?
> 4. Does `useScores.test.ts` test cycle detection in `calculateStateScore()`?
> 5. Are there tests for the `guardAgainstViewerMode()` pattern?
> 6. Do `weeklyProgressUtils` tests use deterministic dates (not `new Date()`)?
> 7. Run `npm run test:run` — all green, no skipped tests.

Fix all findings before moving to Phase 1.

### MANDATORY: Update this file before proceeding
- [ ] Mark tasks complete
- [ ] Update Phase 0 status → DONE
- [ ] Record test count (target: 100+)
- [ ] Record coverage percentages for utils/

---

## Phase 1 — Code Splitting & Lazy Loading

**Goal:** Reduce initial JS payload from 2,337 KB to <500 KB main chunk via route-level code splitting and heavy-dependency lazy loading.

**Critical Context:**
- AnimatedRoutes.tsx imports ALL pages eagerly (lines 7-13) — no `React.lazy()` anywhere
- `vite.config.ts` has no `manualChunks` config
- `allThemes.ts` is 2,439 lines loaded at startup
- Tiptap (11 packages) is imported even on pages that don't use the editor
- Firebase is a single import — should be split into auth vs firestore

### Tasks

- [x] **T1.1** Add `manualChunks` to `vite.config.ts` to split vendor bundles:
  - `firebase` → `vendor-firebase`
  - `framer-motion` → `vendor-animation`
  - `@tiptap/*` → `vendor-editor`
  - `@radix-ui/*` → `vendor-ui`
  - `@fortawesome/*` + `lucide-react` → `vendor-icons`
  - `react-markdown` + `rehype-raw` + `marked` + `turndown` → `vendor-markdown`
  - Remaining `node_modules` → `vendor-core`

- [x] **T1.2** Convert page imports in `AnimatedRoutes.tsx` to `React.lazy()`:
  - `const Dashboard = React.lazy(() => import('../../pages/dashboard/DashboardPage'))`
  - Same for: ProtocolsList, InnerfacesPage, HistoryPage, SettingsPage, LoginPage, JoinInvitePage
  - Wrap `<Routes>` in `<Suspense fallback={<GlobalLoader />}>`
  - Preserve existing AnimatedPage / AnimatePresence logic for touch devices

- [x] **T1.3** Lazy-load `allThemes.ts`:
  - In `themeManager.ts`, replace static import with `const themes = await import('../styles/allThemes')`
  - Theme list only needed when user opens theme picker in Settings
  - Keep current theme in localStorage — only load full list on demand
  - Ensure `initTheme()` in `App.tsx` still works (it reads from localStorage, not allThemes)

- [x] **T1.4** Lazy-load Tiptap editor:
  - `RichTextEditor` is only used in modals (ProtocolSettingsModal, InnerfaceSettingsModal)
  - Wrap the `RichTextEditor` import in `React.lazy()` at the modal level
  - Add `<Suspense>` with a simple loading skeleton

### Parallelization
```
T1.1 — SEQUENTIAL FIRST (vite config must be set before measuring)
T1.2 + T1.3 + T1.4 — PARALLEL subagents (independent file changes)
```

### Verification
```bash
npm run typecheck && npm run lint
npm run build 2>&1 | tail -20          # Check new chunk sizes, no warnings
npm run test:run                        # Regression against Phase 0 tests
```

**Target:** Main chunk < 500 KB. Total initial load (main + vendor-core) < 800 KB gzip.

### MANDATORY: Update this file before proceeding
- [ ] Mark tasks complete
- [ ] Update Phase 1 status → DONE
- [ ] Record build output (chunk sizes)
- [ ] Record test count

---

## Phase 2 — Framer Motion Layout Optimization

**Goal:** Reduce synchronous DOM reads from 10N to 2N per list update (N = number of ProtocolRows).

**Critical Context:**
- ProtocolRow.tsx: 10 `layout={!isOverlay}` elements. Only the root `motion.div` (line 396) truly needs layout animation for list reordering. Inner elements animate RELATIVE to the row — they don't need layout.
- QuickActionCard.tsx: 3 `layout={!isDragging}` elements. Same pattern — only root needs it.
- The `isOverlay` / `isDragging` guard already disables layout for drag overlays — good pattern.
- ProtocolRow uses `<AnimatePresence mode='popLayout'>` for innerface icons — this is fine, it's enter/exit, not layout.

### Tasks

- [x] **T2.1** `ProtocolRow.tsx` — Remove `layout` from inner elements:
  - Line 214 (`renderMainContent` grid): remove `layout`
  - Line 219 (identity group): remove `layout`
  - Line 220 (icon): remove `layout`
  - Line 288 (weight indicator): remove `layout`
  - Line 312 (targets & actions group): remove `layout`
  - Line 314 (target icons wrapper): remove `layout`
  - Line 329 (each innerface icon): remove `layout`
  - Line 346 (innerface wrapper): remove `layout`
  - Line 366 (edit/history buttons): remove `layout`
  - **Keep** `layout={!isOverlay}` ONLY on root `motion.div` (line 396)
  - The icon marginLeft animation (line 222) already uses `animate={{ marginLeft }}` — works without `layout`

- [x] **T2.2** `QuickActionCard.tsx` — Remove `layout` from inner elements:
  - Line 194 (icon+title container): remove `layout`
  - Line 207 (icon): remove `layout`
  - Line 227 (title span): remove `layout`
  - These use `animate` prop for scale/spring effects — works without `layout`
  - No root-level layout needed here (cards are in CSS grid, not reordered via Framer)

### Parallelization
```
T2.1 + T2.2 — PARALLEL subagents (independent files)
```

### Verification
```bash
npm run typecheck && npm run lint
npm run test:run
```

**Manual verification required:**
- Actions page: reorder protocols via drag-and-drop — rows should animate smoothly to new positions
- Actions page: hover/tap protocol row — +/- indicators, innerface icons, and edit buttons should still animate
- Dashboard: quick action cards — scale/tilt feedback should work

### MANDATORY: Update this file before proceeding
- [ ] Mark tasks complete
- [ ] Update Phase 2 status → DONE
- [ ] Record test count

---

## Phase 3 — CSS Transition Optimization

**Goal:** Replace `transition-all` with specific transition properties across 52 files (144 occurrences).

**Critical Context:**
- Each `transition-all` in Tailwind maps to `transition-property: all`. Replacing with `transition-colors`, `transition-opacity`, `transition-transform`, or combined `transition-[opacity,transform]` reduces browser work.
- Some elements animate MULTIPLE properties — inspect what actually changes before choosing the replacement.
- Common patterns:
  - `opacity` only → `transition-opacity`
  - `color`/`background-color` only → `transition-colors`
  - `transform` (scale, translate, rotate) only → `transition-transform`
  - `opacity` + `transform` → `transition-[opacity,transform]`
  - `opacity` + `colors` + `transform` → `transition-[opacity,color,background-color,transform]`
  - `box-shadow` + `colors` → `transition-[color,background-color,box-shadow]`
- Keep the existing `duration-*` classes — only change the property.
- If `isDragging` / `isDisabled` conditionally removes transition entirely (e.g., `${!isDragging ? 'transition-all duration-300' : ''}`), preserve that pattern.

### Tasks

- [x] **T3.1** Top 10 files (80 occurrences):
  - `InnerfaceCard.tsx` (12) — analyze and replace
  - `InnerfaceSettingsModal.tsx` (11) — analyze and replace
  - `QuickActionCard.tsx` (9) — analyze and replace
  - `ProtocolRow.tsx` (8) — analyze and replace
  - `PlanningActionList.tsx` (8) — analyze and replace
  - `StateCard.tsx` (8) — analyze and replace
  - `FilterDropdown.tsx` (6) — analyze and replace
  - `GroupDropdown.tsx` (5) — analyze and replace
  - `UserProfile.tsx` (5) — analyze and replace
  - `ProtocolsFilterDropdown.tsx` (4) — analyze and replace

- [x] **T3.2** Remaining 42 files (64 occurrences):
  - Batch replace by pattern — most are `transition-all duration-200` or `transition-all duration-300`
  - Read each file, determine what property changes, replace accordingly

### Parallelization
```
T3.1 + T3.2 — PARALLEL subagents (split by file set)
Within T3.1: can further split into 2-3 subagents by file groups
```

### Verification
```bash
npm run typecheck && npm run lint
npm run test:run
# Verify no transition-all remains:
grep -r "transition-all" src/ --include="*.tsx" | wc -l  # Should be 0
```

**Manual verification:** Hover effects, shake/tilt animations, color transitions should look identical to before.

### MANDATORY: Update this file before proceeding
- [ ] Mark tasks complete
- [ ] Update Phase 3 status → DONE
- [ ] Record remaining transition-all count (target: 0)
- [ ] Record test count

---

## Phase 4 — React Rendering Optimization

**Goal:** Reduce unnecessary re-renders in list-rendered components via memoization and stable references.

**Critical Context:**
- Already memoized (11 components): ProtocolRow, DraggableProtocolItem, ProtocolGroup, ProtocolInstructionViewer, ProtocolInstructionInput, ProtocolsDragOverlay, DraggableInnerfaceItem, InnerfaceGroup, InnerfacesDragOverlay, InnerfacesList/CategorySection, RichTextViewer
- NOT memoized but rendered in lists: **QuickActionCard**, **StateCard**, **InnerfaceCard**, **HistoryEvent**

### Tasks

- [x] **T4.1** Extract shared ReactMarkdown `components` config:
  - Create `src/utils/markdownComponents.tsx`
  - Export `MARKDOWN_TOOLTIP_COMPONENTS` as module-level `const` (the object used in tooltips across 6 files)
  - Replace inline `components={{...}}` in:
    - `ProtocolRow.tsx` (line 269)
    - `QuickActionCard.tsx` (line 306)
    - `InnerfaceCard.tsx`
    - `StateCard.tsx`
    - `ProtocolInstructionViewer.tsx`
    - `RichTextViewer.tsx` (check if same pattern or different)

- [x] **T4.2** Add `React.memo` to list-rendered components:
  - `QuickActionCard.tsx` — wrap: `export const QuickActionCard = React.memo(function QuickActionCard(...) { ... })`
  - `HistoryEvent.tsx` — same pattern
  - `StateCard.tsx` — same pattern (rendered in dashboard grid)
  - `InnerfaceCard.tsx` — same pattern

- [x] **T4.3** Fix touch detection singleton:
  - Refactor `src/hooks/useTouchDevice.ts`:
    ```typescript
    const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches
      || 'ontouchstart' in window
      || navigator.maxTouchPoints > 0;
    export const useTouchDevice = () => IS_TOUCH;
    ```
  - Remove `useState`, `useEffect`, resize listener
  - Remove duplicated logic in `AnimatedRoutes.tsx:72-86` — import `useTouchDevice` instead
  - Verify: imported in ProtocolRow, QuickActionCard, InnerfaceCard, AnimatedRoutes

### Parallelization
```
T4.1 + T4.2 + T4.3 — PARALLEL subagents (independent concerns)
```

### Verification
```bash
npm run typecheck && npm run lint
npm run test:run
```

### MANDATORY: Update this file before proceeding
- [ ] Mark tasks complete
- [ ] Update Phase 4 status → DONE
- [ ] Record test count

---

## Phase 5 — Mobile Touch & UX

**Goal:** Fix swipe navigation conflicts and improve touch interaction quality.

**Critical Context:**
- `useSwipeNavigation.ts` attaches global touchstart/touchend listeners — conflicts with DnD, scrolling, horizontal text input
- Used only in `Layout.tsx`
- Current guards: MIN_SWIPE_DISTANCE (50px), MAX_VERTICAL_DISTANCE (50px)
- Missing: edge detection, DnD exclusion, touchmove progressive detection

### Tasks

- [x] **T5.1** Refactor `useSwipeNavigation.ts` — edge-only swipe:
  - Only trigger navigation when `touchStart.x < 20px` (left edge) or `touchStart.x > window.innerWidth - 20px` (right edge)
  - Add `touchmove` listener for real-time direction detection (don't wait for `touchend`)
  - Add data-attribute exclusion: if touch target or ancestor has `[data-no-swipe]`, skip
  - Keep existing vertical distance guard
  - Consider: add visual indicator (subtle edge highlight) when swipe starts from edge

- [x] **T5.2** Add `data-no-swipe` to DnD zones:
  - `ProtocolsList.tsx` — wrapper around sortable list
  - `InnerfacesList.tsx` — wrapper around sortable list
  - Dashboard quick actions grid (if sortable)

- [x] **T5.3** Touch target audit (44x44px minimum):
  - Navigation spacers — increase hit area
  - ProtocolRow edit/history buttons (currently `w-6 h-6` = 24px) — add `min-w-[44px] min-h-[44px]` with padding or pseudo-element
  - QuickActionCard delete button (currently `w-5 h-5` = 20px) — same
  - Instruction expand button in ProtocolRow (currently `w-5 h-5`) — same
  - Use touch-only expansion: `@media (pointer: coarse) { min-width: 44px; min-height: 44px; }`

### Parallelization
```
T5.1 — SEQUENTIAL FIRST (swipe logic changes)
T5.2 + T5.3 — PARALLEL subagents (independent markup changes)
```

### Verification
```bash
npm run typecheck && npm run lint
npm run test:run
```

**Manual verification (iOS Safari required):**
- Swipe from left edge of screen → navigates to previous page
- Swipe in the middle of screen → does NOT trigger navigation
- Drag-and-drop protocols → no accidental page navigation
- Vertical scrolling → no interference
- All buttons tappable without misclick

### MANDATORY: Update this file before proceeding
- [ ] Mark tasks complete
- [ ] Update Phase 5 status → DONE
- [ ] Record test count

---

## Phase 6 — GPU & Compositing Cleanup

**Goal:** Reduce GPU memory usage and eliminate expensive mobile GPU operations.

**Critical Context:**
- `willChange: 'transform'` found in 8 places. On draggable items it's valid (DnD uses transform). On App.tsx root div it's permanent reservation.
- `backdrop-blur` found in 7 places — extremely expensive on mobile Safari.
- The root div `willChange` in App.tsx was added to fix "compositing tint issues" — test removal carefully.

### Tasks

- [x] **T6.1** `backdrop-blur` → solid fallback on touch devices:
  - For each of 7 occurrences, add a Tailwind media query variant:
    - `backdrop-blur-sm` → `[@media(hover:hover)]:backdrop-blur-sm bg-black/70` (solid fallback for touch)
    - Or use a CSS class approach in `index.css`:
      ```css
      @media (hover: none) {
        .blur-fallback { backdrop-filter: none !important; background-color: rgba(0,0,0,0.75); }
      }
      ```
  - Files: CommentInputOverlay.tsx:59, PlanningActionList.tsx:317, InnerfacesDragOverlay.tsx:73+101, ProtocolInstructionViewer.tsx:169+228, RichTextEditor.tsx:149

- [x] **T6.2** Audit `willChange` usage:
  - **App.tsx:69** — Test removal on iOS Safari. If tinting returns, replace with `contain: strict` or `contain: paint`.
  - **DraggableProtocolItem.tsx:39, DraggableInnerfaceItem.tsx:26** — Keep (active during DnD transform)
  - **ProtocolGroup.tsx:91, InnerfaceGroup.tsx:162** — Evaluate: do these animate? If only on reorder, apply `willChange` dynamically via DnD state
  - **InnerfacesList.tsx:65** — Evaluate: is this a scrollable container? If so, `willChange` is valid
  - **AddQuickActionModal.tsx:64, InnerfaceSettingsModal.tsx:113** — Remove (modals are transient, no persistent GPU reservation needed)

### Parallelization
```
T6.1 + T6.2 — PARALLEL subagents (independent concerns)
```

### Verification
```bash
npm run typecheck && npm run lint
npm run test:run
```

**Manual verification (iOS Safari required):**
- Open/close modals — no visual glitch, no tinting artifact
- Theme transitions — background color changes cleanly (no flash/tint)
- Overlays — solid background looks correct on mobile

### MANDATORY: Update this file before proceeding
- [ ] Mark tasks complete
- [ ] Update Phase 6 status → DONE
- [ ] Record test count

---

## Phase R — Final Review

### R1: Architecture Review

**Review agent prompt:**
> Review the codebase after performance refactoring. Check:
> 1. Run `npm run test:run` — all tests pass, count matches expectation.
> 2. Are all page routes lazy-loaded? Verify no eager imports in AnimatedRoutes.tsx.
> 3. Run `npm run build` — are all chunks under 500 KB? Is the main chunk reasonable?
> 4. Search for remaining `transition-all` — should be 0 in .tsx files.
> 5. Search for `layout={` in Framer Motion — should only be on root drag containers, not inner elements.
> 6. Verify `useTouchDevice` is now a singleton (no useState/useEffect/resize listener).
> 7. Verify ReactMarkdown `components` objects are shared, not inline.
> 8. Check that `backdrop-blur` has touch device fallbacks everywhere.
> 9. Verify test coverage: every pure util function, core hook calculation, and Firestore write operation has tests.

Fix all findings before R2.

### R2: Production Readiness Review

**Review agent prompt:**
> Final review before shipping. Check:
> 1. `npm run typecheck && npm run lint` — zero errors, zero warnings.
> 2. `npm run build` — successful, no warnings except expected ones.
> 3. `npm run test:run` — all pass, no skipped.
> 4. Verify no `console.log` or debug code was left behind.
> 5. Verify all lazy-loaded components have appropriate `<Suspense>` fallbacks.
> 6. Verify the app loads on a fresh browser (no localStorage) without errors.
> 7. Check that the root div `willChange` change (if made) doesn't cause visual regression.
> 8. Spot-check 3 test files: are assertions meaningful (not just "expect(true).toBe(true)")?

### MANDATORY: Update this file after final review
- [ ] Update Phase R status → DONE
- [ ] Record final build output (chunk sizes)
- [ ] Record final test count
- [ ] Compare before/after: bundle size, chunk count, test count

---

## Baseline Metrics (record before starting)

| Metric | Before | After |
|--------|--------|-------|
| Total JS bundle (min) | 2,337 KB | 163 KB main + 19 chunks |
| Total JS bundle (gzip) | 710 KB | 44 KB main |
| Chunk count | 1 | 20 |
| Test files | 3 | 12 |
| Test cases | 20 | 167 |
| `transition-all` count | 144 | 0 |
| Framer `layout` count | 13 | 1 |
| `backdrop-blur` without fallback | 7 | 0 |
| `willChange` permanent | 8 | 5 (DnD only) |
