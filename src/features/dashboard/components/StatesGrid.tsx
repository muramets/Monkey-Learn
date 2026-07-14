import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTooltipSuppression } from '../../../hooks/useTooltipSuppression';
import type { StateData } from '../types';
import { Plus } from 'lucide-react';
import { CollapsibleSection } from '../../../components/ui/molecules/CollapsibleSection';
import {
    DndContext,
    closestCenter,
    DragOverlay,
} from '@dnd-kit/core';
import {
    SortableContext,
    rectSortingStrategy
} from '@dnd-kit/sortable';
import { SortableStateCard } from './SortableStateCard';
import { StateCard } from './StateCard';
import { useMetadataStore } from '../../../stores/metadataStore';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../../../components/ui/atoms/Tooltip';
import { useSortableList } from '../../../hooks/useSortableList';

interface StatesGridProps {
    states: StateData[];
    onAddState?: () => void;
    onEdit?: (id: string) => void;
    onHistory?: (id: string) => void;
    hasProtocols?: boolean;
    isModalOpen?: boolean;
}

export function StatesGrid({ states, onAddState, onEdit, onHistory, hasProtocols = false, isModalOpen = false }: StatesGridProps) {
    const { reorderStates, isDimensionsCollapsed, setDimensionsCollapsed } = useMetadataStore();
    const navigate = useNavigate();
    const [localOpen, setLocalOpen] = useState(false);
    const suppressTooltip = useTooltipSuppression(isModalOpen);

    const visibleStates = states.filter(s => !s.deletedAt);

    const { sensors, activeId, handleDragStart, handleDragEnd, handleDragCancel } = useSortableList({
        items: visibleStates,
        onReorder: reorderStates
    });

    return (
        <CollapsibleSection
            title="Dimensions"
            isOpen={!isDimensionsCollapsed}
            onToggle={() => setDimensionsCollapsed(!isDimensionsCollapsed)}
            trailing={
                <TooltipProvider delayDuration={1000}>
                    <Tooltip
                        open={isModalOpen || suppressTooltip ? false : localOpen}
                        onOpenChange={setLocalOpen}
                    >
                        <TooltipTrigger asChild>
                            <button
                                onClick={(e) => {
                                    setLocalOpen(false);
                                    e.stopPropagation();
                                    onAddState?.();
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-lg text-sub hover:text-text-primary transition-colors duration-200"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </TooltipTrigger>
                        {!isModalOpen && (
                            <TooltipContent side="top">
                                <span className="font-mono text-xs">Add new dimension</span>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            }
        >
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <DragOverlay dropAnimation={null}>
                    {activeId ? (
                        <div className="cursor-grabbing opacity-90 scale-[1.02] shadow-2xl touch-none">
                            {/* Find the state object for the active ID */}
                            {(() => {
                                const activeState = visibleStates.find(s => s.id === activeId);
                                if (!activeState) return null;
                                return <StateCard state={activeState} {...activeState} />;
                            })()}
                        </div>
                    ) : null}
                </DragOverlay>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <SortableContext
                        items={visibleStates.map(s => s.id)}
                        strategy={rectSortingStrategy}
                    >
                        {visibleStates.map((state) => (
                            <SortableStateCard
                                key={state.id}
                                state={state}
                                onEdit={onEdit}
                                onHistory={onHistory}
                            />
                        ))}
                    </SortableContext>

                    {/* Empty State / Add Placeholder */}
                    {visibleStates.length === 0 && (
                        !hasProtocols ? (
                            <button
                                onClick={() => navigate('/actions')}
                                className="col-span-full md:col-span-1 min-h-[180px] border border-dashed border-sub/30 hover:border-sub rounded-2xl flex flex-col items-center justify-center gap-3 text-sub hover:text-text-primary transition-colors duration-200 group bg-sub-alt/5 hover:bg-sub-alt/10 py-6"
                            >
                                <Plus className="w-8 h-8" />
                                <span className="font-mono text-xs">Start by adding actions</span>
                            </button>
                        ) : (
                            <button
                                onClick={onAddState}
                                className="col-span-full md:col-span-1 min-h-[180px] border border-dashed border-sub/30 hover:border-sub rounded-2xl flex flex-col items-center justify-center gap-3 text-sub hover:text-text-primary transition-colors duration-200 group bg-sub-alt/5 hover:bg-sub-alt/10 py-6"
                            >
                                <Plus className="w-8 h-8" />
                                <span className="font-mono text-xs">Add your first dimension</span>
                            </button>
                        )
                    )}
                </div>
            </DndContext>
        </CollapsibleSection>
    );
}

