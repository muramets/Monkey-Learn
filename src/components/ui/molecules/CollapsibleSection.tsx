import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface CollapsibleSectionProps {
    title: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
    trailing?: React.ReactNode;
    className?: string;
    variant?: 'default' | 'mini';
    isOpen?: boolean;
    onToggle?: () => void;
    icon?: IconDefinition;
    /** Anchor for onboarding tours (rendered as data-tour on the root). */
    'data-tour'?: string;
}

export function CollapsibleSection({
    title,
    children,
    defaultOpen = true,
    trailing,
    dragHandle,
    className = '',
    variant = 'default',
    isOpen: controlledIsOpen,
    onToggle,
    icon,
    'data-tour': dataTour
}: CollapsibleSectionProps & { dragHandle?: React.ReactNode }) {
    const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
    const [isOverflowVisible, setOverflowVisible] = useState(defaultOpen);

    const isMini = variant === 'mini';
    const headerClass = isMini
        ? "text-xs font-bold text-sub hover:text-text-primary uppercase tracking-widest"
        : "text-2xl font-bold text-sub hover:text-text-primary lowercase";

    const iconClass = isMini ? "text-[10px]" : "text-xl";
    const gapClass = isMini ? "gap-2" : "gap-3";
    const mbClass = isMini ? "mb-2" : "mb-4";

    const isSectionOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

    React.useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (isSectionOpen) {
            timer = setTimeout(() => setOverflowVisible(true), 300);
        } else {
            setOverflowVisible(false);
        }
        return () => clearTimeout(timer);
    }, [isSectionOpen]);

    const handleToggle = () => {
        if (onToggle) {
            onToggle();
        } else {
            setInternalIsOpen(!internalIsOpen);
        }
    };

    return (
        <div className={`w-full ${className}`} data-tour={dataTour}>
            <div className={`flex items-center ${mbClass} group`}>
                {dragHandle && (
                    <div className="mr-2">
                        {dragHandle}
                    </div>
                )}
                <div className="flex-grow flex items-center justify-between">
                    <button
                        onClick={handleToggle}
                        className={`flex items-center ${gapClass} ${headerClass} transition-colors duration-200 outline-none`}
                        aria-expanded={isSectionOpen}
                    >
                        <div className={`transition-transform duration-200 ${isSectionOpen ? '' : '-rotate-90'}`}>
                            <FontAwesomeIcon icon={faChevronDown} className={iconClass} />
                        </div>
                        {icon && <FontAwesomeIcon icon={icon} className={iconClass} />}
                        <span>{title}</span>
                    </button>

                    {trailing && (
                        <div className="flex items-center">
                            {trailing}
                        </div>
                    )}
                </div>
            </div>

            <div
                className={`
                    grid transition-[grid-template-rows,opacity] duration-300 ease-in-out
                    ${isSectionOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
                    ${isOverflowVisible ? 'overflow-visible' : 'overflow-hidden'}
                `}
            >
                <div className={`${isMini ? "py-0" : "py-1"} min-h-0`}>
                    {children}
                </div>
            </div>
        </div>
    );
}
