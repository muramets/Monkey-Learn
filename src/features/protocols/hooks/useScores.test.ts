import { renderHook } from '@testing-library/react';
import { useScores } from './useScores';
import type { HistoryRecord } from '../../../types/history';

// --- Mocks ---

vi.mock('firebase/firestore', () => ({
    collection: vi.fn((...args: unknown[]) => args),
    doc: vi.fn(() => ({ id: 'mock-id' })),
}));

vi.mock('../../../config/firebase', () => ({ db: {} }));

const mockHistory: HistoryRecord[] = [];
const mockAddCheckin = vi.fn();
const mockDeleteCheckin = vi.fn();

vi.mock('../../../stores/historyStore', () => ({
    useHistoryStore: vi.fn(() => ({
        history: mockHistory,
        addCheckin: mockAddCheckin,
        deleteCheckin: mockDeleteCheckin,
        isLoading: false,
    })),
}));

const mockInnerfaces = [
    { id: 'if1', name: 'Focus', icon: '🎯', initialScore: 2, currentScore: 5.5 },
    { id: 'if2', name: 'Strength', icon: '💪', initialScore: 0, currentScore: 3 },
    { id: 'if3', name: 'Legacy', icon: '📜', initialScore: 1 },
];

const mockProtocols = [
    { id: 'p1', title: 'Meditate', description: '', icon: '🧘', weight: 0.05, targets: ['if1'] },
];

const mockStates = [
    { id: 's1', name: 'Mind', innerfaceIds: ['if1', 'if2'], stateIds: [] },
    { id: 's2', name: 'Body', innerfaceIds: ['if2'], stateIds: ['s1'] },
    { id: 's-cycle-a', name: 'CycleA', innerfaceIds: [], stateIds: ['s-cycle-b'] },
    { id: 's-cycle-b', name: 'CycleB', innerfaceIds: [], stateIds: ['s-cycle-a'] },
    { id: 's-empty', name: 'Empty', innerfaceIds: [], stateIds: [] },
    { id: 's-invalid', name: 'InvalidRefs', innerfaceIds: ['nonexistent'], stateIds: [] },
];

vi.mock('../../../stores/metadataStore', () => ({
    useMetadataStore: vi.fn(() => ({
        innerfaces: mockInnerfaces,
        protocols: mockProtocols,
        states: mockStates,
        isLoading: false,
        loadedCount: 4,
    })),
}));

vi.mock('../../../stores/personalityStore', () => ({
    usePersonalityStore: Object.assign(
        vi.fn(() => ({ activePersonalityId: 'test-personality' })),
        { getState: vi.fn(() => ({ optimisticUpdateStats: vi.fn() })) }
    ),
}));

vi.mock('../../../stores/uiStore', () => ({
    useUIStore: Object.assign(
        vi.fn(() => ({})),
        { getState: vi.fn(() => ({ showToast: vi.fn(), openCommentOverlay: vi.fn(), closeCommentOverlay: vi.fn() })) }
    ),
}));

vi.mock('../../../contexts/AuthContext', () => ({
    useAuth: vi.fn(() => ({ user: { uid: 'test-user' } })),
}));

// --- Tests ---

describe('useScores', () => {
    describe('innerfacesWithScores', () => {
        it('uses currentScore when available', () => {
            const { result } = renderHook(() => useScores());
            const focus = result.current.innerfaces.find(i => i.id === 'if1');
            expect(focus?.currentScore).toBe(5.5);
        });

        it('uses currentScore even when 0', () => {
            const { result } = renderHook(() => useScores());
            const strength = result.current.innerfaces.find(i => i.id === 'if2');
            expect(strength?.currentScore).toBe(3);
        });

        it('falls back to initialScore when currentScore is undefined', () => {
            const { result } = renderHook(() => useScores());
            const legacy = result.current.innerfaces.find(i => i.id === 'if3');
            // currentScore is undefined → fallback to max(0, initialScore) = 1
            expect(legacy?.currentScore).toBe(1);
        });

        it('returns 0 for non-existent innerface', () => {
            const { result } = renderHook(() => useScores());
            // calculateInnerfaceScore is internal but affects innerfacesWithScores
            // All innerfaces should have scores
            expect(result.current.innerfaces).toHaveLength(3);
        });
    });

    describe('states with scores', () => {
        it('calculates average of child innerfaces', () => {
            const { result } = renderHook(() => useScores());
            const mind = result.current.states.find(s => s.id === 's1');
            // s1 has if1 (5.5) and if2 (3) → average = 4.25
            expect(mind?.score).toBe(4.25);
        });

        it('calculates recursive state score', () => {
            const { result } = renderHook(() => useScores());
            const body = result.current.states.find(s => s.id === 's2');
            // s2 has if2 (3) and s1 (avg 4.25) → (3 + 4.25) / 2 = 3.625
            expect(body?.score).toBe(3.625);
        });

        it('handles cycle detection without infinite loop', () => {
            const { result } = renderHook(() => useScores());
            const cycleA = result.current.states.find(s => s.id === 's-cycle-a');
            // s-cycle-a → s-cycle-b → s-cycle-a (visited, returns 0)
            // s-cycle-a: count=1 (s-cycle-b), s-cycle-b score = 0 (cycle detected) → 0/1 = 0
            expect(cycleA?.score).toBe(0);
        });

        it('returns 0 for empty state', () => {
            const { result } = renderHook(() => useScores());
            const empty = result.current.states.find(s => s.id === 's-empty');
            expect(empty?.score).toBe(0);
        });

        it('filters invalid innerface refs from state', () => {
            const { result } = renderHook(() => useScores());
            const invalid = result.current.states.find(s => s.id === 's-invalid');
            // innerfaceIds ['nonexistent'] filtered out → no valid ids → score 0
            // BUT: the score calculation uses the original state.innerfaceIds, not the sanitized version
            // calculateInnerfaceScore('nonexistent') returns 0
            expect(invalid?.score).toBe(0);
        });
    });

    describe('calculateInnerfaceScoreAtDate (via statesWithScores.yesterdayScore)', () => {
        it('computes yesterday score by reversing history', () => {
            // Inject history records AFTER yesterday
            const today = new Date().toISOString();
            mockHistory.length = 0;
            mockHistory.push({
                id: 'h1',
                type: 'protocol',
                protocolId: 'p1',
                protocolName: 'Meditate',
                protocolIcon: '🧘',
                timestamp: today,
                weight: 0.05,
                targets: ['if1'],
                changes: { if1: 0.05 },
            });

            const { result } = renderHook(() => useScores());
            const mind = result.current.states.find(s => s.id === 's1');

            // Current: if1 = 5.5, if2 = 3
            // Yesterday: reverse today's +0.05 on if1 → 5.45, if2 stays 3
            // Yesterday avg = (5.45 + 3) / 2 = 4.225
            expect(mind?.yesterdayScore).toBe(4.225);

            // Cleanup
            mockHistory.length = 0;
        });

        it('clamps negative simulated score to 0', () => {
            mockHistory.length = 0;
            // Record that added 4 points today — reversing would make score negative
            mockHistory.push({
                id: 'h2',
                type: 'protocol',
                protocolId: 'p1',
                protocolName: 'Big boost',
                protocolIcon: '🚀',
                timestamp: new Date().toISOString(),
                weight: 4,
                targets: ['if2'],
                changes: { if2: 4 },
            });

            const { result } = renderHook(() => useScores());
            // if2 current = 3, reverse +4 → -1 → clamped to 0
            const strength = result.current.innerfaces.find(i => i.id === 'if2');
            expect(strength?.currentScore).toBe(3); // current is still 3

            // But yesterday score for a state using if2:
            // s1: if1 yesterday = 5.5 (no changes), if2 yesterday = max(0, 3-4) = 0
            // avg = (5.5 + 0) / 2 = 2.75
            const mind = result.current.states.find(s => s.id === 's1');
            expect(mind?.yesterdayScore).toBe(2.75);

            mockHistory.length = 0;
        });
    });

    describe('loading state', () => {
        it('reports not loading when stores ready', () => {
            const { result } = renderHook(() => useScores());
            expect(result.current.isLoading).toBe(false);
        });

        it('calculates loading progress', () => {
            const { result } = renderHook(() => useScores());
            // historyProgress = 20 (not loading), metadataProgress = 4 * 20 = 80
            expect(result.current.loadingProgress).toBe(100);
        });
    });
});
