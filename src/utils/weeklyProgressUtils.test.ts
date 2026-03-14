import { getProgressDots, getWeeklyProgress, getDailyCheckIns } from './weeklyProgressUtils';
import type { Protocol } from '../features/protocols/types';
import type { PlanningGoal } from '../features/planning/types';
import type { Innerface } from '../features/innerfaces/types';
import type { HistoryRecord } from '../types/history';

// Fixed date: Wednesday 2026-03-11 12:00 UTC
// Current week: Mon 2026-03-09 through Sun 2026-03-15
const FIXED_NOW = '2026-03-11T12:00:00.000Z';

// ---------------------------------------------------------------------------
// Helpers to build minimal valid objects
// ---------------------------------------------------------------------------

function makeProtocol(overrides: Partial<Protocol> & { id: string | number }): Protocol {
  return {
    title: 'Protocol',
    description: '',
    icon: '🔧',
    weight: 0.05,
    targets: [],
    ...overrides,
  };
}

function makeInnerface(overrides: Partial<Innerface> & { id: string | number }): Innerface {
  return {
    name: 'Innerface',
    icon: '🧠',
    initialScore: 0,
    ...overrides,
  };
}

function makeGoal(overrides: Partial<PlanningGoal> & { innerfaceId: string | number }): PlanningGoal {
  return {
    targetScore: 5,
    balance: {},
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function makeHistory(overrides: Partial<HistoryRecord> & { id: string }): HistoryRecord {
  return {
    type: 'protocol',
    protocolId: '',
    protocolName: '',
    protocolIcon: '',
    timestamp: FIXED_NOW,
    weight: 0.05,
    targets: [],
    changes: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getProgressDots
// ---------------------------------------------------------------------------

describe('getProgressDots', () => {
  it('planned 3, completed 2, maxDots 5 → 3 dots, first 2 filled', () => {
    const dots = getProgressDots(3, 2, 5);
    expect(dots).toEqual([
      { filled: true, bonus: false },
      { filled: true, bonus: false },
      { filled: false, bonus: false },
    ]);
  });

  it('planned 3, completed 5, maxDots 5 → 5 dots, first 3 filled not bonus, next 2 filled bonus', () => {
    const dots = getProgressDots(3, 5, 5);
    expect(dots).toEqual([
      { filled: true, bonus: false },
      { filled: true, bonus: false },
      { filled: true, bonus: false },
      { filled: true, bonus: true },
      { filled: true, bonus: true },
    ]);
  });

  it('planned 0, completed 0 → empty array', () => {
    expect(getProgressDots(0, 0)).toEqual([]);
  });

  it('planned 3, completed 0 → 3 unfilled dots', () => {
    const dots = getProgressDots(3, 0, 5);
    expect(dots).toEqual([
      { filled: false, bonus: false },
      { filled: false, bonus: false },
      { filled: false, bonus: false },
    ]);
  });

  it('completed > maxDots → capped at maxDots', () => {
    const dots = getProgressDots(2, 10, 5);
    expect(dots).toHaveLength(5);
    // All 5 should be filled; first 2 not bonus, rest bonus
    expect(dots).toEqual([
      { filled: true, bonus: false },
      { filled: true, bonus: false },
      { filled: true, bonus: true },
      { filled: true, bonus: true },
      { filled: true, bonus: true },
    ]);
  });

  it('planned 2, completed 2 → 2 filled, no bonus', () => {
    const dots = getProgressDots(2, 2);
    expect(dots).toEqual([
      { filled: true, bonus: false },
      { filled: true, bonus: false },
    ]);
  });
});

// ---------------------------------------------------------------------------
// getWeeklyProgress
// ---------------------------------------------------------------------------

describe('getWeeklyProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty array when there are no goals', () => {
    const result = getWeeklyProgress({}, [], [], []);
    expect(result).toEqual([]);
  });

  it('single goal, single high-freq protocol (3/week), 2 completions this week', () => {
    const goals: Record<string, PlanningGoal> = {
      iface1: makeGoal({
        innerfaceId: 'iface1',
        actionCounts: { proto1: 3 },
      }),
    };
    const protocols: Protocol[] = [
      makeProtocol({ id: 'proto1', title: 'Run', icon: '🏃', weight: 0.05, targets: ['iface1'] }),
    ];
    const innerfaces: Innerface[] = [
      makeInnerface({ id: 'iface1', name: 'Fitness', icon: '💪' }),
    ];
    const history: HistoryRecord[] = [
      makeHistory({ id: 'h1', protocolId: 'proto1', timestamp: '2026-03-10T10:00:00.000Z', weight: 0.05 }),
      makeHistory({ id: 'h2', protocolId: 'proto1', timestamp: '2026-03-11T08:00:00.000Z', weight: 0.05 }),
    ];

    const result = getWeeklyProgress(goals, history, protocols, innerfaces);

    expect(result).toHaveLength(1);
    expect(result[0].planned).toBe(3);
    expect(result[0].completed).toBe(2);
    expect(result[0].isLowFrequency).toBe(false);
    expect(result[0].bonus).toBe(0);
    expect(result[0].protocolId).toBe('proto1');
  });

  it('low frequency protocol (0.5/week) is flagged as low frequency', () => {
    const goals: Record<string, PlanningGoal> = {
      iface1: makeGoal({
        innerfaceId: 'iface1',
        actionCounts: { proto1: 0.5 },
      }),
    };
    const protocols: Protocol[] = [
      makeProtocol({ id: 'proto1', title: 'Monthly Review', targets: ['iface1'] }),
    ];
    const innerfaces: Innerface[] = [
      makeInnerface({ id: 'iface1', name: 'Reflection' }),
    ];

    const result = getWeeklyProgress(goals, [], protocols, innerfaces);

    expect(result).toHaveLength(1);
    expect(result[0].isLowFrequency).toBe(true);
    expect(result[0].planned).toBe(1); // Math.ceil(0.5)
  });

  it('negative weight check-ins are skipped', () => {
    const goals: Record<string, PlanningGoal> = {
      iface1: makeGoal({
        innerfaceId: 'iface1',
        actionCounts: { proto1: 3 },
      }),
    };
    const protocols: Protocol[] = [
      makeProtocol({ id: 'proto1', targets: ['iface1'] }),
    ];
    const innerfaces: Innerface[] = [
      makeInnerface({ id: 'iface1', name: 'Test' }),
    ];
    const history: HistoryRecord[] = [
      makeHistory({ id: 'h1', protocolId: 'proto1', timestamp: '2026-03-10T10:00:00.000Z', weight: 0.05 }),
      makeHistory({ id: 'h2', protocolId: 'proto1', timestamp: '2026-03-11T08:00:00.000Z', weight: -0.05 }),
    ];

    const result = getWeeklyProgress(goals, history, protocols, innerfaces);

    expect(result[0].completed).toBe(1); // Only the positive-weight record counts
  });

  it('history outside current week is not counted', () => {
    const goals: Record<string, PlanningGoal> = {
      iface1: makeGoal({
        innerfaceId: 'iface1',
        actionCounts: { proto1: 3 },
      }),
    };
    const protocols: Protocol[] = [
      makeProtocol({ id: 'proto1', targets: ['iface1'] }),
    ];
    const innerfaces: Innerface[] = [
      makeInnerface({ id: 'iface1', name: 'Test' }),
    ];
    const history: HistoryRecord[] = [
      // Previous week (Sunday March 8)
      makeHistory({ id: 'h1', protocolId: 'proto1', timestamp: '2026-03-08T10:00:00.000Z', weight: 0.05 }),
      // Next week (Monday March 16)
      makeHistory({ id: 'h2', protocolId: 'proto1', timestamp: '2026-03-16T10:00:00.000Z', weight: 0.05 }),
    ];

    const result = getWeeklyProgress(goals, history, protocols, innerfaces);

    expect(result[0].completed).toBe(0);
  });

  it('multiple goals contributing to same protocol sum the weekly rate', () => {
    const goals: Record<string, PlanningGoal> = {
      iface1: makeGoal({
        innerfaceId: 'iface1',
        actionCounts: { proto1: 2 },
      }),
      iface2: makeGoal({
        innerfaceId: 'iface2',
        actionCounts: { proto1: 3 },
      }),
    };
    const protocols: Protocol[] = [
      makeProtocol({ id: 'proto1', title: 'Run', targets: ['iface1', 'iface2'] }),
    ];
    const innerfaces: Innerface[] = [
      makeInnerface({ id: 'iface1', name: 'Fitness' }),
      makeInnerface({ id: 'iface2', name: 'Endurance' }),
    ];

    const result = getWeeklyProgress(goals, [], protocols, innerfaces);

    expect(result).toHaveLength(1);
    // totalWeeklyRate = 2 + 3 = 5, Math.ceil(5) = 5
    expect(result[0].planned).toBe(5);
    expect(result[0].linkedGoals).toHaveLength(2);
  });

  it('weeklyRate > 7 results in isCapped true and planned capped at 7', () => {
    const goals: Record<string, PlanningGoal> = {
      iface1: makeGoal({
        innerfaceId: 'iface1',
        actionCounts: { proto1: 10 },
      }),
    };
    const protocols: Protocol[] = [
      makeProtocol({ id: 'proto1', targets: ['iface1'] }),
    ];
    const innerfaces: Innerface[] = [
      makeInnerface({ id: 'iface1', name: 'Intense' }),
    ];

    const result = getWeeklyProgress(goals, [], protocols, innerfaces);

    expect(result).toHaveLength(1);
    expect(result[0].isCapped).toBe(true);
    expect(result[0].planned).toBe(7);
    expect(result[0].realTarget).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// getDailyCheckIns
// ---------------------------------------------------------------------------

describe('getDailyCheckIns', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns exactly 7 elements always', () => {
    const result = getDailyCheckIns('proto1', [], {}, []);
    expect(result).toHaveLength(7);
  });

  it('no history → all days have hasCheckIn false and checkInCount 0', () => {
    const result = getDailyCheckIns('proto1', [], {}, []);

    result.forEach((day) => {
      expect(day.hasCheckIn).toBe(false);
      expect(day.checkInCount).toBe(0);
    });
  });

  it('one checkin on Monday → dayIndex 0 has hasCheckIn true, checkInCount 1', () => {
    const history: HistoryRecord[] = [
      makeHistory({ id: 'h1', protocolId: 'proto1', timestamp: '2026-03-09T10:00:00.000Z', weight: 0.05 }),
    ];

    const result = getDailyCheckIns('proto1', history, {}, []);

    expect(result[0].hasCheckIn).toBe(true);
    expect(result[0].checkInCount).toBe(1);
    // Other days should be empty
    for (let i = 1; i < 7; i++) {
      expect(result[i].hasCheckIn).toBe(false);
      expect(result[i].checkInCount).toBe(0);
    }
  });

  it('two checkins on same day → checkInCount 2', () => {
    const history: HistoryRecord[] = [
      makeHistory({ id: 'h1', protocolId: 'proto1', timestamp: '2026-03-10T08:00:00.000Z', weight: 0.05 }),
      makeHistory({ id: 'h2', protocolId: 'proto1', timestamp: '2026-03-10T18:00:00.000Z', weight: 0.05 }),
    ];

    const result = getDailyCheckIns('proto1', history, {}, []);

    // Tuesday = dayIndex 1
    expect(result[1].hasCheckIn).toBe(true);
    expect(result[1].checkInCount).toBe(2);
  });

  it('checkins on different days → correct dayIndex mapping', () => {
    const history: HistoryRecord[] = [
      // Monday (dayIndex 0)
      makeHistory({ id: 'h1', protocolId: 'proto1', timestamp: '2026-03-09T10:00:00.000Z', weight: 0.05 }),
      // Wednesday (dayIndex 2)
      makeHistory({ id: 'h2', protocolId: 'proto1', timestamp: '2026-03-11T10:00:00.000Z', weight: 0.05 }),
      // Friday (dayIndex 4)
      makeHistory({ id: 'h3', protocolId: 'proto1', timestamp: '2026-03-13T10:00:00.000Z', weight: 0.05 }),
    ];

    const result = getDailyCheckIns('proto1', history, {}, []);

    expect(result[0].hasCheckIn).toBe(true);  // Monday
    expect(result[1].hasCheckIn).toBe(false);  // Tuesday
    expect(result[2].hasCheckIn).toBe(true);  // Wednesday
    expect(result[3].hasCheckIn).toBe(false);  // Thursday
    expect(result[4].hasCheckIn).toBe(true);  // Friday
    expect(result[5].hasCheckIn).toBe(false);  // Saturday
    expect(result[6].hasCheckIn).toBe(false);  // Sunday
  });

  it('negative weight records are skipped', () => {
    const history: HistoryRecord[] = [
      makeHistory({ id: 'h1', protocolId: 'proto1', timestamp: '2026-03-10T10:00:00.000Z', weight: -0.05 }),
    ];

    const result = getDailyCheckIns('proto1', history, {}, []);

    result.forEach((day) => {
      expect(day.hasCheckIn).toBe(false);
      expect(day.checkInCount).toBe(0);
    });
  });
});
