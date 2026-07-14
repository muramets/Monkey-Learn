import { useState, useCallback } from 'react';
import {
    useSensor,
    useSensors,
    MouseSensor, // Changed from PointerSensor for better control
    TouchSensor, // Added TouchSensor for mobile support
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { DND_SENSORS_CONFIG } from '../constants/dnd';

interface UseSortableListProps<T> {
    items: T[];
    onReorder: (newOrder: string[]) => void;
    idProp?: keyof T; // defaults to 'id'
}

export const useSortableList = <T extends { id: string | number }>({
    items,
    onReorder,
}: UseSortableListProps<T>) => {
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(MouseSensor, DND_SENSORS_CONFIG.mouse),
        useSensor(TouchSensor, DND_SENSORS_CONFIG.touch)
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(String(event.active.id));
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (active.id !== over?.id) {
            const oldIndex = items.findIndex((item) => String(item.id) === String(active.id));
            const newIndex = items.findIndex((item) => String(item.id) === String(over?.id));

            if (oldIndex !== -1 && newIndex !== -1) {
                const newItems = arrayMove(items, oldIndex, newIndex);
                onReorder(newItems.map(item => String(item.id)));
            }
        }
    }, [items, onReorder]);

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
    }, []);

    return {
        sensors,
        activeId,
        handleDragStart,
        handleDragEnd,
        handleDragCancel
    };
};
