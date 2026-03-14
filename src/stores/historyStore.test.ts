import { vi, describe, it, expect, beforeEach } from 'vitest';
import { format } from 'date-fns';

// --- Mocks ---

vi.mock('firebase/firestore', () => ({
    collection: vi.fn((...args: string[]) => args.join('/')),
    doc: vi.fn((...args: unknown[]) => {
        const parts = (args as string[]).slice(0); // all args including db
        const lastArg = parts[parts.length - 1];
        // When called with a collection ref (string path) as first arg, it's auto-id mode
        // When called with db + path segments, last segment is the id
        return {
            id: typeof lastArg === 'string' ? lastArg : 'auto-id',
            path: (args as string[]).join('/'),
        };
    }),
    addDoc: vi.fn(),
    runTransaction: vi.fn(),
    onSnapshot: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    Timestamp: { now: vi.fn(() => ({ seconds: 1000 })) },
    increment: vi.fn((n: number) => ({ _type: 'increment', value: n })),
    updateDoc: vi.fn(),
}));

vi.mock('../config/firebase', () => ({ db: 'mock-db' }));

vi.mock('date-fns', async () => {
    const actual = await vi.importActual('date-fns');
    return actual;
});

// --- Import after mocks ---

import { useHistoryStore } from './historyStore';
import { runTransaction } from 'firebase/firestore';

// --- Helpers ---

const uid = 'user-1';
const pid = 'personality-1';

function createMockTransaction() {
    return {
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    };
}

function makeMockDoc(exists: boolean, data: Record<string, unknown> = {}) {
    return {
        exists: () => exists,
        data: () => data,
        id: data.id || 'mock-doc-id',
    };
}

const todayStr = format(new Date(), 'yyyy-MM-dd');
const monthStr = format(new Date(), 'yyyy-MM');

function baseRecord() {
    return {
        type: 'protocol' as const,
        protocolId: 'proto-1',
        protocolName: 'Test Protocol',
        protocolIcon: 'star',
        timestamp: new Date().toISOString(),
        weight: 0.05,
        targets: ['if-1'],
        changes: { 'if-1': 0.05 } as Record<string, number>,
    };
}

// --- Tests ---

describe('addCheckin', () => {
    let mockTransaction: ReturnType<typeof createMockTransaction>;

    beforeEach(() => {
        // Reset store state
        useHistoryStore.setState({
            history: [],
            isLoading: false,
            error: null,
            pendingCheckins: new Set(),
        });

        mockTransaction = createMockTransaction();
        vi.mocked(runTransaction).mockImplementation(async (_db, callback) => {
            return (callback as (t: typeof mockTransaction) => Promise<unknown>)(mockTransaction);
        });
    });

    it('creates history record with correct data', async () => {
        const record = baseRecord();

        // Mock innerface doc
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, { stats: { totalCheckins: 5, totalXp: 100, lastDailyUpdate: todayStr, dailyCheckins: 2, dailyXp: 40, lastMonthlyUpdate: monthStr, monthlyCheckins: 10, monthlyXp: 200 } })
        ); // personality
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, { currentScore: 5, initialScore: 2 })
        ); // innerface

        await useHistoryStore.getState().addCheckin(uid, pid, record, true, 'custom-id');

        // Verify transaction.set was called with the record + serverTimestamp
        expect(mockTransaction.set).toHaveBeenCalledTimes(1);
        const [, setData] = mockTransaction.set.mock.calls[0];
        expect(setData.protocolName).toBe('Test Protocol');
        expect(setData.weight).toBe(0.05);
        expect(setData.changes).toEqual({ 'if-1': 0.05 });
        expect(setData.serverTimestamp).toEqual({ seconds: 1000 });
    });

    it('calculates correct new score from currentScore', async () => {
        const record = baseRecord();

        // personality doc (read first when applyToScore=true)
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, { stats: { totalCheckins: 0, totalXp: 0, lastDailyUpdate: todayStr, dailyCheckins: 0, dailyXp: 0, lastMonthlyUpdate: monthStr, monthlyCheckins: 0, monthlyXp: 0 } })
        );
        // innerface doc
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, { currentScore: 5, initialScore: 2 })
        );

        await useHistoryStore.getState().addCheckin(uid, pid, record);

        // transaction.update called for innerface and personality
        // First update call should be innerface
        const innerfaceUpdateCall = mockTransaction.update.mock.calls[0];
        expect(innerfaceUpdateCall[1].currentScore).toBe(5.05);
    });

    it('falls back to initialScore when currentScore is 0 or undefined', async () => {
        const record = baseRecord();
        record.changes = { 'if-1': 0.05 };

        // personality
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, { stats: { totalCheckins: 0, totalXp: 0, lastDailyUpdate: todayStr, dailyCheckins: 0, dailyXp: 0, lastMonthlyUpdate: monthStr, monthlyCheckins: 0, monthlyXp: 0 } })
        );
        // innerface with currentScore: 0 (falsy), initialScore: 2
        // Due to `||` operator, 0 falls through to initialScore
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, { currentScore: 0, initialScore: 2 })
        );

        await useHistoryStore.getState().addCheckin(uid, pid, record);

        const innerfaceUpdateCall = mockTransaction.update.mock.calls[0];
        // currentTotal = 0 || 2 || 0 = 2, newScore = 2 + 0.05 = 2.05
        expect(innerfaceUpdateCall[1].currentScore).toBe(2.05);
    });

    it('clamps negative score to 0', async () => {
        const record = baseRecord();
        record.changes = { 'if-1': -0.05 };
        record.weight = -0.05;

        // personality
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, { stats: { totalCheckins: 1, totalXp: 5, lastDailyUpdate: todayStr, dailyCheckins: 1, dailyXp: 5, lastMonthlyUpdate: monthStr, monthlyCheckins: 1, monthlyXp: 5 } })
        );
        // innerface with currentScore: 0.02
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, { currentScore: 0.02, initialScore: 0 })
        );

        await useHistoryStore.getState().addCheckin(uid, pid, record);

        const innerfaceUpdateCall = mockTransaction.update.mock.calls[0];
        // Math.max(0, 0.02 + (-0.05)) = Math.max(0, -0.03) = 0
        expect(innerfaceUpdateCall[1].currentScore).toBe(0);
    });

    it('updates personality stats with increment when stats exist and same day', async () => {
        const record = baseRecord();
        record.weight = 0.5;

        // personality with stats for today
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, {
                stats: {
                    totalCheckins: 10,
                    totalXp: 500,
                    lastDailyUpdate: todayStr,
                    dailyCheckins: 3,
                    dailyXp: 150,
                    lastMonthlyUpdate: monthStr,
                    monthlyCheckins: 20,
                    monthlyXp: 1000,
                },
            })
        );
        // innerface
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, { currentScore: 5, initialScore: 2 })
        );

        await useHistoryStore.getState().addCheckin(uid, pid, record);

        // recordXp = Math.round(0.5 * 100) = 50
        // Find the personality stats update call (second update call)
        const statsUpdateCall = mockTransaction.update.mock.calls[1];
        const statsUpdate = statsUpdateCall[1];

        expect(statsUpdate['stats.totalCheckins']).toEqual({ _type: 'increment', value: 1 });
        expect(statsUpdate['stats.totalXp']).toEqual({ _type: 'increment', value: 50 });
        expect(statsUpdate['stats.dailyCheckins']).toEqual({ _type: 'increment', value: 1 });
        expect(statsUpdate['stats.dailyXp']).toEqual({ _type: 'increment', value: 50 });
        expect(statsUpdate['stats.monthlyCheckins']).toEqual({ _type: 'increment', value: 1 });
        expect(statsUpdate['stats.monthlyXp']).toEqual({ _type: 'increment', value: 50 });
    });

    it('resets daily counters when day changes', async () => {
        const record = baseRecord();
        record.weight = 0.5;

        // personality with stats from a previous day
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, {
                stats: {
                    totalCheckins: 10,
                    totalXp: 500,
                    lastDailyUpdate: '2020-01-01', // Different day
                    dailyCheckins: 3,
                    dailyXp: 150,
                    lastMonthlyUpdate: monthStr, // Same month
                    monthlyCheckins: 20,
                    monthlyXp: 1000,
                },
            })
        );
        // innerface
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, { currentScore: 5, initialScore: 2 })
        );

        await useHistoryStore.getState().addCheckin(uid, pid, record);

        const statsUpdateCall = mockTransaction.update.mock.calls[1];
        const statsUpdate = statsUpdateCall[1];

        // Daily should be RESET (not incremented)
        expect(statsUpdate['stats.lastDailyUpdate']).toBe(todayStr);
        expect(statsUpdate['stats.dailyCheckins']).toBe(1);
        expect(statsUpdate['stats.dailyXp']).toBe(50);

        // Monthly should still be incremented (same month)
        expect(statsUpdate['stats.monthlyCheckins']).toEqual({ _type: 'increment', value: 1 });
    });

    it('initializes stats when personality has no stats', async () => {
        const record = baseRecord();
        record.weight = 0.5;

        // personality WITHOUT stats
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, { name: 'My Personality' }) // no stats field
        );
        // innerface
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, { currentScore: 5, initialScore: 2 })
        );

        await useHistoryStore.getState().addCheckin(uid, pid, record);

        // The second update call should be the personality stats initialization
        const statsUpdateCall = mockTransaction.update.mock.calls[1];
        const statsArg = statsUpdateCall[1];

        // When no stats exist, the full stats object is written
        expect(statsArg.stats).toBeDefined();
        expect(statsArg.stats.totalCheckins).toBe(1);
        expect(statsArg.stats.totalXp).toBe(50);
        expect(statsArg.stats.dailyCheckins).toBe(1);
        expect(statsArg.stats.dailyXp).toBe(50);
        expect(statsArg.stats.monthlyCheckins).toBe(1);
        expect(statsArg.stats.monthlyXp).toBe(50);
        expect(statsArg.stats.lastDailyUpdate).toBe(todayStr);
        expect(statsArg.stats.lastMonthlyUpdate).toBe(monthStr);
    });

    it('skips score updates when applyToScore is false', async () => {
        const record = baseRecord();

        // Innerface reads still happen (not gated by applyToScore), so mock them
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, { currentScore: 5, initialScore: 2 })
        );

        await useHistoryStore.getState().addCheckin(uid, pid, record, false);

        // transaction.set should be called once (for history record)
        expect(mockTransaction.set).toHaveBeenCalledTimes(1);
        // transaction.update should NOT be called (no innerface or personality writes)
        expect(mockTransaction.update).not.toHaveBeenCalled();
    });

    it('tracks and cleans up pending checkins', async () => {
        const record = baseRecord();

        // personality
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, { stats: { totalCheckins: 0, totalXp: 0, lastDailyUpdate: todayStr, dailyCheckins: 0, dailyXp: 0, lastMonthlyUpdate: monthStr, monthlyCheckins: 0, monthlyXp: 0 } })
        );
        // innerface
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, { currentScore: 5, initialScore: 2 })
        );

        let pendingDuringExecution: Set<string> | undefined;
        vi.mocked(runTransaction).mockImplementation(async (_db, callback) => {
            // Capture pending state during execution
            pendingDuringExecution = useHistoryStore.getState().pendingCheckins;
            return (callback as (t: typeof mockTransaction) => Promise<unknown>)(mockTransaction);
        });

        await useHistoryStore.getState().addCheckin(uid, pid, record, true, 'track-id');

        // During execution, the id should have been in pendingCheckins
        expect(pendingDuringExecution).toBeDefined();
        expect(pendingDuringExecution!.has('track-id')).toBe(true);

        // After completion, it should be cleaned up
        expect(useHistoryStore.getState().pendingCheckins.has('track-id')).toBe(false);
    });

    it('sets error state and rethrows on failure', async () => {
        const record = baseRecord();
        const testError = new Error('Firestore unavailable');

        vi.mocked(runTransaction).mockRejectedValueOnce(testError);

        await expect(
            useHistoryStore.getState().addCheckin(uid, pid, record)
        ).rejects.toThrow('Firestore unavailable');

        expect(useHistoryStore.getState().error).toBe('Firestore unavailable');
    });
});

describe('deleteCheckin', () => {
    let mockTransaction: ReturnType<typeof createMockTransaction>;

    beforeEach(() => {
        useHistoryStore.setState({
            history: [],
            isLoading: false,
            error: null,
            pendingCheckins: new Set(),
        });

        mockTransaction = createMockTransaction();
        vi.mocked(runTransaction).mockImplementation(async (_db, callback) => {
            return (callback as (t: typeof mockTransaction) => Promise<unknown>)(mockTransaction);
        });
    });

    it('deletes history record and reverts innerface scores', async () => {
        const recordTimestamp = new Date().toISOString();
        const recordDateStr = format(new Date(recordTimestamp), 'yyyy-MM-dd');
        const recordMonthStr = format(new Date(recordTimestamp), 'yyyy-MM');

        // history doc
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, {
                type: 'protocol',
                protocolId: 'proto-1',
                protocolName: 'Test',
                protocolIcon: 'star',
                timestamp: recordTimestamp,
                weight: 0.05,
                targets: ['if-1'],
                changes: { 'if-1': 0.05 },
            })
        );
        // innerface doc
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, { currentScore: 5.05, initialScore: 2 })
        );
        // personality doc
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, {
                stats: {
                    totalCheckins: 10,
                    totalXp: 500,
                    lastDailyUpdate: recordDateStr,
                    dailyCheckins: 3,
                    dailyXp: 150,
                    lastMonthlyUpdate: recordMonthStr,
                    monthlyCheckins: 20,
                    monthlyXp: 1000,
                },
            })
        );

        await useHistoryStore.getState().deleteCheckin(uid, pid, 'checkin-1');

        // Verify innerface score reverted: 5.05 - 0.05 = 5.0
        const innerfaceUpdateCall = mockTransaction.update.mock.calls[0];
        expect(innerfaceUpdateCall[1].currentScore).toBe(5);

        // Verify personality stats decremented
        const statsUpdateCall = mockTransaction.update.mock.calls[1];
        expect(statsUpdateCall[1]['stats.totalCheckins']).toEqual({ _type: 'increment', value: -1 });
        expect(statsUpdateCall[1]['stats.totalXp']).toEqual({ _type: 'increment', value: -5 }); // Math.round(0.05*100) = 5

        // Verify history record deleted
        expect(mockTransaction.delete).toHaveBeenCalledTimes(1);
    });

    it('clamps reverted score to 0', async () => {
        const recordTimestamp = new Date().toISOString();

        // history doc with weight 0.05
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, {
                type: 'protocol',
                protocolId: 'proto-1',
                protocolName: 'Test',
                protocolIcon: 'star',
                timestamp: recordTimestamp,
                weight: 0.05,
                targets: ['if-1'],
                changes: { 'if-1': 0.05 },
            })
        );
        // innerface with currentScore: 0.02 (less than the weight to revert)
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, { currentScore: 0.02, initialScore: 0 })
        );
        // personality doc (no stats to simplify)
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, { stats: null })
        );

        await useHistoryStore.getState().deleteCheckin(uid, pid, 'checkin-1');

        // Math.max(0, 0.02 - 0.05) = 0
        const innerfaceUpdateCall = mockTransaction.update.mock.calls[0];
        expect(innerfaceUpdateCall[1].currentScore).toBe(0);
    });

    it('decrements personality stats', async () => {
        const recordTimestamp = new Date().toISOString();
        const recordDateStr = format(new Date(recordTimestamp), 'yyyy-MM-dd');
        const recordMonthStr = format(new Date(recordTimestamp), 'yyyy-MM');

        // history doc
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, {
                type: 'protocol',
                protocolId: 'proto-1',
                protocolName: 'Test',
                protocolIcon: 'star',
                timestamp: recordTimestamp,
                weight: 0.5,
                targets: [],
                changes: {},
            })
        );
        // personality doc
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, {
                stats: {
                    totalCheckins: 10,
                    totalXp: 500,
                    lastDailyUpdate: recordDateStr,
                    dailyCheckins: 3,
                    dailyXp: 150,
                    lastMonthlyUpdate: recordMonthStr,
                    monthlyCheckins: 20,
                    monthlyXp: 1000,
                },
            })
        );

        await useHistoryStore.getState().deleteCheckin(uid, pid, 'checkin-1');

        // recordXp = Math.round(0.5 * 100) = 50
        const statsUpdateCall = mockTransaction.update.mock.calls[0]; // only update call (no innerface changes)
        expect(statsUpdateCall[1]['stats.totalCheckins']).toEqual({ _type: 'increment', value: -1 });
        expect(statsUpdateCall[1]['stats.totalXp']).toEqual({ _type: 'increment', value: -50 });
        expect(statsUpdateCall[1]['stats.dailyCheckins']).toEqual({ _type: 'increment', value: -1 });
        expect(statsUpdateCall[1]['stats.dailyXp']).toEqual({ _type: 'increment', value: -50 });
        expect(statsUpdateCall[1]['stats.monthlyCheckins']).toEqual({ _type: 'increment', value: -1 });
        expect(statsUpdateCall[1]['stats.monthlyXp']).toEqual({ _type: 'increment', value: -50 });
    });

    it('only decrements daily stats if same day', async () => {
        const recordTimestamp = '2020-06-15T12:00:00.000Z'; // A past date

        // history doc
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, {
                type: 'protocol',
                protocolId: 'proto-1',
                protocolName: 'Test',
                protocolIcon: 'star',
                timestamp: recordTimestamp,
                weight: 0.5,
                targets: [],
                changes: {},
            })
        );
        // personality doc — stats lastDailyUpdate is today, NOT the record date
        mockTransaction.get.mockResolvedValueOnce(
            makeMockDoc(true, {
                stats: {
                    totalCheckins: 10,
                    totalXp: 500,
                    lastDailyUpdate: todayStr, // today, not 2020-06-15
                    dailyCheckins: 3,
                    dailyXp: 150,
                    lastMonthlyUpdate: monthStr, // current month, not 2020-06
                    monthlyCheckins: 20,
                    monthlyXp: 1000,
                },
            })
        );

        await useHistoryStore.getState().deleteCheckin(uid, pid, 'checkin-1');

        const statsUpdateCall = mockTransaction.update.mock.calls[0];
        const statsUpdate = statsUpdateCall[1];

        // Total should always decrement
        expect(statsUpdate['stats.totalCheckins']).toEqual({ _type: 'increment', value: -1 });
        expect(statsUpdate['stats.totalXp']).toEqual({ _type: 'increment', value: -50 });

        // Daily should NOT be decremented (record date 2020-06-15 !== today)
        expect(statsUpdate['stats.dailyCheckins']).toBeUndefined();
        expect(statsUpdate['stats.dailyXp']).toBeUndefined();

        // Monthly should NOT be decremented (record month 2020-06 !== current month)
        expect(statsUpdate['stats.monthlyCheckins']).toBeUndefined();
        expect(statsUpdate['stats.monthlyXp']).toBeUndefined();
    });

    it('throws if document does not exist', async () => {
        // history doc does not exist
        mockTransaction.get.mockResolvedValueOnce(makeMockDoc(false));

        await useHistoryStore.getState().deleteCheckin(uid, pid, 'nonexistent');

        // deleteCheckin catches errors and sets error state (does not rethrow)
        expect(useHistoryStore.getState().error).toBe('Document does not exist!');
    });
});
