import { useMemo, useState } from 'react';
import { useHistoryStore } from '../../../stores/historyStore';
import { useMetadataStore } from '../../../stores/metadataStore';
import {
    computeRangeStats,
    computeTodayDeltas,
    currentStreakDays,
    dailyXpSeries,
    localMidnightOffset,
    reconstructSeries,
    splitGrewFell,
    summariseToday,
} from '../utils/statsMath';
import type { StatsAggregation, StatsFiltersState } from '../types';

const ALL_TIME_MAX_DAYS = 365;

function rangeToDays(
    range: StatsFiltersState['range'],
    firstCheckinMs: number | null,
    nowMs: number
): number {
    if (range === '7d') return 7;
    if (range === '30d') return 30;
    if (range === '90d') return 90;
    // 'all': stretch back to the first check-in, clamped to a sane window.
    if (firstCheckinMs === null) return 7;
    const days = Math.ceil((nowMs - firstCheckinMs) / 86_400_000) + 1;
    return Math.min(Math.max(days, 7), ALL_TIME_MAX_DAYS);
}

/**
 * Reads history + innerfaces from live Zustand stores and derives everything
 * the stats page needs: today's headline numbers, range totals for the tiles,
 * per-innerface deltas split into grew/fell, and windowed trajectories —
 * all scoped by the page filters (date range + power groups).
 *
 * `nowMs` is pinned to first render so memoisation is stable. The page is
 * expected to remount on navigation, which is enough to re-anchor "today".
 */
export function useStatsAggregation(filters: StatsFiltersState): StatsAggregation {
    const history = useHistoryStore((s) => s.history);
    const innerfaces = useMetadataStore((s) => s.innerfaces);

    // Pin "now" to mount time via lazy state init. StoreSync already
    // remounts the subtree when the active personality or context changes,
    // so we get a fresh window anchor automatically on each visit.
    const [nowMs] = useState<number>(() => Date.now());

    return useMemo<StatsAggregation>(() => {
        const liveInnerfaces = innerfaces.filter((i) => !i.deletedAt);

        const availableGroups = [...new Set(
            liveInnerfaces.map((i) => i.group || 'ungrouped')
        )].sort((a, b) => a.localeCompare(b));

        const filtered =
            filters.groups === 'all'
                ? liveInnerfaces
                : liveInnerfaces.filter((i) =>
                    (filters.groups as string[]).includes(i.group || 'ungrouped')
                );

        const firstLive = history
            .filter((r) => !r.deletedAt && r.type === 'protocol')
            .reduce<number | null>((min, r) => {
                const ts = new Date(r.timestamp).getTime();
                return min === null || ts < min ? ts : min;
            }, null);

        const windowDays = rangeToDays(filters.range, firstLive, nowMs);
        const sinceMs = filters.range === 'all' ? null : localMidnightOffset(nowMs, -(windowDays - 1));

        const today = summariseToday(history, nowMs);
        const deltas = computeTodayDeltas(history, filtered, nowMs);
        const { grew, fell } = splitGrewFell(deltas);

        const dailyXp = dailyXpSeries(history, nowMs, windowDays);
        const series = filtered.map((i) => reconstructSeries(i, history, nowMs, windowDays));

        const range = computeRangeStats(history, nowMs, sinceMs);
        const streakDays = currentStreakDays(history, nowMs);

        const scores = filtered.map((i) => i.currentScore ?? i.initialScore ?? 0);
        const highestIdx = scores.reduce(
            (best, s, idx) => (s > scores[best] ? idx : best),
            0
        );
        const powers = {
            powersTracked: filtered.length,
            highestPowerName: filtered.length > 0 ? filtered[highestIdx].name : null,
            highestPowerLevel: filtered.length > 0 ? Math.floor(scores[highestIdx]) : 0,
            averageLevel:
                filtered.length > 0
                    ? Number((scores.reduce((a, b) => a + b, 0) / filtered.length).toFixed(1))
                    : 0,
        };

        return {
            today,
            grew,
            fell,
            dailyXp,
            series,
            range,
            streakDays,
            powers,
            windowDays,
            availableGroups,
        };
    }, [history, innerfaces, nowMs, filters]);
}
