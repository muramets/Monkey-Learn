import React, { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog, faGripVertical } from '@fortawesome/free-solid-svg-icons';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useDndMonitor, type DragOverEvent } from '@dnd-kit/core';
import { SortableItem } from '../../../components/ui/molecules/SortableItem';
import { CollapsibleSection } from '../../../components/ui/molecules/CollapsibleSection';
import { DraggableInnerfaceItem } from './DraggableInnerfaceItem';
import { getGroupConfig } from '../../../constants/common';
import { getIcon } from '../../../config/iconRegistry';
import type { Innerface } from '../types';
import type { PlanningGoal } from '../../planning/types';

const EmptyGroupDropZone = React.memo(({ isDragOver, groupName }: { isDragOver: boolean; groupName: string }) => {
    return (
        <div
            className={`transition-[height,background-color,border-color,margin] duration-300 ease-in-out rounded-xl flex items-center justify-center overflow-hidden ${isDragOver
                ? 'h-[100px] bg-main/5 border-2 border-dashed border-main/30 my-2'
                : 'h-[0px] border-0 border-transparent margin-0'
                }`}
        >
            {isDragOver && (
                <span className="text-main/70 text-sm font-mono animate-pulse">
                    Drop into {groupName}
                </span>
            )}
        </div>
    );
});

export const InnerfaceGroup = React.memo(({
    groupName,
    category,
    innerfaces,
    onEdit,
    onGroupEdit,
    onPlanning,
    goals,
    groupsMetadata,
    isCollapsed,
    onToggleCollapse,
    hideHeader
}: {
    groupName: string;
    category: string;
    innerfaces: Innerface[];
    onEdit: (id: string | number) => void;
    onGroupEdit: (groupName: string) => void;
    onPlanning: (innerface: Innerface) => void;
    goals: Record<string, PlanningGoal>;
    groupsMetadata: Record<string, { icon: string; color?: string }>;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    hideHeader?: boolean;
}) => {
    const staticConfig = getGroupConfig(groupName);
    const storeMeta = groupsMetadata[groupName];

    let icon = staticConfig ? getIcon(staticConfig.icon) : getIcon('circle');
    let color = staticConfig?.color || '#d1d0c5';

    if (storeMeta) {
        if (storeMeta.icon) {
            const mapped = getIcon(storeMeta.icon);
            if (mapped) icon = mapped;
        }
        if (storeMeta.color) color = storeMeta.color;
    }

    const itemIds = useMemo(() => innerfaces.map(i => String(i.id)), [innerfaces]);

    // Monitor drag events to trigger expand animation when hovering over the group header
    const [isDragOver, setIsDragOver] = React.useState(false);

    // Height stabilization: capture height before drag to prevent cursor jump
    const groupRef = React.useRef<HTMLDivElement>(null);
    const [dragHeight, setDragHeight] = React.useState<number | null>(null);

    // --- PREMIUM EMPTY DROP LOGIC ---
    // Problem: Empty groups have 0 height (no items), making them impossible to drop into using standard collision.
    // Solution: We "monitor" the drag operation globally.
    // 1. If an item is being dragged...
    // 2. AND it is hovering over THIS group's Header (which is a SortableItem)...
    // 3. We set `isDragOver` to true.
    // 4. This triggers the `EmptyGroupDropZone` to expand (animate height from 0 to 100px).
    // Result: The user feels like the group "opens up" to accept the item.
    useDndMonitor({
        onDragStart(event) {
            const { active } = event;
            const activeId = String(active.id);

            // If THIS group is being dragged, capture its height before collapse
            if (activeId === `group-${category}-${groupName}` && groupRef.current) {
                const height = groupRef.current.offsetHeight;
                setDragHeight(height);
            }
        },
        onDragOver(event: DragOverEvent) {
            const { active, over } = event;
            if (!over) {
                if (isDragOver) setIsDragOver(false);
                return;
            }

            // Check if dragging an Item (not group/category) AND hovering over THIS group
            const isItemDrag = !active.id.toString().startsWith('category-') && !active.id.toString().startsWith('group-');
            const isOverThisGroup = over.id === `group-${category}-${groupName}`;

            if (isItemDrag && isOverThisGroup) {
                if (!isDragOver) setIsDragOver(true);
            } else {
                if (isDragOver) setIsDragOver(false);
            }
        },
        onDragEnd() {
            setIsDragOver(false);
            setDragHeight(null);
        }
    });

    // Collapsed state logic
    // We already receive isCollapsed from props which is managed by parent (InnerfacesList)

    const content = (
        <SortableContext items={itemIds} strategy={rectSortingStrategy}>
            {innerfaces.length === 0 ? (
                <EmptyGroupDropZone isDragOver={isDragOver} groupName={groupName} />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {innerfaces.map((innerface) => (
                        <DraggableInnerfaceItem
                            key={innerface.id}
                            innerface={innerface}
                            onEdit={onEdit}
                            onPlanning={() => onPlanning(innerface)}
                            hasGoal={Boolean(goals[innerface.id])}
                        />
                    ))}
                    {/* Add invisible drop zone at end of list to catch drops in grid gaps if needed, 
                        or just let the container handle it via useInnerfaceDnD logic */}
                </div>
            )}
        </SortableContext>
    );

    if (hideHeader) {
        return <div className="mb-8">{content}</div>;
    }

    return (
        <SortableItem key={`group-${category}-${groupName}`} id={`group-${category}-${groupName}`}>
            {({ setNodeRef, setActivatorNodeRef, listeners, attributes, style, isDragging }) => (
                <div
                    ref={(node) => {
                        setNodeRef(node);
                        groupRef.current = node;
                    }}
                    style={{
                        ...style,
                        opacity: isDragging ? 0 : 1,
                        transition: isDragging ? 'none' : style.transition,
                        willChange: 'transform',
                        // CRITICAL: Fix height during drag to prevent cursor jump
                        minHeight: dragHeight ? `${dragHeight}px` : undefined
                    }}
                    className={`mb-8 ${isDragging ? 'dragging-item-placeholder' : ''}`}
                >
                    <CollapsibleSection
                        key={groupName}
                        isOpen={!isCollapsed && !isDragging}
                        onToggle={onToggleCollapse}
                        dragHandle={
                            <div
                                ref={setActivatorNodeRef}
                                {...listeners}
                                {...attributes}
                                className="cursor-grab active:cursor-grabbing text-sub hover:text-text-primary active:text-text-primary px-1 -ml-2 opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-[opacity,color] duration-200"
                                title="Drag to reorder group"
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                    listeners?.onPointerDown?.(e);
                                }}
                            >
                                <FontAwesomeIcon icon={faGripVertical} className="text-sm" />
                            </div>
                        }
                        trailing={
                            groupName !== 'ungrouped' && (
                                <button
                                    className="opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity duration-200 text-sub hover:text-text-primary p-2 ml-2"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onGroupEdit(groupName);
                                    }}
                                    title="Group Settings"
                                >
                                    <FontAwesomeIcon icon={faCog} className="text-sm" />
                                </button>
                            )
                        }
                        title={
                            <div className="flex items-center gap-3">
                                {icon && <FontAwesomeIcon icon={icon} style={{ color: color }} className="text-lg opacity-80" />}
                                <span className={groupName === 'ungrouped' ? 'opacity-50' : ''}>{groupName}</span>
                                <span className="text-xs font-mono font-normal opacity-40 bg-sub/20 px-2 py-0.5 rounded-full ml-auto md:ml-0">
                                    {innerfaces.length}
                                </span>
                            </div>
                        }
                        className={``}
                    >
                        {!isDragging && content}
                    </CollapsibleSection>
                </div>
            )}
        </SortableItem>
    );
}, (prev, next) => {
    // 1. Basic props check
    if (prev.groupName !== next.groupName) return false;
    if (prev.category !== next.category) return false;
    if (prev.isCollapsed !== next.isCollapsed) return false;
    if (prev.hideHeader !== next.hideHeader) return false;

    // 2. Metadata check (Reference equality is enough here usually, but keeping shallow check of object is safe)
    if (prev.groupsMetadata !== next.groupsMetadata) {
        // Falling back to deep check only if references differ to avoid unnecessary re-renders
        // on harmless metadata object recreation
        const prevMeta = prev.groupsMetadata[prev.groupName];
        const nextMeta = next.groupsMetadata[next.groupName];
        if (prevMeta?.icon !== nextMeta?.icon) return false;
        if (prevMeta?.color !== nextMeta?.color) return false;
    }

    // 3. Innerfaces & Goals Deep Check (INDUSTRY STANDARD: Reference Equality)
    if (prev.innerfaces.length !== next.innerfaces.length) return false;

    for (let i = 0; i < prev.innerfaces.length; i++) {
        // Checking REFERENCE equality.
        // If the object reference is different, it means the store updated it (immutable update).
        // This automatically covers ALL properties: name, desc, priority, decay, scores, etc.
        if (prev.innerfaces[i] !== next.innerfaces[i]) return false;

        // Sync Goals status
        const pHasGoal = Boolean(prev.goals[prev.innerfaces[i].id]);
        const nHasGoal = Boolean(next.goals[next.innerfaces[i].id]);
        if (pHasGoal !== nHasGoal) return false;
    }

    return true;
});
