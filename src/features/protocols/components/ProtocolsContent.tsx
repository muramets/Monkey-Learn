import { forwardRef } from 'react';
import { DndContext, closestCenter, DragOverlay, type SensorDescriptor, type DragStartEvent, type DragEndEvent, type DragOverEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ProtocolGroup } from './ProtocolGroup';
import { ProtocolsDragOverlay } from './ProtocolsDragOverlay';
import { InteractionContext } from '../context/InteractionContext';
import type { Protocol } from '../types';
import type { Innerface } from '../../innerfaces/types';

interface ProtocolsContentProps {
    groupedProtocols: [string, Protocol[]][];
    innerfaces: Innerface[];
    isDragEnabled: boolean;
    isReadOnly: boolean;
    applyProtocol: (id: string | number, direction: '+' | '-') => void;
    handleEditProtocol: (id: string | number) => void;
    onGroupEdit: (groupName: string) => void;
    groupsMetadata: Record<string, { icon: string; color?: string }>;
    isGroupCollapsed: (groupName: string) => boolean;
    toggleGroup: (groupName: string) => void;
    renderedCount: number;
    // DnD props
    sensors: SensorDescriptor<object>[];
    active: { id: string | null; protocol: Protocol | null; group: string | null };
    handleDragStart: (event: DragStartEvent) => void;
    handleDragOver: (event: DragOverEvent) => void;
    handleDragEnd: (event: DragEndEvent) => void;
    handleDragCancel: () => void;
    interactionValue: {
        justDroppedId: string | null;
        isDragging: boolean;
        clearJustDropped: () => void;
    };
}

/**
 * Компонент контента списка протоколов с DnD
 * 
 * Функциональность:
 * - Drag and Drop для групп и протоколов
 * - Progressive rendering (рендерим по 200 элементов за раз)
 * - Collapsed/expanded состояние групп
 * - Overlay при перетаскивании
 * - Backdrop overlay для блокировки взаимодействия во время drag
 * 
 * DnD логика:
 * - Можно перетаскивать целые группы (меняет порядок групп)
 * - Можно перетаскивать протоколы внутри одной группы
 * - DnD отключается при активном поиске или фильтре
 */
export const ProtocolsContent = forwardRef<HTMLDivElement, ProtocolsContentProps>(function ProtocolsContent({
    groupedProtocols,
    innerfaces,
    isDragEnabled,
    isReadOnly,
    applyProtocol,
    handleEditProtocol,
    onGroupEdit,
    groupsMetadata,
    isGroupCollapsed,
    toggleGroup,
    renderedCount,
    sensors,
    active,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    interactionValue,
}, ref) {
    return (
        <InteractionContext.Provider value={interactionValue}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                {/* Встроенные стили для отключения transitions во время drag */}
                <style>{`
                    .transition-none-important, 
                    .transition-none-important * { 
                        transition: none !important; 
                        animation: none !important;
                    }
                `}</style>

                <div ref={ref} data-no-swipe className="flex flex-col gap-8 pb-20">
                    {/* SortableContext для групп (позволяет менять порядок групп) */}
                    <SortableContext
                        items={groupedProtocols.map(([name]) => `group-${name}`)}
                        strategy={verticalListSortingStrategy}
                        disabled={!isDragEnabled}
                    >
                        {groupedProtocols.map(([groupName, groupProtocols], index) => {
                            // Progressive rendering: не рендерим группы за пределами renderedCount
                            // Используется для больших списков (>200 элементов)
                            if (renderedCount !== undefined && index >= 200 && index > renderedCount)
                                return null;

                            return (
                                <ProtocolGroup
                                    key={groupName}
                                    groupName={groupName}
                                    protocols={groupProtocols}
                                    innerfaces={innerfaces}
                                    isDragEnabled={isDragEnabled}
                                    applyProtocol={applyProtocol}
                                    handleEditProtocol={handleEditProtocol}
                                    onGroupEdit={onGroupEdit}
                                    groupsMetadata={groupsMetadata}
                                    isCollapsed={isGroupCollapsed(groupName)}
                                    onToggleCollapse={() => toggleGroup(groupName)}
                                    isReadOnly={isReadOnly}
                                    hideHeader={groupedProtocols.length === 1 && groupName === 'ungrouped'}
                                />
                            );
                        })}
                    </SortableContext>
                </div>

                {/* Backdrop overlay: блокирует клики во время drag операции */}
                {active.id && <div className="fixed inset-0 z-40 bg-transparent pointer-events-auto" />}

                {/* DragOverlay: показывает preview элемента во время перетаскивания */}
                <DragOverlay dropAnimation={null}>
                    {active.id ? (
                        <div className="pointer-events-none transition-none-important">
                            <ProtocolsDragOverlay
                                activeProtocol={active.protocol}
                                activeGroup={active.group}
                                innerfaces={innerfaces}
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </InteractionContext.Provider>
    );
});
