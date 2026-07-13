import { format, parseISO } from 'date-fns';
import type { StatsAggregation } from '../types';

/**
 * MonkeyType TestStats port: a centered hero number followed by a 3-column
 * grid of plain stat tiles — label in sub above a large text-colored value,
 * no card surfaces, exactly like the MT account page.
 */
export function StatsTiles({ stats }: { stats: StatsAggregation }) {
    const { range, streakDays, powers } = stats;

    return (
        <>
            <div className="flex items-center justify-center text-sub">
                total xp earned{' '}
                <span className="p-5 text-5xl text-text-primary">{range.totalXp}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <Stat header="check-ins" value={String(range.totalCheckins)} />
                <Stat
                    header="days active"
                    value={String(range.activeDays)}
                    caption={
                        range.activeDays > 0
                            ? `${range.checkinsPerActiveDay.toFixed(1)} check-ins per active day`
                            : undefined
                    }
                />
                <Stat
                    header="current streak"
                    value={streakDays === 1 ? '1 day' : `${streakDays} days`}
                />

                <Stat
                    header="best day"
                    value={`${range.bestDayXp} xp`}
                    caption={
                        range.bestDayISO
                            ? format(parseISO(range.bestDayISO), 'dd MMM yyyy')
                            : undefined
                    }
                />
                <Stat header="average xp per active day" value={String(range.avgXpPerActiveDay)} />
                <Stat
                    header="average xp (last 10 active days)"
                    value={String(range.avgXpLast10ActiveDays)}
                />

                <Stat header="skills tracked" value={String(powers.powersTracked)} />
                <Stat
                    header="highest skill level"
                    value={String(powers.highestPowerLevel)}
                    caption={powers.highestPowerName ?? undefined}
                />
                <Stat header="average skill score" value={powers.averageLevel.toFixed(1)} />
            </div>
        </>
    );
}

function Stat({ header, value, caption }: { header: string; value: string; caption?: string }) {
    return (
        <div>
            <div className="text-sub">{header}</div>
            <div className="text-2xl leading-[1.1] text-text-primary md:text-3xl lg:text-5xl">
                {value}
            </div>
            {caption && <div className="text-xs text-text-primary">{caption}</div>}
        </div>
    );
}
