import type { Innerface } from '../../innerfaces/types';
import { Modal } from '../../../components/ui/molecules/Modal';
import { Button } from '../../../components/ui/atoms/Button';
import { usePlanningLogic } from '../hooks/usePlanningLogic';
import { PlanningActionList } from './PlanningActionList';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

interface PlanningModalProps {
    innerface: Innerface;
    isOpen: boolean;
    onClose: () => void;
}

const SectionLabel = ({ label }: { label: string }) => (
    <label className="text-[10px] uppercase tracking-wider font-bold text-main mb-2 block">
        {label}
    </label>
);

export function PlanningModal(props: PlanningModalProps) {
    const {
        // State
        currentScore,
        targetScore,
        isSubmitting,
        isCustomizing,
        setIsCustomizing,
        actionCounts,
        setActionCounts,

        // Protocol Data
        linkedProtocols,
        pointsNeeded,

        // Handlers
        handleSave,
        handleMouseDown,
        progressBarRef,

        // Colors & Visualization
        currentColor,
        targetColor,
        scoreGradient,
        targetPercent,
        handleDelete,
        hasExistingPlan,
        deactivatedProtocols,
        handleProtocolToggle
    } = usePlanningLogic(props);

    // Prevent drag propagation on range inputs
    const stopPropagation = (e: React.PointerEvent | React.MouseEvent) => {
        e.stopPropagation();
    };



    return (
        <Modal
            isOpen={props.isOpen}
            onClose={props.onClose}
            title={hasExistingPlan ? "Edit Planning" : "Start Planning"}
            onSubmit={handleSave}
            footer={
                <div className="flex items-center justify-between w-full">
                    <div>
                        {hasExistingPlan && (
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={handleDelete}
                                disabled={isSubmitting}
                                className="text-[10px] uppercase tracking-wider font-bold px-4 py-2 !transition-none opacity-80 hover:opacity-100 flex items-center gap-2"
                            >
                                <FontAwesomeIcon icon={faTrash} />
                                Delete Plan
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="neutral"
                            size="sm"
                            onClick={props.onClose}
                            disabled={isSubmitting}
                            className="text-[10px] uppercase tracking-wider font-bold px-4 py-2 !transition-none"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleSave}
                            isLoading={isSubmitting}
                            className="text-[10px] uppercase tracking-wider font-bold px-6 py-2 shadow-[0_0_15px_rgba(226,183,20,0.2)]"
                        >
                            Save Plan
                        </Button>
                    </div>
                </div>
            }
        >
            <div
                className="flex flex-col gap-8 px-1"
                onPointerDown={stopPropagation}
                onMouseDown={stopPropagation}
            >

                {/* 1. Target Goal (Interactive Bar) */}
                <div>
                    <SectionLabel label="Target Goal" />
                    <div className="flex flex-col gap-4 bg-sub-alt/20 rounded-xl p-5 border border-white/5 relative overflow-hidden group">

                        {/* Header Stats */}
                        <div className="flex justify-between items-start relative z-10">
                            <div className="flex flex-col relative">
                                {/* Blur Effect for Current */}
                                <div
                                    className="absolute -inset-4 blur-xl opacity-20 transition-colors duration-500"
                                    style={{ backgroundColor: currentColor }}
                                />
                                <span className="text-[10px] uppercase text-sub font-mono tracking-wider relative z-10">Current</span>
                                <span
                                    className="text-xl font-mono relative z-10"
                                    style={{ color: currentColor }}
                                >
                                    {currentScore.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex flex-col items-end relative">
                                {/* Blur Effect for Target */}
                                <div
                                    className="absolute -inset-4 blur-xl opacity-20 transition-colors duration-300"
                                    style={{ backgroundColor: targetColor }}
                                />
                                <span className="text-[10px] uppercase text-sub font-mono tracking-wider relative z-10">Target</span>
                                <span
                                    className="text-3xl font-mono font-bold transition-colors duration-300 relative z-10"
                                    style={{ color: targetColor }}
                                >
                                    {targetScore.toFixed(1)}
                                </span>
                                {pointsNeeded > 0 && (
                                    <span className="text-[10px] text-sub font-mono relative z-10 mt-0.5">
                                        (+{Math.round(pointsNeeded * 100)} XP)
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Interactive Bar */}
                        <div
                            className="relative h-8 w-full cursor-pointer touch-none py-2 z-10"
                            onMouseDown={handleMouseDown}
                            onPointerDown={stopPropagation}
                            ref={progressBarRef}
                        >
                            {/* Track Background */}
                            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 bg-sub-alt rounded-full overflow-hidden" />

                            {/* Active Fill - Gradient from left edge to thumb */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full pointer-events-none left-0"
                                style={{
                                    width: `${targetPercent}%`,
                                    background: scoreGradient,
                                    boxShadow: `0 0 10px color-mix(in srgb, ${targetColor} 25%, transparent)`
                                }}
                            />

                            {/* Thumb / Handle */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg border-2 pointer-events-none group-hover:scale-110"
                                style={{
                                    left: `${targetPercent}%`,
                                    borderColor: targetColor,
                                    marginLeft: '-10px'
                                }}
                            />
                        </div>
                    </div>
                </div>



                {/* 3. Action Plan - Smart Calculator */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <SectionLabel label="Actions" />

                    </div>

                    <PlanningActionList
                        linkedProtocols={linkedProtocols}
                        isCustomizing={isCustomizing}
                        actionCounts={actionCounts}
                        setActionCounts={setActionCounts}
                        setIsCustomizing={setIsCustomizing}
                        pointsNeeded={pointsNeeded}
                        deactivatedProtocols={deactivatedProtocols}
                        handleProtocolToggle={handleProtocolToggle}
                    />
                </div>

            </div>
        </Modal >
    );
}
