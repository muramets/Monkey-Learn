import { useStatsAggregation } from '../../features/stats/hooks/useStatsAggregation';
import { StatsHeader } from '../../features/stats/components/StatsHeader';
import { GrowthChart } from '../../features/stats/components/GrowthChart';
import { DailyXpBars } from '../../features/stats/components/DailyXpBars';
import { GrewFellPanel } from '../../features/stats/components/GrewFellPanel';

export default function StatsPage() {
    const { today, grew, fell, dailyXp, series } = useStatsAggregation();

    return (
        <div className="w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
            <StatsHeader today={today} />
            <GrowthChart series={series} days={7} />
            <DailyXpBars daily={dailyXp} />
            <GrewFellPanel grew={grew} fell={fell} />
        </div>
    );
}
