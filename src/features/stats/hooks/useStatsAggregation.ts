import { useMemo, useState } from 'react';
import { useHistoryStore } from '../../../stores/historyStore';
import { useMetadataStore } from '../../../stores/metadataStore';
import {
    computeTodayDeltas,
    dailyXpSeries,
    reconstructSeries,
    splitGrewFell,
    summariseToday,
    topNByAbsDelta,
} from '../utils/statsMath';
import type { StatsAggregation } from '../types';

const DAILY_XP_WINDOW_DAYS = 7;
const GROWTH_WINDOW_DAYS = 7;
const TOP_MOVERS_LIMIT = 5;

/**
 * Reads history + innerfaces from live Zustand stores and derives everything
 * the stats page needs: today's headline numbers, per-innerface deltas split
 * into grew/fell, and last-7-days trajectories.
 *
 * `nowMs` is pinned to first render so memoisation is stable. The page is
 * expected to remount on navigation, which is enough to re-anchor "today".
 */
export function useStatsAggregation(): StatsAggregation {
    const history = useHistoryStore((s) => s.history);
    const innerfaces = useMetadataStore((s) => s.innerfaces);

    // Pin "now" to mount time via lazy state init. StoreSync already
    // remounts the subtree when the active personality or context changes,
    // so we get a fresh window anchor automatically on each visit.
    const [nowMs] = useState<number>(() => Date.now());

    return useMemo<StatsAggregation>(() => {
        const liveInnerfaces = innerfaces.filter((i) => !i.deletedAt);

        const today = summariseToday(history, nowMs);
        const deltas = computeTodayDeltas(history, liveInnerfaces, nowMs);
        const { grew, fell } = splitGrewFell(deltas);

        const dailyXp = dailyXpSeries(history, nowMs, DAILY_XP_WINDOW_DAYS);
        const series = liveInnerfaces.map((i) =>
            reconstructSeries(i, history, nowMs, GROWTH_WINDOW_DAYS)
        );
        const topSeries = topNByAbsDelta(series, TOP_MOVERS_LIMIT);

        return {
            today,
            grew,
            fell,
            dailyXp,
            series: topSeries,
        };
    }, [history, innerfaces, nowMs]);
}
