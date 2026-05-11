import { format } from 'date-fns';
import type { StatsAggregation } from '../types';

interface StatCellProps {
    title: string;
    value: string;
    // Visual tone: `accent` = yellow (main), `xp` = green/red by sign,
    // default = text-primary.
    tone?: 'accent' | 'xp' | 'default';
    xpSign?: number;
}

function StatCell({ title, value, tone = 'default', xpSign = 0 }: StatCellProps) {
    const valueClass =
        tone === 'accent'
            ? 'text-main'
            : tone === 'xp'
                ? xpSign < 0
                    ? 'text-error'
                    : 'text-correct'
                : 'text-text-primary';
    return (
        <div className="flex flex-col gap-1">
            <div className="text-xs uppercase tracking-wider text-text-secondary font-mono">{title}</div>
            <div className={`text-4xl leading-none font-mono ${valueClass}`}>{value}</div>
        </div>
    );
}

function formatClock(iso: string | null): string {
    if (!iso) return '—';
    return format(new Date(iso), 'HH:mm');
}

interface Props {
    today: StatsAggregation['today'];
}

export function StatsHeader({ today }: Props) {
    return (
        <div className="bg-bg-secondary rounded-lg p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <StatCell title="check-ins today" value={today.checkins.toString()} tone="accent" />
                <StatCell title="xp today" value={today.xp.toString()} tone="xp" xpSign={today.xp} />
                <StatCell title="first check-in" value={formatClock(today.firstCheckinISO)} />
                <StatCell title="last check-in" value={formatClock(today.lastCheckinISO)} />
            </div>
        </div>
    );
}
