import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt, faCalendar, faLayerGroup, faStar } from '@fortawesome/free-solid-svg-icons';
import type { StatsAggregation, StatsFiltersState, StatsRange } from '../types';

const RANGE_LABELS: Record<StatsRange, string> = {
    '7d': 'last week',
    '30d': 'last month',
    '90d': 'last 3 months',
    all: 'all time',
};

interface Props {
    filters: StatsFiltersState;
    today: StatsAggregation['today'];
}

/**
 * MonkeyType filter-summary strip: a centered row of icon+value pairs in the
 * sub color, sitting right above the history chart.
 */
export function FilterSummary({ filters, today }: Props) {
    const groupsLabel =
        filters.groups === 'all'
            ? 'all'
            : filters.groups.map((g) => g.toLowerCase()).join(', ') || 'none';

    const xpLabel = `${today.xp >= 0 ? '+' : ''}${today.xp} xp today`;

    return (
        <div className="mt-4 mb-4 flex flex-wrap justify-center gap-4 text-xs text-sub">
            <span className="inline-flex items-center gap-1">
                <FontAwesomeIcon icon={faCalendar} fixedWidth />
                {RANGE_LABELS[filters.range]}
            </span>
            <span className="inline-flex items-center gap-1">
                <FontAwesomeIcon icon={faLayerGroup} fixedWidth />
                {groupsLabel}
            </span>
            <span className="inline-flex items-center gap-1">
                <FontAwesomeIcon icon={faBolt} fixedWidth />
                {today.checkins} check-ins today
            </span>
            <span className="inline-flex items-center gap-1">
                <FontAwesomeIcon icon={faStar} fixedWidth />
                {xpLabel}
            </span>
        </div>
    );
}
