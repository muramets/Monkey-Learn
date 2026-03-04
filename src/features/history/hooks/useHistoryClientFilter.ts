import { useMemo } from 'react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import type { HistoryRecord } from '../../../types/history';
import type { TypeFilter, EffectFilter } from '../components/HistoryFilter';
import type { StateData } from '../../dashboard/types';

interface UseHistoryClientFilterParams {
    history: HistoryRecord[];
    searchQuery: string;
    typeFilter: TypeFilter;
    effectFilter: EffectFilter;
    selectedInnerfaceIds: string[];
    selectedStateIds: string[];
    states: StateData[];
}

export function getDateLabel(dateStr: string): string {
    const date = parseISO(dateStr + 'T00:00:00');
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
}

export function useHistoryClientFilter({
    history,
    searchQuery,
    typeFilter,
    effectFilter,
    selectedInnerfaceIds,
    selectedStateIds,
    states
}: UseHistoryClientFilterParams) {
    const filteredHistory = useMemo(() => {
        return history.filter(event => {
            // Search filter (Client Side)
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    event.protocolName.toLowerCase().includes(query) ||
                    Object.keys(event.changes).some(id => id.toString().toLowerCase().includes(query));
                if (!matchesSearch) return false;
            }

            // Type filter (re-applied client-side as safety fallback)
            if (typeFilter !== 'All types') {
                if (typeFilter === 'Actions' && event.type !== 'protocol') return false;
                if (typeFilter === 'Manual' && event.type !== 'manual_adjustment') return false;
                if (typeFilter === 'System' && event.type !== 'system') return false;
                if (typeFilter === 'Decay' && event.type !== 'decay') return false;
            }

            // Effect filter (Client Side Only)
            if (effectFilter !== 'All effects') {
                const isPositive = event.weight > 0;

                if (effectFilter === 'Positive') {
                    if (!isPositive) return false;
                }

                if (effectFilter === 'Negative') {
                    if (event.type === 'system') return false;
                    if (event.weight >= 0) return false;
                }
            }

            // Innerface filter (Client Side Only)
            if (selectedInnerfaceIds.length > 0) {
                const eventInnerfaces = Object.keys(event.changes || {});
                const hasMatchingInnerface = selectedInnerfaceIds.some((id: string) => eventInnerfaces.includes(id));
                if (!hasMatchingInnerface) return false;
            }

            // State filter (Client Side Logic)
            if (selectedStateIds.length > 0) {
                const relatedStates = states.filter(s => selectedStateIds.includes(s.id));
                const validInnerfaceIds = relatedStates.flatMap(s => s.innerfaceIds || []).map(String);

                const eventInnerfaces = Object.keys(event.changes || {});
                const matchesInnerface = eventInnerfaces.some(id => validInnerfaceIds.includes(id));

                if (!matchesInnerface) return false;
            }

            return true;
        });
    }, [history, searchQuery, typeFilter, effectFilter, selectedInnerfaceIds, selectedStateIds, states]);

    const groupedHistory = useMemo(() => {
        const groups: Record<string, typeof filteredHistory> = {};

        filteredHistory.forEach(event => {
            const date = parseISO(event.timestamp);
            const dateKey = format(date, 'yyyy-MM-dd');

            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(event);
        });

        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [filteredHistory]);

    return { filteredHistory, groupedHistory };
}
