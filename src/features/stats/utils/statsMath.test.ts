import { describe, it, expect } from 'vitest';
import {
    localMidnight,
    localMidnightOffset,
    summariseToday,
    computeTodayDeltas,
    splitGrewFell,
    dailyXpSeries,
    reconstructSeries,
    topNByAbsDelta,
} from './statsMath';
import type { HistoryRecord } from '../../../types/history';
import type { Innerface } from '../../innerfaces/types';

const APR_18_NOON = new Date(2026, 3, 18, 12, 30, 0).getTime(); // local time

function checkin(partial: Partial<HistoryRecord> & Pick<HistoryRecord, 'id' | 'timestamp' | 'changes'>): HistoryRecord {
    return {
        type: 'protocol',
        protocolId: 'p1',
        protocolName: 'do thing',
        protocolIcon: 'star',
        weight: 0.1,
        targets: [],
        ...partial,
    } as HistoryRecord;
}

const focus: Innerface = { id: 'focus', name: 'Focus', icon: '🎯', initialScore: 1, currentScore: 1.5 };
const grit: Innerface = { id: 'grit', name: 'Grit', icon: '💪', initialScore: 2, currentScore: 1.7 };

describe('localMidnight', () => {
    it('rolls back to start of local day', () => {
        const ms = localMidnight(APR_18_NOON);
        const d = new Date(ms);
        expect(d.getHours()).toBe(0);
        expect(d.getMinutes()).toBe(0);
        expect(d.getSeconds()).toBe(0);
        expect(d.getDate()).toBe(18);
    });

    it('localMidnightOffset steps by full local days', () => {
        const yesterday = localMidnightOffset(APR_18_NOON, -1);
        expect(new Date(yesterday).getDate()).toBe(17);
        expect(new Date(yesterday).getHours()).toBe(0);
    });
});

describe('summariseToday', () => {
    it('sums XP from today protocol records only', () => {
        const history: HistoryRecord[] = [
            checkin({ id: 'a', timestamp: new Date(APR_18_NOON - 60_000).toISOString(), changes: { focus: 0.1 }, weight: 0.1 }),
            checkin({ id: 'b', timestamp: new Date(APR_18_NOON - 30_000).toISOString(), changes: { focus: 0.2 }, weight: 0.2 }),
            checkin({ id: 'c', type: 'decay', timestamp: new Date(APR_18_NOON).toISOString(), changes: { focus: -0.05 }, weight: -0.05 }),
            checkin({ id: 'd', timestamp: new Date(APR_18_NOON - 2 * 24 * 3600_000).toISOString(), changes: { focus: 0.5 }, weight: 0.5 }),
        ];
        const summary = summariseToday(history, APR_18_NOON);
        expect(summary.checkins).toBe(2);
        expect(summary.xp).toBe(30);
        expect(summary.firstCheckinISO).toBe(history[0].timestamp);
        expect(summary.lastCheckinISO).toBe(history[1].timestamp);
    });

    it('ignores soft-deleted records', () => {
        const history: HistoryRecord[] = [
            checkin({ id: 'a', timestamp: new Date(APR_18_NOON - 60_000).toISOString(), changes: { focus: 0.1 }, deletedAt: '2026-04-18T11:00:00Z' }),
        ];
        expect(summariseToday(history, APR_18_NOON).checkins).toBe(0);
    });
});

describe('computeTodayDeltas + splitGrewFell', () => {
    it('sums positive and negative deltas per innerface', () => {
        const history: HistoryRecord[] = [
            checkin({ id: 'a', timestamp: new Date(APR_18_NOON - 60_000).toISOString(), changes: { focus: 0.3, grit: -0.1 } }),
            checkin({ id: 'b', timestamp: new Date(APR_18_NOON).toISOString(), changes: { focus: 0.2 } }),
            checkin({ id: 'c', type: 'decay', timestamp: new Date(APR_18_NOON).toISOString(), changes: { grit: -0.1 } }),
        ];
        const deltas = computeTodayDeltas(history, [focus, grit], APR_18_NOON);
        const byId = Object.fromEntries(deltas.map((d) => [d.innerface.id, d]));
        expect(byId.focus.delta).toBeCloseTo(0.5, 4);
        expect(byId.focus.checkinCount).toBe(2);
        expect(byId.grit.delta).toBeCloseTo(-0.2, 4);
        expect(byId.grit.checkinCount).toBe(2);

        const { grew, fell } = splitGrewFell(deltas);
        expect(grew.map((d) => d.innerface.id)).toEqual(['focus']);
        expect(fell.map((d) => d.innerface.id)).toEqual(['grit']);
    });

    it('handles numeric vs string innerface ids in changes', () => {
        const mixed: Innerface = { id: 42, name: 'Mixed', icon: '🧪', initialScore: 0 };
        const history: HistoryRecord[] = [
            checkin({ id: 'a', timestamp: new Date(APR_18_NOON).toISOString(), changes: { '42': 0.25 } }),
        ];
        const [entry] = computeTodayDeltas(history, [mixed], APR_18_NOON);
        expect(entry.delta).toBeCloseTo(0.25, 4);
    });
});

describe('dailyXpSeries', () => {
    it('buckets protocol XP by local date across the window', () => {
        const twoDaysAgo = new Date(APR_18_NOON);
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        twoDaysAgo.setHours(9, 0, 0, 0);

        const history: HistoryRecord[] = [
            checkin({ id: 'a', timestamp: new Date(APR_18_NOON - 60_000).toISOString(), changes: {}, weight: 0.15 }),
            checkin({ id: 'b', timestamp: twoDaysAgo.toISOString(), changes: {}, weight: 0.5 }),
            checkin({ id: 'c', type: 'decay', timestamp: new Date(APR_18_NOON).toISOString(), changes: {}, weight: -0.1 }),
        ];
        const series = dailyXpSeries(history, APR_18_NOON, 7);
        expect(series.length).toBe(7);
        expect(series[series.length - 1].xp).toBe(15);
        expect(series[series.length - 1].checkins).toBe(1);
        expect(series[series.length - 3].xp).toBe(50);
        expect(series[series.length - 3].checkins).toBe(1);
    });
});

describe('reconstructSeries', () => {
    it('emits one point per day in the window plus a live `now` anchor', () => {
        const history: HistoryRecord[] = [
            checkin({ id: 'a', timestamp: new Date(APR_18_NOON - 48 * 3600_000).toISOString(), changes: { focus: 0.2 } }),
            checkin({ id: 'b', timestamp: new Date(APR_18_NOON - 12 * 3600_000).toISOString(), changes: { focus: 0.3 } }),
        ];
        const series = reconstructSeries(focus, history, APR_18_NOON, 7);
        // 7 daily buckets + synthetic `now` = 8 points
        expect(series.points).toHaveLength(8);
        expect(series.points[0].score).toBeCloseTo(1.0, 4);
        expect(series.points[series.points.length - 1].score).toBeCloseTo(1.5, 4);
        expect(series.points[series.points.length - 1].t).toBe(APR_18_NOON);
        expect(series.delta).toBeCloseTo(0.5, 4);
    });

    it('each daily point reflects score at end-of-day (not instant)', () => {
        const history: HistoryRecord[] = [
            // Single check-in 2 days ago at noon — the day-before-yesterday
            // bucket should already reflect the bumped score.
            checkin({ id: 'a', timestamp: new Date(APR_18_NOON - 48 * 3600_000).toISOString(), changes: { focus: 0.2 } }),
        ];
        const series = reconstructSeries(focus, history, APR_18_NOON, 7);
        const lastIdx = series.points.length - 1;
        // Points[0] = start (7 days ago midnight) — no events yet
        expect(series.points[0].score).toBeCloseTo(1.3, 4);
        // After the check-in day, daily score should equal the bumped value
        // (we don't know exact index without running, but last few must be 1.5)
        expect(series.points[lastIdx].score).toBeCloseTo(1.5, 4);
        expect(series.points[lastIdx - 1].score).toBeCloseTo(1.5, 4);
    });

    it('clips the left edge at innerface.createdAt when it falls inside the window', () => {
        // Innerface born 3 days ago — earlier days shouldn't appear.
        const born3DaysAgo = new Date(APR_18_NOON - 3 * 24 * 3600_000 - 2 * 3600_000).toISOString();
        const recent: Innerface = {
            id: 'recent',
            name: 'R',
            icon: '.',
            initialScore: 0,
            currentScore: 0.3,
            createdAt: born3DaysAgo,
        };
        const history: HistoryRecord[] = [
            checkin({ id: 'a', timestamp: new Date(APR_18_NOON - 24 * 3600_000).toISOString(), changes: { recent: 0.3 } }),
        ];
        const series = reconstructSeries(recent, history, APR_18_NOON, 7);
        // No daily bucket should end before the birth time.
        const minT = Math.min(...series.points.map((p) => p.t));
        expect(minT).toBe(new Date(born3DaysAgo).getTime());
        // Far fewer than 8 points — only the days after birth survive.
        expect(series.points.length).toBeLessThan(8);
        expect(series.points[0].score).toBeCloseTo(0, 4);
        expect(series.points[series.points.length - 1].score).toBeCloseTo(0.3, 4);
    });

    it('clamps at zero when backward walk would underflow', () => {
        const emptyRun: Innerface = { id: 'empty', name: 'E', icon: '.', initialScore: 0, currentScore: 0.1 };
        const history: HistoryRecord[] = [
            checkin({ id: 'a', timestamp: new Date(APR_18_NOON - 24 * 3600_000).toISOString(), changes: { empty: 0.1 }, weight: 0.1 }),
        ];
        const series = reconstructSeries(emptyRun, history, APR_18_NOON, 7);
        expect(series.points[0].score).toBe(0);
    });
});

describe('topNByAbsDelta', () => {
    it('picks largest absolute movers regardless of sign', () => {
        const s = [
            { innerface: focus, points: [], delta: 0.5 },
            { innerface: grit, points: [], delta: -1.2 },
            { innerface: { id: 'x', name: 'x', icon: '.', initialScore: 0 } as Innerface, points: [], delta: 0.1 },
        ];
        const top = topNByAbsDelta(s, 2);
        expect(top.map((x) => x.innerface.id)).toEqual(['grit', 'focus']);
    });
});
