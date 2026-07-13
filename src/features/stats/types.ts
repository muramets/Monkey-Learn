import type { Innerface } from '../innerfaces/types';

export interface TodayDelta {
    innerface: Innerface;
    delta: number;
    checkinCount: number;
}

export interface DailyXp {
    dateISO: string;
    xp: number;
    checkins: number;
}

export interface SeriesPoint {
    t: number;
    score: number;
}

export interface InnerfaceSeries {
    innerface: Innerface;
    points: SeriesPoint[];
    delta: number;
}

export type StatsRange = '7d' | '30d' | '90d' | 'all';

export interface RangeStats {
    totalXp: number;
    totalCheckins: number;
    activeDays: number;
    checkinsPerActiveDay: number;
    bestDayXp: number;
    bestDayISO: string | null;
    avgXpPerActiveDay: number;
    avgXpLast10ActiveDays: number;
    firstCheckinISO: string | null;
}

export interface StatsFiltersState {
    range: StatsRange;
    /** 'all' or an explicit set of enabled group names. */
    groups: 'all' | string[];
}

export interface PowerTiles {
    powersTracked: number;
    highestPowerName: string | null;
    highestPowerLevel: number;
    averageLevel: number;
}

export interface StatsAggregation {
    today: {
        checkins: number;
        xp: number;
        firstCheckinISO: string | null;
        lastCheckinISO: string | null;
    };
    grew: TodayDelta[];
    fell: TodayDelta[];
    dailyXp: DailyXp[];
    series: InnerfaceSeries[];
    /** Headline tile numbers for the active date range. */
    range: RangeStats;
    streakDays: number;
    powers: PowerTiles;
    /** Days covered by the active window (resolved for 'all'). */
    windowDays: number;
    /** Group names available for the filter row. */
    availableGroups: string[];
}
