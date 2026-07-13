import { faFilter, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { ToggleButton } from '../../../components/ui/atoms/ToggleButton';
import { StatsSectionTitle } from './StatsSectionTitle';
import type { StatsFiltersState, StatsRange } from '../types';

const RANGE_OPTIONS: { id: StatsRange; label: string }[] = [
    { id: '7d', label: 'last week' },
    { id: '30d', label: 'last month' },
    { id: '90d', label: 'last 3 months' },
    { id: 'all', label: 'all time' },
];

interface Props {
    filters: StatsFiltersState;
    availableGroups: string[];
    onChange: (next: StatsFiltersState) => void;
}

/**
 * MonkeyType account "filters" block: a single-select date-range button row
 * plus a multi-select power-group row. Buttons stretch evenly like on the
 * MonkeyType account page.
 */
export function StatsFilters({ filters, availableGroups, onChange }: Props) {
    const isGroupActive = (group: string): boolean =>
        filters.groups === 'all' || filters.groups.includes(group);

    const toggleGroup = (group: string) => {
        const current: string[] =
            filters.groups === 'all' ? [...availableGroups] : [...filters.groups];
        const next = current.includes(group)
            ? current.filter((g) => g !== group)
            : [...current, group];
        // Selecting everything collapses back to 'all' so new groups
        // are included automatically.
        onChange({
            ...filters,
            groups: next.length === availableGroups.length ? 'all' : next,
        });
    };

    return (
        <div className="text-xs">
            <StatsSectionTitle icon={faFilter} text="filters" />
            <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:justify-evenly [&>button]:w-full">
                {RANGE_OPTIONS.map((option) => (
                    <ToggleButton
                        key={option.id}
                        active={filters.range === option.id}
                        onClick={() => onChange({ ...filters, range: option.id })}
                    >
                        {option.label}
                    </ToggleButton>
                ))}
            </div>

            {availableGroups.length > 1 && (
                <div className="mt-4">
                    <StatsSectionTitle icon={faLayerGroup} text="skill groups" />
                    <div className="flex flex-wrap gap-2 [&>button]:min-w-24">
                        <ToggleButton
                            active={filters.groups === 'all'}
                            onClick={() => onChange({ ...filters, groups: 'all' })}
                        >
                            all
                        </ToggleButton>
                        {availableGroups.map((group) => (
                            <ToggleButton
                                key={group}
                                active={isGroupActive(group)}
                                onClick={() => toggleGroup(group)}
                            >
                                {group.toLowerCase()}
                            </ToggleButton>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
