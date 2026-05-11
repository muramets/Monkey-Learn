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
}
