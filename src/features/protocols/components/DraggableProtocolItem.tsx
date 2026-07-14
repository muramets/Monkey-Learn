import React from 'react';
import { SortableItem } from '../../../components/ui/molecules/SortableItem';
import { ProtocolRow } from './ProtocolRow';
import type { Protocol } from '../types';
import type { Innerface } from '../../innerfaces/types';

import { useInteraction } from '../context/InteractionContext';

export const DraggableProtocolItem = React.memo(({
    protocol,
    innerfaces,
    applyProtocol,
    handleEditProtocol,
    isDragEnabled,
    isReadOnly
}: {
    protocol: Protocol;
    innerfaces: Innerface[];
    applyProtocol: (id: string | number, direction: '+' | '-') => void;
    handleEditProtocol: (id: string | number) => void;
    isDragEnabled: boolean;
    isReadOnly: boolean;
}) => {
    const { justDroppedId, isDragging } = useInteraction();
    const isJustDropped = String(protocol.id) === justDroppedId;

    // Disable heavy interactions if ANY item is dragging (global lock) or if this specific item was just dropped
    const shouldDisableInteractions = isDragging || isJustDropped;

    return (
        <SortableItem key={protocol.id} id={String(protocol.id)} disabled={!isDragEnabled}>
            {({ setNodeRef, listeners, attributes, style, isDragging }) => (
                <div
                    ref={setNodeRef}
                    data-tour="actions-row"
                    style={{
                        ...style,
                        opacity: isDragging ? 0 : 1,
                        transition: isDragging ? 'none' : style.transition,
                        willChange: 'transform' // Hardware acceleration hint
                    }}
                    className="touch-callout-none"
                    {...listeners}
                    {...attributes}
                >
                    <ProtocolRow
                        protocol={protocol}
                        innerfaces={innerfaces}
                        onLevelUp={(id: string | number) => applyProtocol(id, '+')}
                        onLevelDown={(id: string | number) => applyProtocol(id, '-')}
                        onEdit={handleEditProtocol}
                        isDisabled={shouldDisableInteractions}
                        isReadOnly={isReadOnly}
                        isGrabbing={isDragging}
                    />
                </div>
            )}
        </SortableItem>
    );
}, (prev, next) => {
    // Custom comparison to avoid re-renders on ID unrelated changes
    return prev.protocol === next.protocol &&
        prev.innerfaces === next.innerfaces &&
        prev.isDragEnabled === next.isDragEnabled &&
        prev.isReadOnly === next.isReadOnly;
});
