import React from 'react';

interface ToggleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    active?: boolean;
    icon?: React.ReactNode;
}

/**
 * MonkeyType-style toggleable button: sub-alt surface that inverts on hover
 * and switches to the theme accent while active. Sizing is em-based so it
 * scales with the surrounding font size, matching MonkeyType's account page
 * controls.
 */
export function ToggleButton({
    active = false,
    icon,
    children,
    className = '',
    ...props
}: ToggleButtonProps) {
    const surface = active
        ? 'bg-main text-bg-primary'
        : 'bg-sub-alt text-text-primary';
    return (
        <button
            type="button"
            className={`inline-flex cursor-pointer select-none items-center justify-center gap-[0.5em] rounded p-[0.5em] text-center leading-[1.25] transition-colors duration-125 hover:bg-text-primary hover:text-bg-primary active:bg-sub disabled:pointer-events-none disabled:opacity-[0.33] ${surface} ${className}`}
            {...props}
        >
            {icon}
            {children}
        </button>
    );
}
