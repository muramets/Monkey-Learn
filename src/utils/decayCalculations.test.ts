import {
    thresholdDays,
    shouldDecay,
    computeDecayedScore,
    buildDecayHistoryPayload,
    type DecaySettings,
} from './decayCalculations';

describe('thresholdDays', () => {
    it('returns interval days for frequency=day', () => {
        expect(thresholdDays('day')).toBe(1);
        expect(thresholdDays('day', 1)).toBe(1);
        expect(thresholdDays('day', 3)).toBe(3);
    });

    it('returns interval * 7 for frequency=week', () => {
        expect(thresholdDays('week')).toBe(7);
        expect(thresholdDays('week', 2)).toBe(14);
    });

    it('returns interval * 30 for frequency=month', () => {
        expect(thresholdDays('month')).toBe(30);
        expect(thresholdDays('month', 2)).toBe(60);
    });

    it('treats undefined and 0 interval as 1', () => {
        expect(thresholdDays('day', undefined)).toBe(1);
        expect(thresholdDays('week', 0)).toBe(7);
    });
});

describe('shouldDecay', () => {
    const now = new Date('2026-04-17T10:00:00Z');

    const base: DecaySettings = {
        enabled: true,
        amount: 0.05,
        frequency: 'day',
    };

    it('returns false when settings are missing', () => {
        expect(shouldDecay(undefined, '2026-04-15T00:00:00Z', now)).toBe(false);
        expect(shouldDecay(null, '2026-04-15T00:00:00Z', now)).toBe(false);
    });

    it('returns false when decay is disabled', () => {
        expect(shouldDecay({ ...base, enabled: false }, '2026-04-10T00:00:00Z', now)).toBe(false);
    });

    it('returns false when last activity date is missing', () => {
        expect(shouldDecay(base, undefined, now)).toBe(false);
        expect(shouldDecay(base, null, now)).toBe(false);
    });

    it('returns false when last activity date is invalid', () => {
        expect(shouldDecay(base, 'not-a-date', now)).toBe(false);
    });

    it('returns true when day threshold is met', () => {
        // 2 days inactivity >= 1 day
        expect(shouldDecay(base, '2026-04-15T10:00:00Z', now)).toBe(true);
    });

    it('returns false when day threshold is not met', () => {
        // 12 hours inactivity < 1 day
        expect(shouldDecay(base, '2026-04-16T22:00:00Z', now)).toBe(false);
    });

    it('respects weekly frequency', () => {
        const weekly: DecaySettings = { ...base, frequency: 'week' };
        expect(shouldDecay(weekly, '2026-04-10T10:00:00Z', now)).toBe(true); // exactly 7 days
        expect(shouldDecay(weekly, '2026-04-11T10:00:00Z', now)).toBe(false); // 6 days
    });

    it('respects monthly frequency (30-day approximation)', () => {
        const monthly: DecaySettings = { ...base, frequency: 'month' };
        expect(shouldDecay(monthly, '2026-03-18T10:00:00Z', now)).toBe(true); // 30 days
        expect(shouldDecay(monthly, '2026-03-19T10:00:00Z', now)).toBe(false); // 29 days
    });

    it('respects interval multiplier on day frequency', () => {
        const every3days: DecaySettings = { ...base, interval: 3 };
        expect(shouldDecay(every3days, '2026-04-14T10:00:00Z', now)).toBe(true);
        expect(shouldDecay(every3days, '2026-04-15T10:00:00Z', now)).toBe(false);
    });
});

describe('computeDecayedScore', () => {
    it('subtracts decay amount from currentScore', () => {
        expect(computeDecayedScore({ currentScore: 5, initialScore: 1 }, 0.3)).toBeCloseTo(4.7);
    });

    it('falls back to initialScore when currentScore is missing', () => {
        expect(computeDecayedScore({ initialScore: 2 }, 0.5)).toBe(1.5);
    });

    it('treats missing both scores as 0', () => {
        expect(computeDecayedScore({}, 0.2)).toBe(0);
    });

    it('clamps at 0 when decay would go negative', () => {
        expect(computeDecayedScore({ currentScore: 0.1 }, 0.5)).toBe(0);
    });
});

describe('buildDecayHistoryPayload', () => {
    const now = new Date('2026-04-17T10:00:00Z');

    it('builds the canonical decay record', () => {
        const payload = buildDecayHistoryPayload('if-123', 0.1, now);
        expect(payload).toEqual({
            type: 'decay',
            protocolId: 'system-decay',
            protocolName: 'Inactivity Decay',
            protocolIcon: 'hourglass-half',
            timestamp: '2026-04-17T10:00:00.000Z',
            weight: -0.1,
            targets: ['if-123'],
            changes: { 'if-123': -0.1 },
        });
    });
});
