import {
    computeCheckinScore,
    computeRevertedScore,
    weightToXp,
    planStatsForCheckin,
    planStatsForDelete,
} from './checkinCalculations';
import type { PersonalityStats } from '../types/personality';

describe('computeCheckinScore', () => {
    it('adds weight to currentScore', () => {
        expect(computeCheckinScore({ currentScore: 5, initialScore: 2 }, 0.5)).toBe(5.5);
    });

    it('falls back to initialScore when currentScore is 0 (historical || behavior)', () => {
        expect(computeCheckinScore({ currentScore: 0, initialScore: 3 }, 0.2)).toBe(3.2);
    });

    it('falls back to initialScore when currentScore is undefined', () => {
        expect(computeCheckinScore({ initialScore: 4 }, 1)).toBe(5);
    });

    it('treats missing both scores as 0', () => {
        expect(computeCheckinScore({}, 0.3)).toBe(0.3);
    });

    it('clamps at 0 for negative weight larger than score', () => {
        expect(computeCheckinScore({ currentScore: 1 }, -5)).toBe(0);
    });

    it('rounds to 4 decimal places to avoid float drift', () => {
        expect(computeCheckinScore({ currentScore: 0.1 }, 0.2)).toBe(0.3);
    });

    it('stacks multiple weights deterministically', () => {
        let s = computeCheckinScore({ currentScore: 0, initialScore: 1 }, 0.1);
        s = computeCheckinScore({ currentScore: s }, 0.1);
        s = computeCheckinScore({ currentScore: s }, 0.1);
        expect(s).toBe(1.3);
    });
});

describe('computeRevertedScore', () => {
    it('subtracts weight from score', () => {
        expect(computeRevertedScore(5, 0.5)).toBe(4.5);
    });

    it('clamps at 0 when revert would go negative', () => {
        expect(computeRevertedScore(0.2, 0.5)).toBe(0);
    });

    it('rounds to 4 decimal places', () => {
        expect(computeRevertedScore(0.3, 0.1)).toBe(0.2);
    });
});

describe('weightToXp', () => {
    it('converts weight 0.15 to 15 xp', () => {
        expect(weightToXp(0.15)).toBe(15);
    });

    it('rounds half-up', () => {
        expect(weightToXp(0.155)).toBe(16);
    });

    it('handles undefined as 0', () => {
        expect(weightToXp(undefined)).toBe(0);
    });

    it('handles negative weight (for decay)', () => {
        expect(weightToXp(-0.1)).toBe(-10);
    });
});

describe('planStatsForCheckin', () => {
    const now = new Date('2026-04-17T10:00:00Z');
    const todayStr = '2026-04-17';
    const monthStr = '2026-04';

    it('returns initialize when stats are missing', () => {
        const plan = planStatsForCheckin(undefined, 15, now);
        expect(plan.mode).toBe('initialize');
        if (plan.mode !== 'initialize') throw new Error('type guard');
        expect(plan.stats).toEqual({
            totalCheckins: 1,
            totalXp: 15,
            lastDailyUpdate: todayStr,
            dailyCheckins: 1,
            dailyXp: 15,
            lastMonthlyUpdate: monthStr,
            monthlyCheckins: 1,
            monthlyXp: 15,
        });
    });

    it('returns initialize when stats are null', () => {
        const plan = planStatsForCheckin(null, 10, now);
        expect(plan.mode).toBe('initialize');
    });

    it('increments all counters when both date windows match', () => {
        const existing: PersonalityStats = {
            totalCheckins: 10,
            totalXp: 150,
            lastDailyUpdate: todayStr,
            dailyCheckins: 3,
            dailyXp: 45,
            lastMonthlyUpdate: monthStr,
            monthlyCheckins: 7,
            monthlyXp: 105,
        };
        const plan = planStatsForCheckin(existing, 20, now);
        expect(plan.mode).toBe('patch');
        if (plan.mode !== 'patch') throw new Error('type guard');
        expect(plan.increments).toEqual({
            'stats.totalCheckins': 1,
            'stats.totalXp': 20,
            'stats.dailyCheckins': 1,
            'stats.dailyXp': 20,
            'stats.monthlyCheckins': 1,
            'stats.monthlyXp': 20,
        });
        expect(plan.resets).toEqual({});
    });

    it('resets daily counters on day rollover', () => {
        const existing: PersonalityStats = {
            totalCheckins: 10,
            totalXp: 150,
            lastDailyUpdate: '2026-04-16',
            dailyCheckins: 3,
            dailyXp: 45,
            lastMonthlyUpdate: monthStr,
            monthlyCheckins: 7,
            monthlyXp: 105,
        };
        const plan = planStatsForCheckin(existing, 10, now);
        if (plan.mode !== 'patch') throw new Error('type guard');
        expect(plan.increments).toMatchObject({
            'stats.totalCheckins': 1,
            'stats.totalXp': 10,
            'stats.monthlyCheckins': 1,
            'stats.monthlyXp': 10,
        });
        expect(plan.resets).toEqual({
            'stats.lastDailyUpdate': todayStr,
            'stats.dailyCheckins': 1,
            'stats.dailyXp': 10,
        });
    });

    it('resets monthly counters on month rollover', () => {
        const existing: PersonalityStats = {
            totalCheckins: 10,
            totalXp: 150,
            lastDailyUpdate: todayStr,
            dailyCheckins: 3,
            dailyXp: 45,
            lastMonthlyUpdate: '2026-03',
            monthlyCheckins: 7,
            monthlyXp: 105,
        };
        const plan = planStatsForCheckin(existing, 10, now);
        if (plan.mode !== 'patch') throw new Error('type guard');
        expect(plan.resets).toEqual({
            'stats.lastMonthlyUpdate': monthStr,
            'stats.monthlyCheckins': 1,
            'stats.monthlyXp': 10,
        });
        expect(plan.increments['stats.dailyCheckins']).toBe(1);
    });

    it('resets both day and month on cross-month rollover', () => {
        const existing: PersonalityStats = {
            totalCheckins: 10,
            totalXp: 150,
            lastDailyUpdate: '2026-03-31',
            dailyCheckins: 3,
            dailyXp: 45,
            lastMonthlyUpdate: '2026-03',
            monthlyCheckins: 7,
            monthlyXp: 105,
        };
        const plan = planStatsForCheckin(existing, 10, now);
        if (plan.mode !== 'patch') throw new Error('type guard');
        expect(plan.resets).toEqual({
            'stats.lastDailyUpdate': todayStr,
            'stats.dailyCheckins': 1,
            'stats.dailyXp': 10,
            'stats.lastMonthlyUpdate': monthStr,
            'stats.monthlyCheckins': 1,
            'stats.monthlyXp': 10,
        });
        expect(plan.increments).toEqual({
            'stats.totalCheckins': 1,
            'stats.totalXp': 10,
        });
    });
});

describe('planStatsForDelete', () => {
    const stats: PersonalityStats = {
        totalCheckins: 10,
        totalXp: 150,
        lastDailyUpdate: '2026-04-17',
        dailyCheckins: 3,
        dailyXp: 45,
        lastMonthlyUpdate: '2026-04',
        monthlyCheckins: 7,
        monthlyXp: 105,
    };

    it('returns null when existing is missing', () => {
        expect(planStatsForDelete(undefined, 10, '2026-04-17T10:00:00Z')).toBeNull();
        expect(planStatsForDelete(null, 10, '2026-04-17T10:00:00Z')).toBeNull();
    });

    it('decrements all counters when record is in the active day+month', () => {
        const plan = planStatsForDelete(stats, 15, '2026-04-17T10:00:00Z');
        expect(plan?.decrements).toEqual({
            'stats.totalCheckins': -1,
            'stats.totalXp': -15,
            'stats.dailyCheckins': -1,
            'stats.dailyXp': -15,
            'stats.monthlyCheckins': -1,
            'stats.monthlyXp': -15,
        });
    });

    it('skips daily decrement for an older-day record', () => {
        const plan = planStatsForDelete(stats, 15, '2026-04-16T10:00:00Z');
        expect(plan?.decrements).toEqual({
            'stats.totalCheckins': -1,
            'stats.totalXp': -15,
            'stats.monthlyCheckins': -1,
            'stats.monthlyXp': -15,
        });
    });

    it('skips monthly decrement for a previous-month record', () => {
        const plan = planStatsForDelete(stats, 15, '2026-03-10T10:00:00Z');
        expect(plan?.decrements).toEqual({
            'stats.totalCheckins': -1,
            'stats.totalXp': -15,
        });
    });
});
