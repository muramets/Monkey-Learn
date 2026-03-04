import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useMetadataStore } from '../../stores/metadataStore';
import { useHistoryFeed } from '../../features/history/hooks/useHistoryFeed';
import { useHistoryFilters } from '../../features/history/hooks/useHistoryFilters';
import { useHistoryClientFilter, getDateLabel } from '../../features/history/hooks/useHistoryClientFilter';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { HistoryFilter } from '../../features/history/components/HistoryFilter';
import { Input } from '../../components/ui/molecules/Input';
import { Button } from '../../components/ui/atoms/Button';
import { ActiveFiltersList } from '../../components/ui/molecules/ActiveFiltersList';
import { HistoryEvent } from '../../features/history/components/HistoryEvent';
import { MonkeyTypeLoader } from '../../components/ui/molecules/MonkeyTypeLoader';
import type { HistoryRecord } from '../../types/history';
import { useConditionalSearch } from '../../hooks/useConditionalSearch';

export default function HistoryPage() {
    const { innerfaces, protocols, states, groupsMetadata } = useMetadataStore();

    // Content ref for conditional search
    const contentRef = useRef<HTMLDivElement>(null);
    const { searchQuery, setSearchQuery, shouldShowSearch } = useConditionalSearch(contentRef);

    // Filter state (URL + local)
    const {
        timeFilter, setTimeFilter,
        typeFilter, setTypeFilter,
        effectFilter, setEffectFilter,
        selectedProtocolIds, setSelectedProtocolIds,
        selectedInnerfaceIds, setSelectedInnerfaceIds,
        selectedStateIds, setSelectedStateIds,
        serverFilters,
        hasActiveFilters,
        clearFilters: clearFilterState
    } = useHistoryFilters();

    // Server-side data
    const { history, isLoading, isLoadingMore, hasMore, loadMore, deleteEvent } = useHistoryFeed(serverFilters);

    // Client-side filtering + grouping
    const { filteredHistory, groupedHistory } = useHistoryClientFilter({
        history,
        searchQuery,
        typeFilter,
        effectFilter,
        selectedInnerfaceIds,
        selectedStateIds,
        states
    });

    // Infinite Scroll Observer
    const observerTarget = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
                    loadMore();
                }
            },
            { threshold: 1.0 }
        );

        const currentTarget = observerTarget.current;

        if (currentTarget) {
            observer.observe(currentTarget);
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
    }, [observerTarget, hasMore, isLoadingMore, loadMore]);

    const clearFilters = () => {
        setSearchQuery('');
        clearFilterState();
    };

    const combinedHasActiveFilters = hasActiveFilters || searchQuery.trim() !== '';

    return (
        <div className="flex flex-col gap-8 w-full pb-12">
            {/* Header Mirroring ProtocolsList */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-lexend text-text-primary">history</h1>
                    <p className="text-text-secondary font-mono text-sm mt-1">
                        {history.length} events loaded
                        {hasMore && !isLoading && <span className="opacity-50"> (scroll for more)</span>}
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-0">
                        <HistoryFilter
                            timeFilter={timeFilter}
                            setTimeFilter={setTimeFilter}
                            typeFilter={typeFilter}
                            setTypeFilter={setTypeFilter}
                            effectFilter={effectFilter}
                            setEffectFilter={setEffectFilter}
                            selectedProtocolIds={selectedProtocolIds}
                            setSelectedProtocolIds={setSelectedProtocolIds}
                            selectedInnerfaceIds={selectedInnerfaceIds}
                            setSelectedInnerfaceIds={setSelectedInnerfaceIds}
                            selectedStateIds={selectedStateIds}
                            setSelectedStateIds={setSelectedStateIds}
                            protocols={protocols}
                            innerfaces={innerfaces}
                            states={states}
                            groupsMetadata={groupsMetadata}
                            hasActiveFilters={combinedHasActiveFilters}
                            clearFilters={clearFilters}
                        />
                    </div>

                    {/* Search Bar */}
                    {shouldShowSearch && (
                        <div className="flex-grow md:flex-grow-0 ml-1">
                            <Input
                                icon={faSearch}
                                placeholder="Search timeline..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="md:w-64"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Active Chips Area */}
            <ActiveFiltersList
                className="-mt-4 mb-4"
                filters={[
                    ...(searchQuery ? [{
                        id: 'search',
                        label: `query: ${searchQuery}`,
                        icon: faSearch,
                        color: 'var(--main-color)',
                        onRemove: () => setSearchQuery('')
                    }] : []),
                    ...(timeFilter !== 'All time' ? [{
                        id: 'time',
                        label: timeFilter,
                        icon: undefined,
                        onRemove: () => setTimeFilter('All time')
                    }] : []),
                    ...(typeFilter !== 'All types' ? [{
                        id: 'type',
                        label: typeFilter === 'Actions' ? 'Check-ins' :
                            typeFilter === 'Manual' ? 'Manual Changes' :
                                typeFilter === 'Decay' ? 'Inactivity Decay' :
                                    typeFilter,
                        icon: undefined,
                        onRemove: () => setTypeFilter('All types')
                    }] : []),
                    ...(effectFilter !== 'All effects' ? [{
                        id: 'effect',
                        label: effectFilter,
                        icon: undefined,
                        onRemove: () => setEffectFilter('All effects')
                    }] : []),
                    ...selectedProtocolIds.map(id => ({
                        id: `protocol-${id}`,
                        label: id === 'system-decay' ? 'Inactivity Decay' : (protocols.find(p => p.id.toString() === id)?.title || id),
                        icon: undefined,
                        onRemove: () => setSelectedProtocolIds(selectedProtocolIds.filter((pid: string) => pid !== id))
                    })),
                    ...selectedInnerfaceIds.map(id => ({
                        id: `innerface-${id}`,
                        label: innerfaces.find(i => i.id.toString() === id)?.name || id,
                        icon: undefined,
                        onRemove: () => setSelectedInnerfaceIds(selectedInnerfaceIds.filter((iid: string) => iid !== id))
                    })),
                    ...selectedStateIds.map(id => ({
                        id: `state-${id}`,
                        label: states.find(s => s.id === id)?.name || id,
                        icon: undefined,
                        onRemove: () => setSelectedStateIds(selectedStateIds.filter((sid: string) => sid !== id))
                    }))
                ]}
                onClearAll={combinedHasActiveFilters ? clearFilters : undefined}
            />

            {/* History Feed */}
            {(isLoading && history.length === 0) ? (
                <MonkeyTypeLoader />
            ) : null}

            <div ref={contentRef} className="flex flex-col gap-8" style={isLoading && history.length === 0 ? { display: 'none' } : undefined}>
                {groupedHistory.map(([dateKey, events]) => (
                    <div key={dateKey} className="flex flex-col gap-4">
                        <h2 className="text-text-secondary font-mono text-sm pl-1 flex items-baseline">
                            {getDateLabel(dateKey)}<span className="opacity-50">: {events.length}</span>
                        </h2>
                        <div className="flex flex-col gap-2">
                            <AnimatePresence mode="popLayout">
                                {events.map((event: HistoryRecord) => {
                                    const protocol = protocols.find(p => p.id.toString() === event.protocolId.toString());
                                    return (
                                        <motion.div
                                            key={event.id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{
                                                opacity: 0,
                                                x: -50,
                                                height: 0,
                                                marginBottom: 0,
                                                filter: 'blur(4px)'
                                            }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <HistoryEvent
                                                event={event}
                                                innerfaces={innerfaces}
                                                protocolColor={protocol?.color}
                                                onDelete={deleteEvent}
                                                onFilterInnerface={(id) => setSelectedInnerfaceIds([...selectedInnerfaceIds, id])}
                                                onFilterProtocol={(id) => {
                                                    if (!selectedProtocolIds.includes(id)) {
                                                        setSelectedProtocolIds([...selectedProtocolIds, id]);
                                                    }
                                                }}
                                            />
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </div>
                ))}
            </div>

            {/* Loading Indicator / Sentinel */}
            {hasMore && (
                <div ref={observerTarget} className="flex justify-center py-8">
                    {isLoadingMore ? (
                        <div className="text-sub font-mono animate-pulse text-xs">Loading older events...</div>
                    ) : (
                        <div className="h-4" /> // Invisible trigger
                    )}
                </div>
            )}

            {!hasMore && history.length > 0 && (
                <div className="text-center py-8 text-sub/50 font-mono text-xs">
                    Start of timeline
                </div>
            )}

            {filteredHistory.length === 0 && history.length > 0 && (
                <div className="py-32 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-sub-alt rounded-full flex items-center justify-center mb-8 text-sub/10">
                        <FontAwesomeIcon icon={faSearch} className="text-4xl" />
                    </div>
                    <h3 className="text-xl font-lexend font-bold text-text-secondary mb-3">No matching events</h3>
                    <p className="text-text-secondary font-mono text-sm max-w-sm mb-8">
                        Your filters are too strict. No records were found matching these specific conditions.
                        {hasMore && " Scroll down to load more history."}
                    </p>
                    <Button
                        variant="primary"
                        onClick={clearFilters}
                        className="px-8 py-6 rounded-xl font-mono text-xs font-black uppercase tracking-[0.25em] transition-all hover:shadow-text-primary/20 shadow-xl shadow-main/20"
                    >
                        Reset All Filters
                    </Button>
                </div>
            )}
        </div>
    );
}
