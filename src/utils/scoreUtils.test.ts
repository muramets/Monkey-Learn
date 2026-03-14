import {
    getInnerfaceScore,
    calculateStateScore,
    calculateInnerfaceScoreAtDate,
    calculateStateScoreAtDate,
} from './scoreUtils';

describe('getInnerfaceScore', () => {
    it('returns currentScore when defined', () => {
        expect(getInnerfaceScore({ currentScore: 5.5, initialScore: 2 })).toBe(5.5);
    });

    it('returns currentScore even when 0', () => {
        // currentScore: 0 is a valid value (not undefined)
        expect(getInnerfaceScore({ currentScore: 0, initialScore: 3 })).toBe(0);
    });

    it('falls back to initialScore when currentScore is undefined', () => {
        expect(getInnerfaceScore({ currentScore: undefined, initialScore: 4 })).toBe(4);
    });

    it('clamps negative initialScore to 0', () => {
        expect(getInnerfaceScore({ currentScore: undefined, initialScore: -2 })).toBe(0);
    });
});

describe('calculateStateScore', () => {
    const states = [
        { id: 's1', innerfaceIds: ['if1', 'if2'], stateIds: [] },
        { id: 's2', innerfaceIds: ['if2'], stateIds: ['s1'] },
        { id: 'cycle-a', innerfaceIds: [], stateIds: ['cycle-b'] },
        { id: 'cycle-b', innerfaceIds: [], stateIds: ['cycle-a'] },
        { id: 'empty', innerfaceIds: [], stateIds: [] },
    ];

    const scores: Record<string, number> = { if1: 5.5, if2: 3 };
    const scoreFn = (id: string | number) => scores[String(id)] ?? 0;

    it('averages child innerface scores', () => {
        expect(calculateStateScore('s1', states, scoreFn)).toBe(4.25); // (5.5 + 3) / 2
    });

    it('recursively includes child state scores', () => {
        // s2 = avg(if2=3, s1=4.25) = 3.625
        expect(calculateStateScore('s2', states, scoreFn)).toBe(3.625);
    });

    it('handles cycles without infinite loop', () => {
        expect(calculateStateScore('cycle-a', states, scoreFn)).toBe(0);
    });

    it('returns 0 for empty state', () => {
        expect(calculateStateScore('empty', states, scoreFn)).toBe(0);
    });

    it('returns 0 for non-existent state', () => {
        expect(calculateStateScore('nope', states, scoreFn)).toBe(0);
    });
});

describe('calculateInnerfaceScoreAtDate', () => {
    const innerface = { id: 'if1', currentScore: 5.5, initialScore: 2 };

    it('returns current score when no history after date', () => {
        const result = calculateInnerfaceScoreAtDate(innerface, new Date(), []);
        expect(result).toBe(5.5);
    });

    it('reverses changes after target date', () => {
        const history = [
            { id: 'h1', type: 'protocol' as const, protocolId: 'p1', protocolName: '', protocolIcon: '', timestamp: new Date().toISOString(), weight: 0.05, targets: ['if1'], changes: { if1: 0.05 } },
        ];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // Current 5.5, reverse today's +0.05 → 5.45
        expect(calculateInnerfaceScoreAtDate(innerface, yesterday, history)).toBe(5.45);
    });

    it('clamps to 0 when reversal goes negative', () => {
        const innerface2 = { id: 'if1', currentScore: 0.02, initialScore: 0 };
        const history = [
            { id: 'h1', type: 'protocol' as const, protocolId: 'p1', protocolName: '', protocolIcon: '', timestamp: new Date().toISOString(), weight: 0.05, targets: ['if1'], changes: { if1: 0.05 } },
        ];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // 0.02 - 0.05 = -0.03 → clamped to 0
        expect(calculateInnerfaceScoreAtDate(innerface2, yesterday, history)).toBe(0);
    });
});

describe('calculateStateScoreAtDate', () => {
    const states = [
        { id: 's1', innerfaceIds: ['if1', 'if2'] },
    ];

    it('uses historical innerface scores', () => {
        const historicalScoreFn = (id: string | number) => {
            if (String(id) === 'if1') return 5.0;
            if (String(id) === 'if2') return 3.0;
            return 0;
        };
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        expect(calculateStateScoreAtDate('s1', yesterday, states, historicalScoreFn)).toBe(4.0);
    });

    it('handles cycle detection', () => {
        const cyclicStates = [
            { id: 'a', stateIds: ['b'] },
            { id: 'b', stateIds: ['a'] },
        ];
        const noopFn = () => 0;
        expect(calculateStateScoreAtDate('a', new Date(), cyclicStates, noopFn)).toBe(0);
    });
});
