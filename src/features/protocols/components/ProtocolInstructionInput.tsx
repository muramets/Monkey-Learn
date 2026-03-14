import React, { Suspense } from 'react';

const RichTextEditor = React.lazy(() =>
    import('../../../components/ui/RichTextEditor/RichTextEditor').then(m => ({ default: m.RichTextEditor }))
);

interface ProtocolInstructionInputProps {
    instruction: string;
    setInstruction: (value: string) => void;
    hasInstruction: boolean;
    setHasInstruction: (value: boolean) => void;
}

const InputLabel = ({ label }: { label: string }) => (
    <label className="text-[10px] text-main font-mono font-bold uppercase tracking-[0.2em] opacity-90 px-1">
        {label}
    </label>
);

export const ProtocolInstructionInput = React.memo(({ instruction, setInstruction, hasInstruction, setHasInstruction }: ProtocolInstructionInputProps) => {

    return (
        <div className="flex flex-col gap-1.5">
            <InputLabel label="Specific Instructions" />
            <div className="flex items-center gap-3">
                <div className="flex-1 bg-sub-alt rounded-lg p-1 flex gap-1">
                    <button
                        type="button"
                        onClick={() => setHasInstruction(false)}
                        className={`flex-1 px-3 py-2 rounded-md text-xs font-mono uppercase font-bold transition-[color,background-color,box-shadow] ${!hasInstruction
                            ? 'bg-sub text-text-primary shadow-sm'
                            : 'text-sub hover:text-text-primary'
                            }`}
                    >
                        Off
                    </button>
                    <button
                        type="button"
                        onClick={() => setHasInstruction(true)}
                        className={`flex-1 px-3 py-2 rounded-md text-xs font-mono uppercase font-bold transition-[color,background-color,box-shadow] ${hasInstruction
                            ? 'bg-sub text-text-primary shadow-sm'
                            : 'text-sub hover:text-text-primary'
                            }`}
                    >
                        On
                    </button>
                </div>
            </div>

            {hasInstruction && (
                <div className="flex flex-col gap-1.5 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Suspense fallback={<div className="h-32 animate-pulse bg-sub-alt/50 rounded-lg" />}>
                        <RichTextEditor
                            value={instruction}
                            onChange={setInstruction}
                            placeholder="Enter specific instructions..."
                            className="min-h-[120px] max-h-[300px] overflow-hidden"
                        />
                    </Suspense>
                </div>
            )}
        </div>
    );
});
