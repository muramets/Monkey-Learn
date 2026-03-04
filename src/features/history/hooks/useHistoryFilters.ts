import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { startOfWeek, startOfMonth } from 'date-fns';
import { useMetadataStore } from '../../../stores/metadataStore';
import type { TimeFilter, TypeFilter, EffectFilter } from '../components/HistoryFilter';

interface HistoryPageState {
    filterStateId?: string;
    filterInnerfaceId?: string;
    filterTime?: TimeFilter;
}

export function useHistoryFilters() {
    const { states } = useMetadataStore();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    // Time/Type/Effect state
    const [timeFilter, setTimeFilter] = useState<TimeFilter>(() => {
        return (location.state as HistoryPageState)?.filterTime || (searchParams.get('time') as TimeFilter) || 'All time';
    });
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('All types');
    const [effectFilter, setEffectFilter] = useState<EffectFilter>('All effects');

    // URL-derived entity filters
    const selectedProtocolIds = useMemo(() => searchParams.getAll('protocolId'), [searchParams]);
    const selectedInnerfaceIds = useMemo(() => searchParams.getAll('innerfaceId'), [searchParams]);
    const selectedStateIds = useMemo(() => searchParams.getAll('stateId'), [searchParams]);

    const setSelectedProtocolIds = useCallback((ids: string[]) => {
        setSearchParams((prev: URLSearchParams) => {
            const newParams = new URLSearchParams(prev);
            newParams.delete('protocolId');
            ids.forEach(id => newParams.append('protocolId', id));
            return newParams;
        });
    }, [setSearchParams]);

    const setSelectedInnerfaceIds = useCallback((ids: string[]) => {
        setSearchParams((prev: URLSearchParams) => {
            const newParams = new URLSearchParams(prev);
            newParams.delete('innerfaceId');
            ids.forEach(id => newParams.append('innerfaceId', id));
            return newParams;
        });
    }, [setSearchParams]);

    const setSelectedStateIds = useCallback((ids: string[]) => {
        setSearchParams((prev: URLSearchParams) => {
            const newParams = new URLSearchParams(prev);
            newParams.delete('stateId');
            ids.forEach(id => newParams.append('stateId', id));
            return newParams;
        });
    }, [setSearchParams]);

    // Initialize from location state (fallback for navigations not using URL)
    useEffect(() => {
        const state = location.state as HistoryPageState;
        if (state?.filterStateId) {
            const sid = state.filterStateId;
            if (!selectedStateIds.includes(sid)) {
                setSelectedStateIds([sid]);
            }
        }
        if (state?.filterInnerfaceId) {
            const iid = state.filterInnerfaceId;
            if (!selectedInnerfaceIds.includes(iid.toString())) {
                setSelectedInnerfaceIds([iid.toString()]);
            }
        }
    }, [location.state, selectedStateIds, selectedInnerfaceIds, setSelectedStateIds, setSelectedInnerfaceIds]);

    // Derived server-side filters
    const serverFilters = useMemo(() => {
        let timeRange: { start: Date; end: Date } | null = null;
        if (timeFilter !== 'All time') {
            const now = new Date();
            if (timeFilter === 'Today') {
                const start = new Date(now);
                start.setHours(0, 0, 0, 0);
                timeRange = { start, end: now };
            } else if (timeFilter === 'This week') {
                const start = startOfWeek(now, { weekStartsOn: 1 });
                timeRange = { start, end: now };
            } else if (timeFilter === 'This month') {
                const start = startOfMonth(now);
                timeRange = { start, end: now };
            }
        }

        let protocolIdsToFilter: string[] | undefined = undefined;
        if (selectedProtocolIds.length > 0) {
            protocolIdsToFilter = selectedProtocolIds;
        }

        const stateDerivedInnerfaceIds = states
            .filter(s => selectedStateIds.includes(s.id))
            .flatMap(s => s.innerfaceIds || [])
            .map(String);

        const combinedInnerfaceIds = Array.from(new Set([
            ...selectedInnerfaceIds,
            ...stateDerivedInnerfaceIds
        ]));

        return {
            protocolIds: protocolIdsToFilter,
            innerfaceIds: combinedInnerfaceIds.length > 0 ? combinedInnerfaceIds : undefined,
            type: typeFilter,
            timeRange
        };
    }, [timeFilter, typeFilter, selectedProtocolIds, selectedInnerfaceIds, selectedStateIds, states]);

    const hasActiveFilters = searchParams.toString() !== '' ||
        timeFilter !== 'All time' ||
        typeFilter !== 'All types' ||
        effectFilter !== 'All effects';

    const clearFilters = useCallback(() => {
        setTimeFilter('All time');
        setTypeFilter('All types');
        setEffectFilter('All effects');

        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.delete('protocolId');
            newParams.delete('innerfaceId');
            newParams.delete('stateId');
            return newParams;
        });
    }, [setSearchParams]);

    return {
        // Filter state
        timeFilter, setTimeFilter,
        typeFilter, setTypeFilter,
        effectFilter, setEffectFilter,
        // Entity selections
        selectedProtocolIds, setSelectedProtocolIds,
        selectedInnerfaceIds, setSelectedInnerfaceIds,
        selectedStateIds, setSelectedStateIds,
        // Derived
        serverFilters,
        hasActiveFilters,
        clearFilters
    };
}
