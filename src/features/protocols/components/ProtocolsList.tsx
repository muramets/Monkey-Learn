import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Innerface } from '../../innerfaces/types';
import { MonkeyTypeLoader } from '../../../components/ui/molecules/MonkeyTypeLoader';
import { getIcon } from '../../../config/iconRegistry';
import { ProtocolSettingsModal } from '../modals/ProtocolSettingsModal';
import { useScoreContext } from '../../../contexts/ScoreContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { GroupSettingsModal } from '../../../features/groups/components/GroupSettingsModal';
import { ActiveFiltersList } from '../../../components/ui/molecules/ActiveFiltersList';
import { getGroupConfig } from '../../../constants/common';
import { useMetadataStore } from '../../../stores/metadataStore';
import { usePersonalityStore } from '../../../stores/personalityStore';
import { useCollapsedGroups } from '../../../hooks/useCollapsedGroups';
import { useProtocolDnD } from '../hooks/useProtocolDnD';
// New refactored hooks
import { useProtocolsFiltering } from '../hooks/useProtocolsFiltering';
import { useProtocolsGrouping } from '../hooks/useProtocolsGrouping';
import { useConditionalSearch } from '../../../hooks/useConditionalSearch';
// New refactored components
import { ProtocolsToolbar } from './ProtocolsToolbar';
import { ProtocolsContent } from './ProtocolsContent';

export function ProtocolsList() {
    const { applyProtocol, innerfaces, protocols } = useScoreContext();
    const { activeContext } = usePersonalityStore();
    const { reorderProtocols, moveProtocol, reorderGroups, protocolGroupOrder, groupsMetadata, isLoading } = useMetadataStore();

    // Simplified loading logic: Minimum 500ms display time
    // Simplified loading logic: Minimum 500ms display time ONLY if loading is actually needed
    const [minTimeMet, setMinTimeMet] = useState(!isLoading);
    useEffect(() => {
        if (!minTimeMet) {
            const timer = setTimeout(() => setMinTimeMet(true), 500);
            return () => clearTimeout(timer);
        }
    }, [minTimeMet]);

    const isReady = minTimeMet && !isLoading;

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProtocolId, setSelectedProtocolId] = useState<string | number | null>(null);

    // Group Settings State
    const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<string>('');

    // Collapsed Groups Persistence
    const { isGroupCollapsed, toggleGroup } = useCollapsedGroups('protocols-collapsed-groups', false);

    // Content ref for conditional search
    const contentRef = useRef<HTMLDivElement>(null);
    const { shouldShowSearch } = useConditionalSearch(contentRef);

    // 1. Data Processing - Create innerface lookup map
    const innerfaceMap = useMemo(() => {
        const map = new Map<string, Innerface>();
        innerfaces.forEach((i: Innerface) => map.set(i.id.toString(), i));
        return map;
    }, [innerfaces]);

    // 2. Use filtering hook (handles search + filters)
    // Memoize the filtered protocols list to prevent infinite re-renders
    const activeProtocols = useMemo(() => protocols.filter(p => !p.deletedAt), [protocols]);

    const {
        searchQuery,
        setSearchQuery,
        activeFilters,
        toggleFilter,
        removeFilter,
        filteredProtocols,
    } = useProtocolsFiltering(activeProtocols, innerfaceMap);

    // 3. Use grouping hook (handles grouping + sorting)
    const { groupedProtocols, protocolGroups } = useProtocolsGrouping(
        filteredProtocols,
        protocolGroupOrder
    );

    const isDragEnabled = !searchQuery.trim() && (activeFilters.length === 0 || activeFilters.length === 1 && activeFilters[0] === 'ungrouped');
    const isReadOnly = activeContext?.type === 'role' || activeContext?.type === 'viewer';

    const [renderedCount, setRenderedCount] = useState(20);
    const [prevFilteredProtocols, setPrevFilteredProtocols] = useState(filteredProtocols);

    if (filteredProtocols !== prevFilteredProtocols) {
        setPrevFilteredProtocols(filteredProtocols);
        setRenderedCount(20);
    }

    useEffect(() => {
        if (renderedCount < filteredProtocols.length) {
            const timer = setTimeout(() => setRenderedCount(prev => Math.min(prev + 200, filteredProtocols.length)), 0);
            return () => clearTimeout(timer);
        }
    }, [renderedCount, filteredProtocols.length]);

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
    }, []);

    const handleEditProtocol = useCallback((id: string | number) => {
        setSelectedProtocolId(id);
        setIsModalOpen(true);
    }, []);

    const handleGroupEdit = useCallback((groupName: string) => {
        setSelectedGroup(groupName);
        setIsGroupSettingsOpen(true);
    }, []);

    const onReorderGroups = useCallback((newOrder: string[]) => {
        reorderGroups(newOrder);
    }, [reorderGroups]);

    const onReorderProtocols = useCallback((newItemIds: string[]) => {
        reorderProtocols(newItemIds);
    }, [reorderProtocols]);

    const onMoveProtocol = useCallback((id: string, newGroup: string, orderedIds: string[]) => {
        moveProtocol(id, newGroup, orderedIds);
    }, [moveProtocol]);

    // Note: protocolGroups now comes from useProtocolsGrouping hook
    // Note: toggleFilter and removeFilter now come from useProtocolsFiltering hook

    const {
        sensors,
        active,
        justDroppedId,
        clearJustDropped,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        optimisticGroupedProtocols
    } = useProtocolDnD({
        groupedProtocols,
        onReorderGroups,
        onReorderProtocols,
        onMoveProtocol
    });

    const interactionValue = useMemo(() => ({
        justDroppedId,
        isDragging: !!active.id,
        clearJustDropped
    }), [justDroppedId, active.id, clearJustDropped]);

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-lexend text-text-primary">Actions</h1>
                        <p className="text-text-secondary font-mono text-sm mt-1">
                            Complete actions and watch your powers grow
                        </p>
                    </div>

                    {/* Toolbar: Add button, Filter dropdown, Search */}
                    <ProtocolsToolbar
                        onAddProtocol={() => {
                            setSelectedProtocolId(null);
                            setIsModalOpen(true);
                        }}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        activeFilters={activeFilters}
                        protocolGroups={protocolGroups as string[]}
                        groupsMetadata={groupsMetadata}
                        onToggleFilter={toggleFilter}
                        shouldShowSearch={shouldShowSearch}
                        isModalOpen={isModalOpen}
                        hasUngrouped={protocols.some(p => !p.group)}
                        hasProtocols={protocols.length > 0}
                    />
                </div>

                <ActiveFiltersList
                    label="filtering by:"
                    filters={activeFilters.map(filter => ({
                        id: filter,
                        label: filter,
                        icon: getIcon(groupsMetadata[filter]?.icon || getGroupConfig(filter)?.icon || 'layer-group'),
                        color: groupsMetadata[filter]?.color || getGroupConfig(filter)?.color,
                        onRemove: () => removeFilter(filter)
                    }))}
                    onClearAll={() => toggleFilter('all')}
                />
            </div>

            {(!isReady) ? (
                <MonkeyTypeLoader />
            ) : filteredProtocols.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {protocols.length === 0 ? (
                        <button
                            onClick={() => { setSelectedProtocolId(null); setIsModalOpen(true); }}
                            className="w-full min-h-[72px] border border-dashed border-sub/30 hover:border-sub rounded-xl flex flex-col items-center justify-center gap-3 text-sub hover:text-text-primary transition-all duration-200 group bg-sub-alt/5 hover:bg-sub-alt/10 py-6"
                        >
                            <FontAwesomeIcon icon={faPlus} className="text-2xl" />
                            <span className="font-mono text-xs">Add your first action</span>
                        </button>
                    ) : (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                            <span className="font-mono text-sm text-sub">No actions matching your filter</span>
                            <button
                                onClick={() => toggleFilter('all')}
                                className="mt-3 font-mono text-xs text-main hover:text-text-primary transition-colors"
                            >
                                Clear filters
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* Protocols content with DnD */}
                    <ProtocolsContent
                        ref={contentRef}
                        groupedProtocols={optimisticGroupedProtocols}
                        innerfaces={innerfaces}
                        isDragEnabled={isDragEnabled}
                        isReadOnly={isReadOnly}
                        applyProtocol={applyProtocol}
                        handleEditProtocol={handleEditProtocol}
                        onGroupEdit={handleGroupEdit}
                        groupsMetadata={groupsMetadata}
                        isGroupCollapsed={isGroupCollapsed}
                        toggleGroup={toggleGroup}
                        renderedCount={renderedCount}
                        sensors={sensors}
                        active={active}
                        handleDragStart={handleDragStart}
                        handleDragOver={handleDragOver}
                        handleDragEnd={handleDragEnd}
                        interactionValue={interactionValue}
                    />
                </>
            )}

            {isModalOpen && (
                <ProtocolSettingsModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    protocolId={selectedProtocolId}
                />
            )}

            {isGroupSettingsOpen && selectedGroup && (
                <GroupSettingsModal
                    isOpen={isGroupSettingsOpen}
                    onClose={() => setIsGroupSettingsOpen(false)}
                    groupName={selectedGroup}
                />
            )}
        </div>
    );
}
