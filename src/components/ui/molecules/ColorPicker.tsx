import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { PRESET_COLORS } from '../../../constants/common';
import { resolveEntityColor, isDefaultEntityColor } from '../../../utils/entityColor';

interface ColorPickerProps {
    color: string;
    onChange: (color: string) => void;
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
    className?: string; // Additional classes for the trigger button
    width?: string; // Width of the trigger
    height?: string; // Height of the trigger
}

export function ColorPicker({
    color,
    onChange,
    align = 'start',
    sideOffset = 5,
    className = '',
    width = 'w-full',
    height = 'h-[42px]'
}: ColorPickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
            <Popover.Trigger asChild>
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className={`${height} ${width} ${isOpen ? 'bg-sub' : 'bg-sub-alt'} rounded-lg border border-transparent hover:bg-sub focus:border-white/5 transition-colors flex items-center justify-center relative cursor-pointer ${className}`}
                >
                    <div
                        className="w-5 h-5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.3)] transition-transform duration-200 active:scale-90"
                        style={{ backgroundColor: resolveEntityColor(color) }}
                    />
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    className="z-[100] p-2 bg-sub-alt border border-white/10 rounded-xl shadow-2xl flex flex-col gap-2 min-w-[124px] animate-in fade-in zoom-in-95 duration-200"
                    sideOffset={sideOffset}
                    align={align}
                >
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[9px] font-mono text-sub uppercase">Color</span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                            }}
                            className="text-sub hover:text-text-primary transition-colors cursor-pointer"
                        >
                            <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                        </button>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                        {PRESET_COLORS.map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => {
                                    onChange(c);
                                    setIsOpen(false);
                                }}
                                className={`w-5 h-5 rounded-full transition-transform hover:scale-125 hover:ring-2 hover:ring-white/30 cursor-pointer ${color === c ? 'ring-2 ring-white/50' : ''}`}
                                title={isDefaultEntityColor(c) ? 'Theme accent' : undefined}
                                style={{ backgroundColor: resolveEntityColor(c) }}
                            />
                        ))}
                    </div>
                    <Popover.Arrow className="fill-current text-white/10" />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
