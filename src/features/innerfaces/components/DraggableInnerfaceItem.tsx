import React from 'react';
import { SortableItem } from '../../../components/ui/molecules/SortableItem';
import { InnerfaceCard } from './InnerfaceCard';
import type { Innerface } from '../types';

export const DraggableInnerfaceItem = React.memo(({
    innerface,
    onEdit,
    onPlanning,
    hasGoal
}: {
    innerface: Innerface;
    onEdit: (id: string | number) => void;
    onPlanning?: () => void;
    hasGoal?: boolean;
}) => {
    return (
        <SortableItem key={innerface.id} id={String(innerface.id)}>
            {({ setNodeRef, listeners, attributes, style, isDragging }) => (
                <div
                    ref={setNodeRef}
                    data-tour="skills-card"
                    style={{
                        ...style,
                        opacity: isDragging ? 0 : 1,
                        transition: isDragging ? 'none' : style.transition,
                        willChange: 'transform'
                    }}
                    {...listeners}
                    {...attributes}
                    className="relative cursor-grab active:cursor-grabbing touch-callout-none"
                >
                    <InnerfaceCard
                        innerface={innerface}
                        onEdit={() => onEdit(innerface.id)}
                        onPlanning={onPlanning}
                        hasGoal={hasGoal}
                    />
                </div>
            )}
        </SortableItem>
    );
});
