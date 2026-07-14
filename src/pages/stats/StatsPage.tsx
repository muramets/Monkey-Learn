import { useMemo, useState } from 'react';
import { useStatsAggregation } from '../../features/stats/hooks/useStatsAggregation';
import { useHistoryStore } from '../../stores/historyStore';
import { StatsFilters } from '../../features/stats/components/StatsFilters';
import { FilterSummary } from '../../features/stats/components/FilterSummary';
import { GrowthChart } from '../../features/stats/components/GrowthChart';
import { HistoryChartFooter } from '../../features/stats/components/HistoryChartFooter';
import { DailyXpBars } from '../../features/stats/components/DailyXpBars';
import { StatsTiles } from '../../features/stats/components/StatsTiles';
import { GrewFellPanel } from '../../features/stats/components/GrewFellPanel';
import { CheckinsTable } from '../../features/stats/components/CheckinsTable';
import {
    leastSquaresTrend,
    localMidnightOffset,
    recentCheckins,
    topNByAbsDelta,
} from '../../features/stats/utils/statsMath';
import type { StatsFiltersState } from '../../features/stats/types';

const TOP_MOVERS_LIMIT = 5;

/**
 * Stats page composed 1:1 after MonkeyType's account page: filters →
 * history chart with trend + toggles → daily activity chart → stat tiles →
 * grew/fell columns → results table with load more.
 */
export default function StatsPage() {
    const [filters, setFilters] = useState<StatsFiltersState>({ range: '7d', groups: 'all' });
    const [topOnly, setTopOnly] = useState(true);
    const [beginAtZero, setBeginAtZero] = useState(false);
    // Pinned to mount like useStatsAggregation's anchor, so the table and
    // the aggregation agree on what "now" means.
    const [nowMs] = useState<number>(() => Date.now());

    const stats = useStatsAggregation(filters);
    const history = useHistoryStore((s) => s.history);

    const shownSeries = useMemo(
        () => (topOnly ? topNByAbsDelta(stats.series, TOP_MOVERS_LIMIT) : stats.series),
        [stats.series, topOnly]
    );

    const trendPerDay = useMemo(
        () => leastSquaresTrend(stats.dailyXp.map((d) => d.xp))?.slope ?? null,
        [stats.dailyXp]
    );

    const checkins = useMemo(() => {
        const sinceMs =
            filters.range === 'all' ? null : localMidnightOffset(nowMs, -(stats.windowDays - 1));
        return recentCheckins(history, nowMs, sinceMs);
    }, [history, filters.range, stats.windowDays, nowMs]);

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 font-mono">
            <StatsFilters
                filters={filters}
                availableGroups={stats.availableGroups}
                onChange={setFilters}
            />

            <div data-tour="stats-growth">
                <FilterSummary filters={filters} today={stats.today} />
                <GrowthChart series={shownSeries} beginAtZero={beginAtZero} />
                <HistoryChartFooter
                    trendPerDay={trendPerDay}
                    topOnly={topOnly}
                    beginAtZero={beginAtZero}
                    onToggleTop={setTopOnly}
                    onToggleZero={() => setBeginAtZero((v) => !v)}
                />
            </div>

            <div data-tour="stats-daily"><DailyXpBars daily={stats.dailyXp} /></div>

            <div data-tour="stats-tiles"><StatsTiles stats={stats} /></div>

            <GrewFellPanel grew={stats.grew} fell={stats.fell} />

            <div data-tour="stats-table"><CheckinsTable checkins={checkins} /></div>
        </div>
    );
}
