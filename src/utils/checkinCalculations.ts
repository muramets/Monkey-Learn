import { format } from 'date-fns';
import type { PersonalityStats } from '../types/personality';

/**
 * Pure check-in calculations shared between the client-SDK store and
 * the admin-SDK CLI / Cloud Functions. No Firestore, no React, no Zustand.
 *
 * Callers translate the returned plain objects into their SDK's write
 * primitives (updateDoc + increment() / Admin FieldValue.increment).
 */

export interface InnerfaceScoreSnapshot {
    currentScore?: number;
    initialScore?: number;
}

/**
 * Rounds to 4 decimal places to avoid floating point drift in sequential
 * check-ins. Mirrors historical behavior from historyStore.addCheckin.
 */
function round4(value: number): number {
    return Number(value.toFixed(4));
}

/**
 * Compute the new score for an innerface when a check-in adds `weight`.
 *
 * The `||` chain (not `??`) is intentional and predates this refactor:
 * it treats score of 0 as "fallback to initialScore", recovering from
 * accidental resets.
 */
export function computeCheckinScore(snapshot: InnerfaceScoreSnapshot, weight: number): number {
    const currentTotal = snapshot.currentScore || snapshot.initialScore || 0;
    return Math.max(0, round4(currentTotal + Number(weight)));
}

/**
 * Compute the score after reverting a prior check-in of `weight`.
 * Used when a check-in is deleted.
 */
export function computeRevertedScore(currentScore: number, weight: number): number {
    return Math.max(0, round4(currentScore - Number(weight)));
}

/**
 * Convert a protocol weight (e.g. 0.15) into integer XP (e.g. 15).
 * Matches the display convention: 1 level = 100 XP.
 */
export function weightToXp(weight: number | undefined): number {
    return Math.round((weight || 0) * 100);
}

/**
 * Result of planning a stats update for a check-in.
 *
 * `initialize` — caller should set the whole `stats` object (first check-in).
 * `patch` — caller should apply path-level increments and resets.
 *
 * Both shapes use Firestore dot-notation keys (e.g. `stats.totalXp`) so the
 * caller just forwards them to `update()` after wrapping numeric deltas in
 * its own `increment()` (client SDK) or `FieldValue.increment()` (admin SDK).
 */
export type StatsCheckinPlan =
    | { mode: 'initialize'; stats: PersonalityStats }
    | { mode: 'patch'; increments: Record<string, number>; resets: Record<string, string | number> };

/**
 * Plan a stats update for a new check-in.
 *
 * Returns `initialize` when the personality has no stats yet (first check-in);
 * otherwise returns `patch` with increments (same-day/same-month) and resets
 * (day or month rollover).
 */
export function planStatsForCheckin(
    existing: PersonalityStats | undefined | null,
    recordXp: number,
    now: Date
): StatsCheckinPlan {
    const todayStr = format(now, 'yyyy-MM-dd');
    const monthStr = format(now, 'yyyy-MM');

    if (!existing) {
        return {
            mode: 'initialize',
            stats: {
                totalCheckins: 1,
                totalXp: recordXp,
                lastDailyUpdate: todayStr,
                dailyCheckins: 1,
                dailyXp: recordXp,
                lastMonthlyUpdate: monthStr,
                monthlyCheckins: 1,
                monthlyXp: recordXp,
            },
        };
    }

    const increments: Record<string, number> = {
        'stats.totalCheckins': 1,
        'stats.totalXp': recordXp,
    };
    const resets: Record<string, string | number> = {};

    if (existing.lastDailyUpdate === todayStr) {
        increments['stats.dailyCheckins'] = 1;
        increments['stats.dailyXp'] = recordXp;
    } else {
        resets['stats.lastDailyUpdate'] = todayStr;
        resets['stats.dailyCheckins'] = 1;
        resets['stats.dailyXp'] = recordXp;
    }

    if (existing.lastMonthlyUpdate === monthStr) {
        increments['stats.monthlyCheckins'] = 1;
        increments['stats.monthlyXp'] = recordXp;
    } else {
        resets['stats.lastMonthlyUpdate'] = monthStr;
        resets['stats.monthlyCheckins'] = 1;
        resets['stats.monthlyXp'] = recordXp;
    }

    return { mode: 'patch', increments, resets };
}

/**
 * Plan a stats update for deleting a check-in.
 *
 * Only decrements daily/monthly counters if the record belongs to the
 * current active day/month stored in stats. Returns null when there is
 * nothing to do (no existing stats).
 */
export function planStatsForDelete(
    existing: PersonalityStats | undefined | null,
    recordXp: number,
    recordTimestamp: string
): { decrements: Record<string, number> } | null {
    if (!existing) return null;

    const recordDate = new Date(recordTimestamp);
    const recordDateStr = format(recordDate, 'yyyy-MM-dd');
    const recordMonthStr = format(recordDate, 'yyyy-MM');

    const decrements: Record<string, number> = {
        'stats.totalCheckins': -1,
        'stats.totalXp': -recordXp,
    };

    if (existing.lastDailyUpdate === recordDateStr) {
        decrements['stats.dailyCheckins'] = -1;
        decrements['stats.dailyXp'] = -recordXp;
    }

    if (existing.lastMonthlyUpdate === recordMonthStr) {
        decrements['stats.monthlyCheckins'] = -1;
        decrements['stats.monthlyXp'] = -recordXp;
    }

    return { decrements };
}
