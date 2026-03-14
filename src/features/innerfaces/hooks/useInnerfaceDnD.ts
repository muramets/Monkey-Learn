import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
    useSensor,
    useSensors,
    MouseSensor,
    TouchSensor,
    KeyboardSensor,
    type DragStartEvent,
    type DragOverEvent,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
} from '@dnd-kit/sortable';
import type { Innerface, PowerCategory } from '../types';
import { DND_SENSORS_CONFIG } from '../../../constants/dnd';
import { useMetadataStore } from '../../../stores/metadataStore';

interface UseInnerfaceDnDProps {
    innerfaces: Innerface[];
    groupOrder: Record<string, string[]>;
    categoryOrder: string[];
    onReorderCategories: (newOrder: string[]) => void;
    onReorderGroups: (newOrder: Record<string, string[]>) => void;
    onMoveInnerface: (id: string, newGroup: string, orderedIds: string[]) => void;
}

export const useInnerfaceDnD = ({
    innerfaces,
    groupOrder,
    categoryOrder,
    onReorderCategories,
    onReorderGroups,
    onMoveInnerface,
}: UseInnerfaceDnDProps) => {
    const setHasPendingWrites = useMetadataStore(state => state.setHasPendingWrites);

    // --- Local State for Drag (Optimistic UI) ---
    const [items, setItems] = useState<Innerface[]>(innerfaces);
    const [localCategoryOrder, setLocalCategoryOrder] = useState<string[]>(categoryOrder);
    const [localGroupOrder, setLocalGroupOrder] = useState<Record<string, string[]>>(groupOrder || {});
    const isDraggingRef = useRef(false);
    const pendingSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Preserve groups that existed at drag start to prevent them from disappearing
    const dragStartGroupsRef = useRef<Record<string, string[]>>({});

    // CRITICAL: Refs to track current state values for debounced save (avoid stale closures)
    const localCategoryOrderRef = useRef(localCategoryOrder);
    const localGroupOrderRef = useRef(localGroupOrder);
    const itemsRef = useRef(items);

    // Keep refs in sync with state
    useEffect(() => {
        localCategoryOrderRef.current = localCategoryOrder;
    }, [localCategoryOrder]);

    useEffect(() => {
        localGroupOrderRef.current = localGroupOrder;
    }, [localGroupOrder]);

    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    // Sync items when prop updates, BUT ignore if we are actively dragging
    useEffect(() => {
        if (!isDraggingRef.current) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setItems(innerfaces);
            setLocalCategoryOrder(categoryOrder);
            setLocalGroupOrder(groupOrder || {});
        }
    }, [innerfaces, categoryOrder, groupOrder]);

    const sensors = useSensors(
        useSensor(MouseSensor, DND_SENSORS_CONFIG.mouse),
        useSensor(TouchSensor, DND_SENSORS_CONFIG.touch),
        useSensor(KeyboardSensor, DND_SENSORS_CONFIG.keyboard)
    );


    // --- Data Derivation (no manual stabilization - React.memo in components handles it) ---

    const { innerfacesByCategory, getGroupsForCategory } = useMemo(() => {
        const newByCategory: Record<string, Innerface[]> = {
            skill: [],
            foundation: [],
            uncategorized: []
        };

        items.forEach(i => {
            if (i.category === 'skill') newByCategory.skill.push(i);
            else if (i.category === 'foundation') newByCategory.foundation.push(i);
            else newByCategory.uncategorized.push(i);
        });

        // Memoized helper to group items within a specific category
        const getGroupsForCategory = (category: string) => {
            const groupItems = newByCategory[category] || [];

            // Generate current state of groups
            const groups: Record<string, Innerface[]> = {};
            const ungroupedArr: Innerface[] = [];

            groupItems.forEach(item => {
                if (item.group) {
                    if (!groups[item.group]) groups[item.group] = [];
                    groups[item.group].push(item);
                } else {
                    ungroupedArr.push(item);
                }
            });

            // Sort group names based on localGroupOrder FOR THIS CATEGORY
            const categorySpecificOrder = localGroupOrder[category] || [];

            // During drag, include groups that existed at drag start (even if now empty)
            const allGroupNames = new Set(Object.keys(groups));
            if (isDraggingRef.current && dragStartGroupsRef.current[category]) {
                dragStartGroupsRef.current[category].forEach(g => allGroupNames.add(g));
            }

            const sortedGroupNames = Array.from(allGroupNames).sort((a, b) => {
                const indexA = categorySpecificOrder.indexOf(a);
                const indexB = categorySpecificOrder.indexOf(b);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return a.localeCompare(b);
            });

            const currentGroups: [string, Innerface[]][] = sortedGroupNames.map(name => [name, groups[name] || []]);
            if (ungroupedArr.length > 0) {
                currentGroups.push(['ungrouped', ungroupedArr]);
            }

            return currentGroups;
        };

        return { innerfacesByCategory: newByCategory, getGroupsForCategory };
    }, [items, localGroupOrder]);

    // Determine category order safely
    const activeCategoryOrder = useMemo(() => {
        const defaultOrder = ['skill', 'foundation', 'uncategorized'];
        const baseOrder = localCategoryOrder && localCategoryOrder.length > 0 ? localCategoryOrder : categoryOrder;

        const merged = [...baseOrder];
        defaultOrder.forEach(c => {
            if (!merged.includes(c)) merged.push(c);
        });
        return merged.filter(c => defaultOrder.includes(c));
    }, [localCategoryOrder, categoryOrder]);

    const categoryIds = useMemo(() => activeCategoryOrder.map(c => `category-${c}`), [activeCategoryOrder]);

    // --- DnD State ---
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeItem, setActiveItem] = useState<Innerface | null>(null);
    const [activeGroup, setActiveGroup] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [isValidDrop, setIsValidDrop] = useState(true);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        const id = active.id as string;
        console.debug('[DnD] Drag Start:', id);

        setActiveId(id);
        isDraggingRef.current = true;
        setIsValidDrop(true);

        // Capture current groups per category at drag start
        const groupsSnapshot: Record<string, string[]> = {};
        ['skill', 'foundation', 'uncategorized'].forEach(cat => {
            const catItems = items.filter(i => (i.category || 'uncategorized') === cat);
            const catGroups = new Set(catItems.map(i => i.group).filter(Boolean) as string[]);
            groupsSnapshot[cat] = Array.from(catGroups);
        });
        dragStartGroupsRef.current = groupsSnapshot;

        if (id.startsWith('category-')) {
            setActiveCategory(id.replace('category-', ''));
            setActiveGroup(null);
            return;
        }

        if (id.startsWith('group-')) {
            const parts = id.split('-');
            const cat = parts[1];
            const groupName = parts.slice(2).join('-');
            console.debug('[DnD Debug] Dragging Group:', { groupName, category: cat });

            setActiveGroup(groupName);
            setActiveCategory(cat);

            // Initialize local order for this category if missing
            setLocalGroupOrder((prev) => {
                if (prev[cat] && prev[cat].length > 0) return prev;

                // Get all groups currently in this category
                const catItems = items.filter(i => (i.category || 'uncategorized') === cat);
                const uniqueGroups = Array.from(new Set(catItems.map(i => i.group).filter(Boolean))) as string[];

                return {
                    ...prev,
                    [cat]: uniqueGroups
                };
            });
            return;
        }

        const item = items.find(i => String(i.id) === id);
        if (item) {
            console.debug('[DnD Debug] Dragging Item:', item.name);
            setActiveItem(item);
        }
    }, [items]);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) {
            if (isValidDrop !== true) setIsValidDrop(true);
            return;
        }

        const activeIdStr = String(active.id);
        const overIdStr = String(over.id);

        if (activeIdStr === overIdStr) return;

        const itemMap = new Map(items.map((i, idx) => [String(i.id), { item: i, index: idx }]));
        const activeData = itemMap.get(activeIdStr);

        // Note: activeData is undefined for categories and groups - that's OK!
        if (!activeData && !activeIdStr.startsWith('category-') && !activeIdStr.startsWith('group-')) return;

        const activeItem = activeData?.item;
        const activeIndex = activeData?.index ?? -1;

        // --- Category Reordering ---
        if (activeIdStr.startsWith('category-')) {
            if (overIdStr.startsWith('category-')) {
                const activeCat = activeIdStr.replace('category-', '');
                const overCat = overIdStr.replace('category-', '');

                if (activeCat !== overCat) {
                    setLocalCategoryOrder((prev) => {
                        const workingOrder = prev.length > 0 ? prev : activeCategoryOrder;
                        const oldIndex = workingOrder.indexOf(activeCat);
                        const newIndex = workingOrder.indexOf(overCat);
                        if (oldIndex !== -1 && newIndex !== -1) {
                            return arrayMove(workingOrder, oldIndex, newIndex);
                        }
                        return workingOrder;
                    });
                }
            }
            setIsValidDrop(true);
            return;
        }

        // --- Group Reordering ---
        if (activeIdStr.startsWith('group-')) {
            const activeParts = activeIdStr.split('-');
            const activeCat = activeParts[1];
            const activeGrp = activeParts.slice(2).join('-');

            let overGrp: string | undefined;
            let overCat: string | null | undefined;

            if (overIdStr.startsWith('group-')) {
                const overParts = overIdStr.split('-');
                overCat = overParts[1];
                overGrp = overParts.slice(2).join('-');
            } else if (overIdStr.startsWith('category-')) {
                overCat = overIdStr.replace('category-', '');
                // Allow dropping onto category: puts it at top or bottom depending on direction?
                // For simplicity, just snap to first group:
                if (overCat === activeCat) {
                    // Find first group
                    // We need a helper, but hook context is expensive. 
                    // Let's rely on standard sorting: if dropping on category, it usually means "top of list"
                    // But DND-kit handles list sorting better between items.
                    // Dropping on category usually is ignored for reordering unless mapped to index 0.
                }
            }

            // Only allow reordering within SAME category
            if (activeCat === overCat && activeGrp && overGrp && activeGrp !== overGrp) {
                setLocalGroupOrder((prev) => {
                    const currentList = prev[activeCat] || [];
                    const next = [...currentList];

                    // Create minimal list if empty (shouldn't happen due to DragStart init)
                    if (!next.length) {
                        const catItems = items.filter(i => (i.category || 'uncategorized') === activeCat);
                        const uniqueGroups = Array.from(new Set(catItems.map(i => i.group).filter(Boolean))) as string[];
                        if (!uniqueGroups.includes(activeGrp)) uniqueGroups.push(activeGrp);
                        if (overGrp && !uniqueGroups.includes(overGrp)) uniqueGroups.push(overGrp);
                        return { ...prev, [activeCat]: uniqueGroups };
                    }

                    if (!next.includes(activeGrp)) next.push(activeGrp);
                    if (!next.includes(overGrp!)) next.push(overGrp!);

                    const oldIndex = next.indexOf(activeGrp);
                    const newIndex = next.indexOf(overGrp!);

                    if (oldIndex !== -1 && newIndex !== -1) {
                        return {
                            ...prev,
                            [activeCat]: arrayMove(next, oldIndex, newIndex)
                        };
                    }
                    return prev;
                });
                setIsValidDrop(true);
            }
            return;
        }

        // --- Item Logic ---
        if (!activeItem) return;

        // 1. Identify Target Category
        let targetCategory: PowerCategory | undefined;
        const overData = itemMap.get(overIdStr);

        targetCategory = activeItem.category;

        if (overIdStr.startsWith('group-')) {
            const parts = overIdStr.split('-');
            targetCategory = parts[1] as PowerCategory;
        } else if (overIdStr.startsWith('category-')) {
            targetCategory = overIdStr.replace('category-', '') as PowerCategory;
        } else if (overData) {
            targetCategory = overData.item.category;
        }

        // 2. Validate Category Drop
        const newValid = !targetCategory || targetCategory === activeItem.category;
        if (isValidDrop !== newValid) {
            setIsValidDrop(newValid);
        }

        if (!newValid) return;

        // 3. Move Item in Local State (Optimistic Update)
        const overIndex = overData ? overData.index : -1;

        // If dragging over a GROUP header
        if (overIdStr.startsWith('group-')) {
            const parts = overIdStr.split('-');
            const groupName = parts.slice(2).join('-');
            if (activeItem.group !== groupName) {
                setItems((prev) => {
                    const newItems = [...prev];
                    const newItem = { ...newItems[activeIndex], group: groupName === 'ungrouped' ? '' : groupName };
                    newItems[activeIndex] = newItem;
                    return newItems;
                });
            }
            return;
        }

        // If dragging over another ITEM
        if (overIndex !== -1 && activeIndex !== -1) {
            const overItem = overData!.item;
            if (activeItem.group !== overItem.group) {
                setItems((prev) => {
                    const newItems = [...prev];
                    const newItem = { ...newItems[activeIndex], group: overItem.group };
                    newItems[activeIndex] = newItem;
                    return arrayMove(newItems, activeIndex, overIndex);
                });
            } else {
                if (activeIndex !== overIndex) {
                    setItems((prev) => arrayMove(prev, activeIndex, overIndex));
                }
            }
        }
    }, [items, isValidDrop, activeCategoryOrder]);

    // --- 3. Drag End Handler (Persist Changes) ---
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        const activeIdStr = String(active?.id);

        console.debug('[DnD] Drag End', { active: activeIdStr, over: over?.id });

        setHasPendingWrites(true);
        if (pendingSaveRef.current) {
            clearTimeout(pendingSaveRef.current);
        }

        const resetState = () => {
            isDraggingRef.current = false;
            setActiveId(null);
            setActiveItem(null);
            setActiveGroup(null);
            setActiveCategory(null);
            setIsValidDrop(true);
        };

        if (!over) {
            pendingSaveRef.current = null;
            setHasPendingWrites(false);
            setItems(innerfaces);
            setLocalCategoryOrder(categoryOrder);
            setLocalGroupOrder(groupOrder || {});
            resetState();
            return;
        }

        pendingSaveRef.current = setTimeout(() => {
            console.debug('[useInnerfaceDnD] Executing debounced save...');

            if (activeIdStr.startsWith('category-')) {
                const currentOrder = localCategoryOrderRef.current;
                console.info('[useInnerfaceDnD] Persisting Category Order', currentOrder);
                onReorderCategories(currentOrder);
            } else if (activeIdStr.startsWith('group-')) {
                const currentGlobalOrder = localGroupOrderRef.current;
                // We persist the WHOLE object to store
                console.info('[useInnerfaceDnD] Persisting Group Orders', currentGlobalOrder);
                onReorderGroups(currentGlobalOrder);
            } else {
                // Item Reordering
                const currentItems = itemsRef.current;
                const reorderedIds = currentItems.map(i => String(i.id));
                const movedItem = currentItems.find(i => String(i.id) === activeIdStr);

                if (movedItem) {
                    const targetGroup = movedItem.group || 'ungrouped';
                    console.info(`[useInnerfaceDnD] Moving item ${movedItem.name} to ${targetGroup}`);
                    onMoveInnerface(activeIdStr, targetGroup, reorderedIds);
                }
            }

            setTimeout(() => {
                setHasPendingWrites(false);
                pendingSaveRef.current = null;
            }, 500);

        }, 1000);

        requestAnimationFrame(() => {
            resetState();
        });
    }, [innerfaces, onReorderGroups, onReorderCategories, onMoveInnerface, categoryOrder, groupOrder, setHasPendingWrites]);

    return {
        items,
        sensors,
        activeId,
        activeItem,
        activeGroup,
        activeCategory,
        isValidDrop,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        innerfacesByCategory,
        getGroupsForCategory,
        categoryIds,
        activeCategoryOrder
    };
};
