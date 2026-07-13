import React, { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog, faGripVertical } from '@fortawesome/free-solid-svg-icons';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '../../../components/ui/molecules/SortableItem';
import { CollapsibleSection } from '../../../components/ui/molecules/CollapsibleSection';
import { DraggableProtocolItem } from './DraggableProtocolItem';
import { getGroupConfig } from '../../../constants/common';
import { getIcon } from '../../../config/iconRegistry';
import type { Protocol } from '../types';
import type { Innerface } from '../../innerfaces/types';
import { resolveEntityColor } from '../../../utils/entityColor';

export const ProtocolGroup = React.memo(({
    groupName,
    protocols,
    innerfaces,
    isDragEnabled,
    applyProtocol,
    handleEditProtocol,
    onGroupEdit,
    groupsMetadata,
    isCollapsed,
    onToggleCollapse,
    isReadOnly,
    hideHeader
}: {
    groupName: string;
    protocols: Protocol[];
    innerfaces: Innerface[];
    isDragEnabled: boolean;
    applyProtocol: (id: string | number, direction: '+' | '-') => void;
    handleEditProtocol: (id: string | number) => void;
    onGroupEdit: (groupName: string) => void;
    groupsMetadata: Record<string, { icon: string; color?: string }>;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    isReadOnly: boolean;
    hideHeader?: boolean;
}) => {
    const staticConfig = getGroupConfig(groupName);
    const storeMeta = groupsMetadata[groupName];

    let icon = staticConfig ? getIcon(staticConfig.icon) : getIcon('circle');
    let color = staticConfig?.color || 'var(--text-color)';

    if (storeMeta) {
        if (storeMeta.icon) {
            const mapped = getIcon(storeMeta.icon);
            if (mapped) icon = mapped;
        }
        if (storeMeta.color) color = storeMeta.color;
    }

    color = resolveEntityColor(color);

    // Memoize the items list creation
    const itemsIds = useMemo(() => protocols.map(p => String(p.id)), [protocols]);

    const content = (
        <SortableContext
            items={itemsIds}
            strategy={rectSortingStrategy}
            disabled={!isDragEnabled}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {protocols.map((protocol) => (
                    <DraggableProtocolItem
                        key={protocol.id}
                        protocol={protocol}
                        innerfaces={innerfaces}
                        applyProtocol={applyProtocol}
                        handleEditProtocol={handleEditProtocol}
                        isDragEnabled={isDragEnabled}
                        isReadOnly={isReadOnly}
                    />
                ))}
            </div>
        </SortableContext>
    );

    if (hideHeader) {
        return <div className="mb-4">{content}</div>;
    }

    return (
        <SortableItem key={`group-${groupName}`} id={`group-${groupName}`} disabled={!isDragEnabled}>
            {({ setNodeRef, setActivatorNodeRef, listeners, attributes, style, isDragging }) => (
                <div
                    ref={setNodeRef}
                    style={{
                        ...style,
                        opacity: isDragging ? 0 : 1,
                        willChange: 'transform' // Hardware acceleration hint
                    }}
                    className="mb-4"
                >
                    <CollapsibleSection
                        key={groupName}
                        isOpen={!isCollapsed}
                        onToggle={onToggleCollapse}
                        dragHandle={
                            isDragEnabled && (
                                <div
                                    ref={setActivatorNodeRef}
                                    {...listeners}
                                    {...attributes}
                                    className="cursor-grab active:cursor-grabbing text-sub hover:text-text-primary active:text-text-primary px-1 -ml-2 opacity-0 group-hover:opacity-100 transition-[opacity,color,background-color] duration-200"
                                    title="Drag to reorder group"
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                        listeners?.onPointerDown?.(e);
                                    }}
                                >
                                    <FontAwesomeIcon icon={faGripVertical} className="text-sm" />
                                </div>
                            )
                        }
                        title={
                            <div className="flex items-center gap-3">
                                {icon && <FontAwesomeIcon icon={icon} style={{ color: color }} className="text-lg opacity-80" />}
                                <span className={groupName === 'ungrouped' ? 'opacity-50' : ''}>{groupName}</span>
                                <span className="text-xs font-mono font-normal opacity-40 bg-sub/20 px-2 py-0.5 rounded-full ml-auto md:ml-0">
                                    {protocols.length}
                                </span>
                            </div>
                        }
                        trailing={
                            groupName !== 'ungrouped' && (
                                <button
                                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-sub hover:text-text-primary p-2 ml-2"
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
                        className={`animate-in fade-in slide-in-from-bottom-2 duration-500`}
                    >
                        {content}
                    </CollapsibleSection>
                </div>
            )}
        </SortableItem>
    );
});
