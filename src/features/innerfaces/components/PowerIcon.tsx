import { AppIcon } from '../../../components/ui/atoms/AppIcon';
import type { PowerCategory } from '../types';

interface PowerIconProps {
    icon: string;
    color: string | undefined;
    category: PowerCategory | string | null | undefined; // Handle both strict type and string from forms
    size?: string; // Tailwind class like "w-10 h-10" or "w-12 h-12"
    className?: string; // Additional classes for positioning or margin
    glowSize?: string; // Custom glow size, defaults to 15px
}

export function PowerIcon({
    icon,
    color,
    category,
    size = 'w-10 h-10',
    className = '',
    glowSize = '15px'
}: PowerIconProps) {
    const shapeClass = category === 'foundation'
        ? 'rounded-[30%_70%_70%_30%/30%_30%_70%_70%]' // Squircle for Foundations
        : category === 'skill'
            ? 'rounded-[50%]' // Circle for Skills
            : 'rounded-[20%]'; // Rounded square for Uncategorized

    return (
        <div
            className={`relative flex items-center justify-center text-lg shrink-0 transition-[box-shadow] duration-300 bg-sub-alt overflow-hidden ${size} ${shapeClass} ${className}`}
            style={{
                boxShadow: `0 0 ${glowSize} color-mix(in srgb, ${color || '#ffffff'} 8%, transparent)`
            }}
        >
            {/* Colored overlay */}
            <div
                className="absolute inset-0 transition-colors duration-300"
                style={{
                    backgroundColor: `color-mix(in srgb, ${color || '#ffffff'} 20%, transparent)`
                }}
            />
            {/* Icon */}
            <div
                className="relative z-10 transition-colors duration-300"
                style={{ color: color || '#ffffff' }}
            >
                <AppIcon id={icon} />
            </div>
        </div>
    );
}
