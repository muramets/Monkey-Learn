import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useScoreContext } from '../../../contexts/ScoreContext';
import { InnerfaceSettingsModal } from '../modals/InnerfaceSettingsModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faChevronDown, faGripVertical, faSearch } from '@fortawesome/free-solid-svg-icons';
import { GroupSettingsModal } from '../../../features/groups/components/GroupSettingsModal';
import { PlanningModal } from '../../planning/components/PlanningModal';
import { usePlanningStore } from '../../../stores/planningStore';
import { Input } from '../../../components/ui/molecules/Input';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../../../components/ui/atoms/Tooltip';
import { InnerfacesFilterDropdown } from './InnerfacesFilterDropdown';
import { useTooltipSuppression } from '../../../hooks/useTooltipSuppression';
import {
    DndContext,
    closestCorners,
    closestCenter,
    pointerWithin,
    DragOverlay,
    type DragStartEvent,
    type DragEndEvent,
    type CollisionDetection
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useMetadataStore } from '../../../stores/metadataStore';
import { usePersonalityStore } from '../../../stores/personalityStore';
import { SortableItem } from '../../../components/ui/molecules/SortableItem';
import { useCollapsedGroups } from '../../../hooks/useCollapsedGroups';
import { InnerfaceGroup } from './InnerfaceGroup';
import { InnerfacesDragOverlay } from './InnerfacesDragOverlay';
import { useInnerfaceDnD } from '../hooks/useInnerfaceDnD';
import { CATEGORY_CONFIG } from '../constants';
import type { Innerface } from '../types';
import { useConditionalSearch } from '../../../hooks/useConditionalSearch';

// --- Category Section Header ---
const CategorySection = React.memo(({
    category,
    children,
    count,
    isCollapsed,
    onToggle,
    isAnyCategoryDragging
}: {
    category: 'skill' | 'foundation' | 'uncategorized';
    children: React.ReactNode;
    count: number;
    isCollapsed: boolean;
    onToggle: () => void;
    isAnyCategoryDragging: boolean;
}) => {
    if (count === 0) return null;

    const config = CATEGORY_CONFIG[category];
    const Icon = config.icon;

    return (
        <SortableItem id={`category-${category}`}>
            {({ setNodeRef, setActivatorNodeRef, listeners, attributes, style, isDragging }) => (
                <div
                    ref={setNodeRef}
                    style={{
                        ...style,
                        opacity: isDragging ? 0 : 1,
                        transition: isDragging ? 'none' : style.transition,
                        willChange: 'transform'
                    }}
                    className={`w-full mb-4 ${isDragging ? 'dragging-instant-collapse' : ''}`}
                >
                    {/* Category Header */}
                    <div className="flex items-center mb-4 group/category">
                        <div className="flex-grow flex items-center justify-between">
                            <button
                                onClick={onToggle}
                                className="flex items-center gap-3 text-2xl font-bold lowercase transition-colors duration-200 outline-none text-sub opacity-30 hover:opacity-100 hover:text-text-primary"
                                aria-expanded={!isCollapsed}
                            >
                                <div className={`transition-transform duration-200 ${!isCollapsed ? '' : '-rotate-90'}`}>
                                    <FontAwesomeIcon icon={faChevronDown} className="text-xl" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <Icon className={`w-6 h-6 transition-colors duration-200 ${config.hoverColor}`} />
                                    <span>{config.label}</span>
                                    <span className="text-xs font-mono font-normal opacity-40 bg-sub/20 px-2 py-0.5 rounded-full">
                                        {count}
                                    </span>
                                </div>
                            </button>

                            {/* Drag Handle */}
                            <div
                                ref={setActivatorNodeRef}
                                {...listeners}
                                {...attributes}
                                className="opacity-0 group-hover/category:opacity-50 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-2"
                            >
                                <FontAwesomeIcon icon={faGripVertical} className="text-sm text-sub" />
                            </div>
                        </div>
                    </div>

                    {/* Category Content */}
                    {/* Hide content completely if THIS category is dragging */}
                    {/* Disable pointer events on content if ANY category is dragging (to allow drop on header) */}
                    {!isDragging && (
                        <div
                            className={`overflow-hidden transition-[opacity,max-height] duration-300 ease-in-out ${isAnyCategoryDragging ? 'pointer-events-none' : ''
                                } ${!isCollapsed
                                    ? 'max-h-[5000px]'
                                    : 'opacity-0 max-h-0'
                                }`}
                        >
                            <div className="py-1">
                                {children}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </SortableItem>
    );
});

export function InnerfacesList() {
    const { innerfaces: allInnerfaces, isLoading } = useScoreContext();
    const innerfaces = useMemo(() => allInnerfaces.filter(i => !i.deletedAt), [allInnerfaces]);
    const activeContext = usePersonalityStore(s => s.activeContext);

    // Optimize store subscriptions to avoid re-renders on unrelated changes (like hasPendingWrites)
    const reorderInnerfaceGroups = useMetadataStore(s => s.reorderInnerfaceGroups);
    const reorderCategories = useMetadataStore(s => s.reorderCategories);
    const moveInnerface = useMetadataStore(s => s.moveInnerface);
    const groupsMetadata = useMetadataStore(s => s.groupsMetadata);
    const innerfaceGroupOrder = useMetadataStore(s => s.innerfaceGroupOrder);
    const categoryOrder = useMetadataStore(s => s.categoryOrder);

    const { isGroupCollapsed, toggleGroup } = useCollapsedGroups('innerfaces');
    const goals = usePlanningStore(state => state.goals);
    const { isGroupCollapsed: isCategoryCollapsed, toggleGroup: toggleCategory } = useCollapsedGroups('innerface-categories');
    const isCoachMode = activeContext?.type === 'viewer';

    // Filter state
    const [activeFilters, setActiveFilters] = useState<string[]>([]);

    const toggleFilter = useCallback((filter: string) => {
        if (filter === 'all') {
            setActiveFilters([]);
        } else {
            setActiveFilters(prev =>
                prev.includes(filter)
                    ? prev.filter(f => f !== filter)
                    : [...prev, filter]
            );
        }
    }, []);

    // Extract unique groups and check for ungrouped
    const { innerfaceGroups, hasUngrouped } = useMemo(() => {
        const groups = new Set<string>();
        let ungrouped = false;
        innerfaces.forEach(i => {
            if (i.group) {
                groups.add(i.group);
            } else {
                ungrouped = true;
            }
        });
        return {
            innerfaceGroups: Array.from(groups).sort(),
            hasUngrouped: ungrouped
        };
    }, [innerfaces]);

    // Content ref for conditional search
    const contentRef = useRef<HTMLDivElement>(null);
    const { searchQuery, setSearchQuery, shouldShowSearch } = useConditionalSearch(contentRef);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedInnerfaceId, setSelectedInnerfaceId] = useState<string | number | null>(null);
    const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [localOpen, setLocalOpen] = useState(false);

    // Planning Modal State
    const [isPlanningOpen, setIsPlanningOpen] = useState(false);
    const [planningInnerface, setPlanningInnerface] = useState<Innerface | null>(null);

    const suppressTooltip = useTooltipSuppression(isModalOpen || isPlanningOpen);

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
    }, []);

    const handleCreate = useCallback(() => {
        setIsModalOpen(true);
        setSelectedInnerfaceId(null);
    }, []);

    const handleEdit = useCallback((id: string | number) => {
        setSelectedInnerfaceId(id);
        setIsModalOpen(true);
    }, []);

    const handleGroupEdit = useCallback((groupName: string) => {
        setSelectedGroup(groupName);
        setIsGroupSettingsOpen(true);
    }, []);

    const handlePlanning = useCallback((innerface: Innerface) => {
        setPlanningInnerface(innerface);
        setIsPlanningOpen(true);
    }, []);

    // Filter innerfaces by search query
    const filteredInnerfaces = useMemo(() => {
        if (!searchQuery.trim()) return innerfaces;
        const query = searchQuery.toLowerCase();
        return innerfaces.filter(innerface =>
            innerface.name.toLowerCase().includes(query)
        );
    }, [innerfaces, searchQuery]);

    // Filter by groups
    const filteredByGroup = useMemo(() => {
        if (activeFilters.length === 0) return filteredInnerfaces;

        return filteredInnerfaces.filter(innerface => {
            if (activeFilters.includes('ungrouped') && !innerface.group) return true;
            if (innerface.group && activeFilters.includes(innerface.group)) return true;
            return false;
        });
    }, [filteredInnerfaces, activeFilters]);

    // --- Height Stabilization during Drag ---
    const [dragMinHeight, setDragMinHeight] = useState<number | null>(null);

    const dnd = useInnerfaceDnD({
        innerfaces: filteredByGroup,
        groupOrder: innerfaceGroupOrder,
        categoryOrder,
        onReorderCategories: reorderCategories,
        onReorderGroups: reorderInnerfaceGroups,
        onMoveInnerface: moveInnerface
    });

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const activeId = String(event.active.id);

        // Only fix height when dragging items/groups, NOT categories (as they collapse)
        if (contentRef.current && !activeId.startsWith('category-')) {
            const height = contentRef.current.offsetHeight;
            setDragMinHeight(height);
            contentRef.current.style.minHeight = `${height}px`;
        }
        dnd.handleDragStart(event);
    }, [dnd]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        dnd.handleDragEnd(event);
        setDragMinHeight(null);
        if (contentRef.current) {
            contentRef.current.style.minHeight = '';
        }
    }, [dnd]);

    const {
        sensors,
        activeId,
        activeItem,
        activeGroup,
        activeCategory,
        isValidDrop,
        handleDragOver,
        innerfacesByCategory,
        getGroupsForCategory,
        categoryIds,
        activeCategoryOrder
    } = dnd;

    // --- COLLISION STRATEGY (Business Logic) ---
    // We use a multi-strategy approach to ensure premium feel and robustness:
    // 1. Categories: Use 'closestCorners' but filtered to ONLY other categories. 
    //    This prevents categories from "jumping" into groups or items.
    // 2. Groups: Use 'closestCenter' filtered to same-category groups.
    //    This makes reordering more predictable and intuitive.
    // 3. Items: Use 'pointerWithin' (cursor position) to detect interactions.
    //    This is CRITICAL for "Empty Group" drops, where the group header is a small target.
    //    If we used bounding boxes, the large dragged item would obscure the header.
    const collisionDetectionStrategy: CollisionDetection = useCallback(
        (args) => {
            const { active, droppableContainers } = args;

            // 1. Category Drag: Isolation Mode
            if (active.id.toString().startsWith('category-')) {
                const categoryContainers = droppableContainers.filter((container) =>
                    container.id.toString().startsWith('category-')
                );
                return closestCorners({
                    ...args,
                    droppableContainers: categoryContainers
                });
            }

            // 2. Group Drag: Same-Category Center-Based Mode
            // This makes group reordering more predictable:
            // - Only detect collisions with groups in the same category
            // - Use center-based detection (more intuitive than corners)
            if (active.id.toString().startsWith('group-')) {
                const activeIdStr = active.id.toString();
                const activeParts = activeIdStr.split('-');
                const activeCategory = activeParts[1]; // Extract category from 'group-{category}-{name}'

                // Filter to only groups in the same category
                const sameCategoryGroups = droppableContainers.filter((container) => {
                    const containerId = container.id.toString();
                    if (!containerId.startsWith('group-')) return false;
                    const containerParts = containerId.split('-');
                    const containerCategory = containerParts[1];
                    return containerCategory === activeCategory;
                });

                return closestCenter({
                    ...args,
                    droppableContainers: sameCategoryGroups
                });
            }

            // 3. Item Drag: Cursor Priority Mode
            // Prioritize what's directly under the mouse cursor. 
            // This ensures we can drop into an empty group by hovering its header,
            // even if the dragged card visually covers multiple other elements.
            const pointerCollisions = pointerWithin(args);
            if (pointerCollisions.length > 0) {
                return pointerCollisions;
            }

            // 4. Fallback: Standard Distance Mode
            // If cursor is in empty space (rare), fall back to closest droppable.
            return closestCorners(args);
        },
        []
    );

    if (isLoading) {
        return <div className="text-center text-sub dark:text-gray-400 py-10">Loading skills...</div>;
    }

    return (
        <TooltipProvider delayDuration={1000}>
            <div className="flex flex-col gap-6 w-full">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-lexend text-text-primary">Skills</h1>
                        <p className="text-text-secondary font-mono text-sm mt-1">
                            Track skills and foundations you're developing
                        </p>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        {!isCoachMode && (
                            <div className={`flex items-center gap-0 transition-opacity duration-200 ${activeId ? 'pointer-events-none opacity-50' : ''}`}>
                                <Tooltip
                                    open={isModalOpen || suppressTooltip ? false : localOpen}
                                    onOpenChange={setLocalOpen}
                                >
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => {
                                                setLocalOpen(false);
                                                handleCreate();
                                            }}
                                            className="h-[46px] w-[36px] flex items-center justify-center rounded-lg text-sub hover:text-main transition-colors cursor-pointer"
                                        >
                                            <FontAwesomeIcon icon={faPlus} className="text-xl" />
                                        </button>
                                    </TooltipTrigger>
                                    {!isModalOpen && (
                                        <TooltipContent side="top">
                                            <span className="font-mono text-xs">Add skill</span>
                                        </TooltipContent>
                                    )}
                                </Tooltip>

                                {innerfaces.length > 0 && (
                                    <InnerfacesFilterDropdown
                                        activeFilters={activeFilters}
                                        innerfaceGroups={innerfaceGroups}
                                        groupsMetadata={groupsMetadata}
                                        hasUngrouped={hasUngrouped}
                                        onToggleFilter={toggleFilter}
                                    />
                                )}
                            </div>
                        )}

                        {shouldShowSearch && (
                            <div className="flex-grow md:flex-grow-0 ml-1">
                                <Input
                                    icon={faSearch}
                                    placeholder="Search skills..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="md:w-64"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <style>{`
                /* 
                   PERFORMANCE & SAFETY OPTIMIZATION:
                   During a drag operation, we disable CSS transitions/animations globally to prevent 
                   layout thrashing and implementation bugs where items fight for position.
                */
                .drag-active-global,
                .drag-active-global * {
                    transition: none !important;
                    animation: none !important;
                }
                
                /* 
                   INTERACTION SAFETY:
                   Disable pointer events on interactive elements during drag to prevent:
                   1. Tooltips from popping up distractingly.
                   2. Accidental clicks on buttons while dropping.
                   3. Hover states flickering.
                */
                .drag-active-global button,
                .drag-active-global a,
                .drag-active-global [role="button"] {
                    pointer-events: none !important;
                }

                /* 
                   VISUAL CLEANUP:
                   The original item (not the drag overlay) should be hidden but occupy space (visibility: hidden).
                   Opacity 0 alone might still allow interactions or border rendering artifacts.
                */
                .dragging-item-placeholder {
                    opacity: 0 !important;
                    visibility: hidden !important;
                }
            `}</style>

                {filteredByGroup.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {innerfaces.length === 0 ? (
                            <button
                                onClick={handleCreate}
                                className="w-full min-h-[120px] border border-dashed border-sub/30 hover:border-sub rounded-xl flex flex-col items-center justify-center gap-3 text-sub hover:text-text-primary transition-colors duration-200 group bg-sub-alt/5 hover:bg-sub-alt/10 py-6"
                            >
                                <FontAwesomeIcon icon={faPlus} className="text-2xl" />
                                <span className="font-mono text-xs">Add your first skill</span>
                            </button>
                        ) : (
                            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                                <span className="font-mono text-sm text-sub">No skills matching your filter</span>
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
                    <DndContext
                        sensors={sensors}
                        collisionDetection={collisionDetectionStrategy}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                    >
                        <div
                            ref={contentRef}
                            data-no-swipe
                            className={`flex flex-col gap-4 ${activeId ? 'drag-active-global' : ''}`}
                            style={{ minHeight: dragMinHeight ? `${dragMinHeight}px` : undefined }}
                        >
                            {/* Special case: Only Uncategorized exists -> Show groups directly */}
                            {innerfacesByCategory.skill.length === 0 && innerfacesByCategory.foundation.length === 0 && innerfacesByCategory.uncategorized.length > 0 ? (
                                (() => {
                                    const uncategorizedGroups = getGroupsForCategory('uncategorized');
                                    const hideHeader = uncategorizedGroups.length === 1 && uncategorizedGroups[0][0] === 'ungrouped';

                                    return (
                                        <SortableContext items={uncategorizedGroups.map(([g]) => `group-uncategorized-${g}`)} strategy={verticalListSortingStrategy}>
                                            {uncategorizedGroups.map(([groupName, groupItems]) => (
                                                <InnerfaceGroup
                                                    key={groupName}
                                                    groupName={groupName}
                                                    category="uncategorized"
                                                    innerfaces={groupItems}
                                                    onEdit={handleEdit}
                                                    onGroupEdit={handleGroupEdit}
                                                    onPlanning={handlePlanning}
                                                    goals={goals}
                                                    groupsMetadata={groupsMetadata}
                                                    isCollapsed={isGroupCollapsed(groupName)}
                                                    onToggleCollapse={() => toggleGroup(groupName)}
                                                    hideHeader={hideHeader && groupName === 'ungrouped'}
                                                />
                                            ))}
                                        </SortableContext>
                                    );
                                })()
                            ) : (
                                /* Standard View: Categories -> Groups -> Items */
                                <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
                                    {activeCategoryOrder.map(category => {
                                        const items = innerfacesByCategory[category];
                                        const groups = getGroupsForCategory(category);
                                        const hideHeader = groups.length === 1 && groups[0][0] === 'ungrouped';
                                        const isAnyCategoryDragging = activeId ? String(activeId).startsWith('category-') : false;

                                        return (
                                            <CategorySection
                                                key={category}
                                                category={category as 'skill' | 'foundation' | 'uncategorized'}
                                                count={items.length}
                                                isCollapsed={isCategoryCollapsed(category)}
                                                onToggle={() => toggleCategory(category)}
                                                isAnyCategoryDragging={isAnyCategoryDragging}
                                            >
                                                <SortableContext items={groups.map(([g]) => `group-${category}-${g}`)} strategy={verticalListSortingStrategy}>
                                                    {groups.map(([groupName, groupItems]) => (
                                                        <InnerfaceGroup
                                                            key={groupName}
                                                            groupName={groupName}
                                                            category={category}
                                                            innerfaces={groupItems}
                                                            onEdit={handleEdit}
                                                            onGroupEdit={handleGroupEdit}
                                                            onPlanning={handlePlanning}
                                                            goals={goals}
                                                            groupsMetadata={groupsMetadata}
                                                            isCollapsed={isGroupCollapsed(groupName)}
                                                            onToggleCollapse={() => toggleGroup(groupName)}
                                                            hideHeader={hideHeader && groupName === 'ungrouped'}
                                                        />
                                                    ))}
                                                </SortableContext>
                                            </CategorySection>
                                        );
                                    })}
                                </SortableContext>
                            )}
                        </div>
                        <DragOverlay dropAnimation={null}>
                            {activeId ? (
                                <div className="pointer-events-none transition-none-important">
                                    <InnerfacesDragOverlay
                                        innerface={activeItem}
                                        groupName={activeGroup}
                                        categoryName={activeCategory}
                                        goals={goals}
                                        groupsMetadata={groupsMetadata}
                                        isValidDrop={isValidDrop}
                                    />
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}

                {isModalOpen && (
                    <InnerfaceSettingsModal
                        isOpen={isModalOpen}
                        onClose={handleCloseModal}
                        innerfaceId={selectedInnerfaceId}
                    />
                )}

                {isGroupSettingsOpen && selectedGroup && (
                    <GroupSettingsModal
                        isOpen={isGroupSettingsOpen}
                        onClose={() => setIsGroupSettingsOpen(false)}
                        groupName={selectedGroup}
                    />
                )}

                {isPlanningOpen && planningInnerface && (
                    <PlanningModal
                        isOpen={isPlanningOpen}
                        onClose={() => setIsPlanningOpen(false)}
                        innerface={planningInnerface}
                    />
                )}
            </div>
        </TooltipProvider>
    );
}
