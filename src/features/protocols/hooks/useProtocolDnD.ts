import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
    useSensor,
    useSensors,
    MouseSensor,
    TouchSensor,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
} from '@dnd-kit/sortable';
import type { Protocol } from '../types';
import { DND_SENSORS_CONFIG } from '../../../constants/dnd';
import { SafeKeyboardSensor } from '../../../utils/safeKeyboardSensor';

interface UseProtocolDnDProps {
    groupedProtocols: [string, Protocol[]][];
    onReorderGroups: (newOrder: string[]) => void;
    onReorderProtocols: (newOrder: string[]) => void;
    onMoveProtocol: (id: string, newGroup: string, orderedIds: string[]) => void;
}

export const useProtocolDnD = ({
    groupedProtocols,
    onReorderGroups,
    onReorderProtocols,
    onMoveProtocol
}: UseProtocolDnDProps) => {
    // ATOMIC DND ARCHITECTURE
    const [active, setActive] = useState<{
        id: string | null;
        protocol: Protocol | null;
        group: string | null;
    }>({ id: null, protocol: null, group: null });

    const [justDroppedId, setJustDroppedId] = useState<string | null>(null);

    // Local State for Optimistic UI
    // We flatten the structure to locally manage items during drag
    const [localProtocols, setLocalProtocols] = useState<Protocol[]>([]);
    const [localGroupOrder, setLocalGroupOrder] = useState<string[]>([]);
    const isDraggingRef = useRef(false);

    // Derived state for groups (similar to useInnerfaceDnD logic but tailored for protocols)
    // However, ProtocolsContent expects `groupedProtocols` prop. 
    // We need to return the *optimistic* groupedProtocols if dragging, or the prop if not.

    // Sync local state when props change (if not dragging)
    useEffect(() => {
        if (!isDraggingRef.current) {
            const allProtocols = groupedProtocols.flatMap(([, ps]) => ps);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLocalProtocols(allProtocols);
            setLocalGroupOrder(groupedProtocols.map(([g]) => g));
        }
    }, [groupedProtocols]);

    // Construct optimistic grouped protocols
    const optimisticGroupedProtocols = useMemo(() => {
        if (!active.id) return groupedProtocols;

        const groups: Record<string, Protocol[]> = {};
        const groupOrder = localGroupOrder.length ? localGroupOrder : groupedProtocols.map(([g]) => g);

        // Initialize groups
        groupOrder.forEach(g => { groups[g] = []; });

        localProtocols.forEach(p => {
            const g = p.group || 'ungrouped';
            if (!groups[g]) groups[g] = [];
            groups[g].push(p);
        });

        // Convert to array format matching prop
        return groupOrder.map(g => [g, groups[g] || []] as [string, Protocol[]]);
    }, [groupedProtocols, localProtocols, localGroupOrder, active.id]);


    const sensors = useSensors(
        useSensor(MouseSensor, DND_SENSORS_CONFIG.mouse),
        useSensor(TouchSensor, DND_SENSORS_CONFIG.touch),
        useSensor(SafeKeyboardSensor, DND_SENSORS_CONFIG.keyboard)
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const id = String(event.active.id);
        console.debug('[ProtocolDnD] Drag Start', id);
        setJustDroppedId(null);
        isDraggingRef.current = true;

        let protocol: Protocol | null = null;
        let group: string | null = null;

        if (id.startsWith('group-')) {
            group = id.replace('group-', '');
        } else {
            // Find protocol in local state (more accurate if purely client-side reorder, 
            // but at drag start local === props usually)
            protocol = localProtocols.find(p => String(p.id) === id) || null;
        }

        setActive({ id, protocol, group });
    }, [localProtocols]);

    // Global cursor lock during drag
    useEffect(() => {
        if (active.id) {
            document.body.style.cursor = 'grabbing';
        } else {
            document.body.style.cursor = '';
        }
        return () => { document.body.style.cursor = ''; };
    }, [active.id]);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeIdStr = String(active.id);
        const overIdStr = String(over.id);
        if (activeIdStr === overIdStr) return;

        // Group Reordering
        if (activeIdStr.startsWith('group-') && overIdStr.startsWith('group-')) {
            const activeGrp = activeIdStr.replace('group-', '');
            const overGrp = overIdStr.replace('group-', '');

            setLocalGroupOrder(prev => {
                const oldIdx = prev.indexOf(activeGrp);
                const newIdx = prev.indexOf(overGrp);
                if (oldIdx !== -1 && newIdx !== -1) {
                    return arrayMove(prev, oldIdx, newIdx);
                }
                return prev;
            });
            return;
        }

        // Protocol Moving/Reordering
        if (!activeIdStr.startsWith('group-')) {
            const activeProtocol = localProtocols.find(p => String(p.id) === activeIdStr);
            if (!activeProtocol) return;

            // Determine Target Group
            let targetGroup = activeProtocol.group || 'ungrouped';

            if (overIdStr.startsWith('group-')) {
                targetGroup = overIdStr.replace('group-', '');
            } else {
                const overProtocol = localProtocols.find(p => String(p.id) === overIdStr);
                if (overProtocol) {
                    targetGroup = overProtocol.group || 'ungrouped';
                }
            }

            // Update Local State
            if (activeProtocol.group !== targetGroup && (targetGroup !== 'ungrouped' || activeProtocol.group)) {
                // Moved to different group
                setLocalProtocols(prev => {
                    return prev.map(p => {
                        if (String(p.id) === activeIdStr) {
                            return { ...p, group: targetGroup === 'ungrouped' ? '' : targetGroup };
                        }
                        return p;
                    });
                });
            } else {
                // Reordering within same group (or global reorder if we ignore groups, but here we respect groups)
                // Need to find indices relative to the visual list or global list?
                // arrayMove works on the global list. 
                // If we sort the global list by group then order, it should work.
                // But simply swapping in the flat list might not represent visual position if groups are interleaved (which they aren't).

                // If dragging over another protocol
                if (!overIdStr.startsWith('group-')) {
                    const overProtocol = localProtocols.find(p => String(p.id) === overIdStr);
                    if (overProtocol) {
                        const oldIndex = localProtocols.findIndex(p => String(p.id) === activeIdStr);
                        const newIndex = localProtocols.findIndex(p => String(p.id) === overIdStr);
                        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                            setLocalProtocols(prev => arrayMove(prev, oldIndex, newIndex));
                        }
                    }
                }
            }
        }
    }, [localProtocols]);

    const handleDragCancel = useCallback(() => {
        console.debug('[ProtocolDnD] Drag Cancel');
        isDraggingRef.current = false;
        setActive({ id: null, protocol: null, group: null });
        // Revert any optimistic reorder applied during dragOver
        setLocalProtocols(groupedProtocols.flatMap(([, ps]) => ps));
        setLocalGroupOrder(groupedProtocols.map(([g]) => g));
    }, [groupedProtocols]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active: dndActive, over } = event;
        const activeIdStr = String(dndActive.id);
        const overIdStr = over ? String(over.id) : null;

        console.debug('[ProtocolDnD] Drag End', { active: activeIdStr, over: overIdStr });
        isDraggingRef.current = false;
        setActive({ id: null, protocol: null, group: null });
        setJustDroppedId(activeIdStr);
        // Auto-clear the dropped state after a minimal delay to prevent accidental clicks
        // but return to active state "immediately" from user perspective
        setTimeout(() => setJustDroppedId(null), 50);

        if (!over) return;

        // Group Reorder Persist
        if (activeIdStr.startsWith('group-')) {
            if (JSON.stringify(localGroupOrder) !== JSON.stringify(groupedProtocols.map(g => g[0]))) {
                onReorderGroups(localGroupOrder);
            }
            return;
        }

        // Protocol Persist
        const movedProtocol = localProtocols.find(p => String(p.id) === activeIdStr);
        if (movedProtocol) {
            const targetGroup = movedProtocol.group || 'ungrouped';

            // Get all protocols in this target group from local state, in order
            const protocolsInGroup = localProtocols.filter(p => (p.group || 'ungrouped') === targetGroup);
            // We also need to know if the group CHANGED for this protocol compared to PROP
            // But simpler is to always call the appropriate handler based on whether we moved groups or just reordered

            // Find original protocol to check if group changed
            const originalProtocol = groupedProtocols.flatMap(g => g[1]).find(p => String(p.id) === activeIdStr);

            if (originalProtocol && (originalProtocol.group || 'ungrouped') !== targetGroup) {
                // Group Change
                const orderedIds = protocolsInGroup.map(p => String(p.id));
                onMoveProtocol(activeIdStr, targetGroup, orderedIds);
            } else {
                // Reorder within group
                const orderedIds = protocolsInGroup.map(p => String(p.id));
                onReorderProtocols(orderedIds);
            }
        }

    }, [groupedProtocols, localGroupOrder, localProtocols, onReorderGroups, onReorderProtocols, onMoveProtocol]);

    const clearJustDropped = useCallback(() => setJustDroppedId(null), []);

    return {
        sensors,
        active,
        justDroppedId,
        clearJustDropped,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        handleDragCancel,
        // Return optimistic groups
        optimisticGroupedProtocols
    };
};
