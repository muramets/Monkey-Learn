import { weightToXp } from '../../../utils/checkinCalculations';
import type { HistoryRecord } from '../../../types/history';
import type { Innerface } from '../../innerfaces/types';
import type {
    DailyXp,
    InnerfaceSeries,
    RangeStats,
    SeriesPoint,
    TodayDelta,
} from '../types';

/**
 * All helpers are pure. Time inputs are passed in via `nowMs` so tests and
 * memoised callers can pin "now" without relying on `Date.now()` side
 * effects during render.
 */

export function localMidnight(nowMs: number): number {
    const d = new Date(nowMs);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

export function localMidnightOffset(nowMs: number, dayOffset: number): number {
    const d = new Date(nowMs);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + dayOffset);
    return d.getTime();
}

function isLive(record: HistoryRecord): boolean {
    return !record.deletedAt;
}

function dateKey(ms: number): string {
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function deltaFor(record: HistoryRecord, innerfaceId: string | number): number {
    const changes = record.changes ?? {};
    const direct = changes[innerfaceId];
    if (direct !== undefined) return Number(direct);
    const numKey = typeof innerfaceId === 'string' ? Number(innerfaceId) : innerfaceId;
    if (!Number.isNaN(numKey)) {
        const alt = changes[numKey];
        if (alt !== undefined) return Number(alt);
    }
    const strKey = String(innerfaceId);
    const altStr = changes[strKey];
    if (altStr !== undefined) return Number(altStr);
    return 0;
}

export interface TodaySummary {
    checkins: number;
    xp: number;
    firstCheckinISO: string | null;
    lastCheckinISO: string | null;
}

export function summariseToday(history: HistoryRecord[], nowMs: number): TodaySummary {
    const since = localMidnight(nowMs);
    const todayOnly = history
        .filter(isLive)
        .filter((r) => r.type === 'protocol')
        .filter((r) => new Date(r.timestamp).getTime() >= since);

    if (todayOnly.length === 0) {
        return { checkins: 0, xp: 0, firstCheckinISO: null, lastCheckinISO: null };
    }

    const sorted = [...todayOnly].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const xp = sorted.reduce((acc, r) => acc + weightToXp(r.weight), 0);
    return {
        checkins: sorted.length,
        xp,
        firstCheckinISO: sorted[0].timestamp,
        lastCheckinISO: sorted[sorted.length - 1].timestamp,
    };
}

export function computeTodayDeltas(
    history: HistoryRecord[],
    innerfaces: Innerface[],
    nowMs: number
): TodayDelta[] {
    const since = localMidnight(nowMs);
    const today = history
        .filter(isLive)
        .filter((r) => new Date(r.timestamp).getTime() >= since);

    const result: TodayDelta[] = [];
    for (const innerface of innerfaces) {
        let delta = 0;
        let count = 0;
        for (const record of today) {
            const d = deltaFor(record, innerface.id);
            if (d !== 0) {
                delta += d;
                count += 1;
            }
        }
        if (delta !== 0 || count !== 0) {
            result.push({ innerface, delta: Number(delta.toFixed(4)), checkinCount: count });
        }
    }
    return result;
}

export function splitGrewFell(deltas: TodayDelta[]): { grew: TodayDelta[]; fell: TodayDelta[] } {
    const grew = deltas.filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta);
    const fell = deltas.filter((d) => d.delta < 0).sort((a, b) => a.delta - b.delta);
    return { grew, fell };
}

export function dailyXpSeries(
    history: HistoryRecord[],
    nowMs: number,
    days: number
): DailyXp[] {
    const buckets: Record<string, DailyXp> = {};
    for (let i = days - 1; i >= 0; i -= 1) {
        const ms = localMidnightOffset(nowMs, -i);
        const key = dateKey(ms);
        buckets[key] = { dateISO: key, xp: 0, checkins: 0 };
    }

    const floor = localMidnightOffset(nowMs, -(days - 1));
    for (const r of history) {
        if (!isLive(r)) continue;
        if (r.type !== 'protocol') continue;
        const ts = new Date(r.timestamp).getTime();
        if (ts < floor) continue;
        const key = dateKey(ts);
        const bucket = buckets[key];
        if (!bucket) continue;
        bucket.xp += weightToXp(r.weight);
        bucket.checkins += 1;
    }

    return Object.values(buckets);
}

/**
 * Reconstructs a score trajectory for an innerface over the window
 * by walking history deltas backwards from the current score.
 *
 * Emits one point per local day (score at end-of-day) plus a live
 * "now" anchor. This resampling matches MonkeyType's "one test, one
 * point" density — the curve reads as a smooth weekly trend instead
 * of spiking wherever many check-ins happened to land in one cluster.
 * Per-check-in granularity is preserved in the history feed and in
 * the "grew today" / "fell today" panels; this series is strictly a
 * shape-of-growth visualisation.
 */
export function reconstructSeries(
    innerface: Innerface,
    history: HistoryRecord[],
    nowMs: number,
    days: number
): InnerfaceSeries {
    const windowStart = localMidnightOffset(nowMs, -(days - 1));

    // If the innerface was created *inside* the window, clip the line's
    // left edge to its birth — we don't want a fake flatline stretching
    // back into time when the skill didn't exist yet. For pre-window
    // innerfaces (most of them) this is a no-op.
    const createdAtMs = innerface.createdAt ? new Date(innerface.createdAt).getTime() : null;
    const effectiveStart =
        createdAtMs !== null && createdAtMs > windowStart ? createdAtMs : windowStart;

    const events = history
        .filter(isLive)
        .filter((r) => new Date(r.timestamp).getTime() >= effectiveStart)
        .map((r) => ({ t: new Date(r.timestamp).getTime(), d: deltaFor(r, innerface.id) }))
        .filter((e) => e.d !== 0)
        .sort((a, b) => a.t - b.t);

    const currentScore = innerface.currentScore ?? innerface.initialScore ?? 0;
    const totalDelta = events.reduce((acc, e) => acc + e.d, 0);
    // Before any events in-window the score equals currentScore minus the
    // events we'll replay. For an innerface born inside the window that's
    // usually just `initialScore`; for one born before, it's the score at
    // `effectiveStart`.
    const startScore = Math.max(0, Number((currentScore - totalDelta).toFixed(4)));

    // Replay events into a dense lookup timeline keyed on the effective
    // start so scoreAt() never leaks pre-birth time.
    const replay: SeriesPoint[] = [];
    replay.push({ t: effectiveStart, score: startScore });
    let running = startScore;
    for (const e of events) {
        running = Math.max(0, Number((running + e.d).toFixed(4)));
        replay.push({ t: e.t, score: running });
    }
    replay.push({ t: nowMs, score: Number(currentScore.toFixed(4)) });

    const points: SeriesPoint[] = [];
    points.push({ t: effectiveStart, score: startScore });
    for (let i = 1; i < days; i += 1) {
        const dayEnd = localMidnightOffset(nowMs, -(days - 1 - i)) - 1;
        // Drop buckets that end before the innerface existed — they would
        // draw a phantom line into pre-birth time otherwise.
        if (dayEnd < effectiveStart) continue;
        points.push({ t: dayEnd, score: scoreAt(replay, dayEnd) });
    }
    points.push({ t: nowMs, score: Number(currentScore.toFixed(4)) });

    const delta = Number((currentScore - startScore).toFixed(4));
    return { innerface, points, delta };
}

function scoreAt(replay: SeriesPoint[], t: number): number {
    // Last replay entry whose timestamp is ≤ t. Walking forward is fine
    // for the window sizes we deal with (tens of events per innerface).
    let score = replay[0].score;
    for (const p of replay) {
        if (p.t <= t) score = p.score;
        else break;
    }
    return score;
}

export function topNByAbsDelta(series: InnerfaceSeries[], n: number): InnerfaceSeries[] {
    return [...series].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, n);
}

/**
 * Aggregates protocol check-ins inside [sinceMs, nowMs] into the headline
 * numbers for the stats tiles. `sinceMs === null` means all time.
 */
export function computeRangeStats(
    history: HistoryRecord[],
    nowMs: number,
    sinceMs: number | null
): RangeStats {
    const inRange = history
        .filter(isLive)
        .filter((r) => r.type === 'protocol')
        .filter((r) => {
            const ts = new Date(r.timestamp).getTime();
            return ts <= nowMs && (sinceMs === null || ts >= sinceMs);
        })
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (inRange.length === 0) {
        return {
            totalXp: 0,
            totalCheckins: 0,
            activeDays: 0,
            checkinsPerActiveDay: 0,
            bestDayXp: 0,
            bestDayISO: null,
            avgXpPerActiveDay: 0,
            avgXpLast10ActiveDays: 0,
            firstCheckinISO: null,
        };
    }

    const byDay = new Map<string, { xp: number; checkins: number }>();
    let totalXp = 0;
    for (const r of inRange) {
        const key = dateKey(new Date(r.timestamp).getTime());
        const bucket = byDay.get(key) ?? { xp: 0, checkins: 0 };
        const xp = weightToXp(r.weight);
        bucket.xp += xp;
        bucket.checkins += 1;
        byDay.set(key, bucket);
        totalXp += xp;
    }

    let bestDayXp = -Infinity;
    let bestDayISO: string | null = null;
    for (const [day, bucket] of byDay) {
        if (bucket.xp > bestDayXp) {
            bestDayXp = bucket.xp;
            bestDayISO = day;
        }
    }

    const activeDays = byDay.size;
    const dayXps = [...byDay.values()].map((b) => b.xp);
    const last10 = dayXps.slice(-10);

    return {
        totalXp,
        totalCheckins: inRange.length,
        activeDays,
        checkinsPerActiveDay: Number((inRange.length / activeDays).toFixed(1)),
        bestDayXp,
        bestDayISO,
        avgXpPerActiveDay: Math.round(totalXp / activeDays),
        avgXpLast10ActiveDays: Math.round(last10.reduce((a, b) => a + b, 0) / last10.length),
        firstCheckinISO: inRange[0].timestamp,
    };
}

/**
 * Consecutive-day check-in streak ending today (or yesterday, so an
 * unfinished today doesn't break the chain). Always computed over the
 * full history, independent of the page filters.
 */
export function currentStreakDays(history: HistoryRecord[], nowMs: number): number {
    const activeDayKeys = new Set(
        history
            .filter(isLive)
            .filter((r) => r.type === 'protocol')
            .map((r) => dateKey(new Date(r.timestamp).getTime()))
    );
    if (activeDayKeys.size === 0) return 0;

    let offset = 0;
    // A quiet today keeps yesterday's streak alive.
    if (!activeDayKeys.has(dateKey(localMidnightOffset(nowMs, 0)))) offset = -1;

    let streak = 0;
    while (activeDayKeys.has(dateKey(localMidnightOffset(nowMs, offset - streak)))) {
        streak += 1;
    }
    return streak;
}

/**
 * Live protocol check-ins inside [sinceMs, nowMs], newest first — feed for
 * the results table. `sinceMs === null` means all time.
 */
export function recentCheckins(
    history: HistoryRecord[],
    nowMs: number,
    sinceMs: number | null
): HistoryRecord[] {
    return history
        .filter(isLive)
        .filter((r) => r.type === 'protocol')
        .filter((r) => {
            const ts = new Date(r.timestamp).getTime();
            return ts <= nowMs && (sinceMs === null || ts >= sinceMs);
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Least-squares fit over evenly spaced samples. Returns null for fewer than
 * two points. `first`/`last` are the fitted values at both ends — enough to
 * draw the dotted trendline dataset and to phrase a "change per day" caption.
 */
export function leastSquaresTrend(
    values: number[]
): { slope: number; first: number; last: number } | null {
    const n = values.length;
    if (n < 2) return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i += 1) {
        sumX += i;
        sumY += values[i];
        sumXY += i * values[i];
        sumXX += i * i;
    }
    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return null;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return { slope, first: intercept, last: intercept + slope * (n - 1) };
}
