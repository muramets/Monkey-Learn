
import { Input } from '../../../components/ui/molecules/Input';

interface ProtocolXpSelectorProps {
    xp: string;
    onChange: (val: string) => void;
}

const InputLabel = ({ label }: { label: string }) => (
    <label className="text-[10px] text-main font-mono font-bold uppercase tracking-[0.2em] opacity-90 px-1">
        {label}
    </label>
);

export function ProtocolXpSelector({ xp, onChange }: ProtocolXpSelectorProps) {
    return (
        <div className="flex flex-col gap-3">
            <InputLabel label="XP Reward" />

            {/* Presets */}
            <div className="grid grid-cols-3 gap-2">
                <button
                    type="button"
                    onClick={() => onChange('1')}
                    className={`px-2 py-3 rounded-xl border text-[10px] font-mono uppercase tracking-wide transition-[color,background-color,border-color,box-shadow] ${xp === '1' ? 'bg-main border-main text-bg-primary font-bold shadow-[0_0_15px_rgba(var(--main-color-rgb),0.3)]' : 'bg-sub-alt border-transparent text-sub hover:text-text-primary hover:bg-sub'}`}
                >
                    Easy: 1 XP
                </button>
                <button
                    type="button"
                    onClick={() => onChange('5')}
                    className={`px-2 py-3 rounded-xl border text-[10px] font-mono uppercase tracking-wide transition-[color,background-color,border-color,box-shadow] ${xp === '5' ? 'bg-main border-main text-bg-primary font-bold shadow-[0_0_15px_rgba(var(--main-color-rgb),0.3)]' : 'bg-sub-alt border-transparent text-sub hover:text-text-primary hover:bg-sub'}`}
                >
                    Medium: 5 XP
                </button>
                <button
                    type="button"
                    onClick={() => onChange('10')}
                    className={`px-2 py-3 rounded-xl border text-[10px] font-mono uppercase tracking-wide transition-[color,background-color,border-color,box-shadow] ${xp === '10' ? 'bg-main border-main text-bg-primary font-bold shadow-[0_0_15px_rgba(var(--main-color-rgb),0.3)]' : 'bg-sub-alt border-transparent text-sub hover:text-text-primary hover:bg-sub'}`}
                >
                    Hard: 10 XP
                </button>
            </div>

            {/* Separator */}
            <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-2 text-[9px] text-sub/50 uppercase tracking-widest font-mono">or enter manually</span>
                <div className="flex-grow border-t border-white/10"></div>
            </div>

            {/* Manual Input */}
            <Input
                type="number"
                value={xp}
                onChange={e => onChange(e.target.value)}
                step="1"
                min="1"
                className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-center h-[42px] text-lg font-mono font-bold"
            />
        </div>
    );
}
