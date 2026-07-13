interface ProgressBarProps {
    current: number;
    max: number;
    colorClass?: string;
    customColor?: string; // Any CSS color (hex, var(), color-mix)
    className?: string;
    heightClass?: string;
    trackColorClass?: string;
}

export function ProgressBar({
    current,
    max,
    colorClass = 'bg-main',
    customColor,
    className = '',
    heightClass = 'h-2',
    trackColorClass = 'bg-sub-alt'
}: ProgressBarProps) {
    const percentage = Math.min(Math.max((current / max) * 100, 0), 100);

    return (
        <div className={`w-full rounded-full overflow-hidden ${trackColorClass} ${heightClass} ${className}`}>
            <div
                className={`h-full transition-[width,background-color,box-shadow] duration-500 ease-out rounded-full ${!customColor ? colorClass : ''}`}
                style={{
                    width: `${percentage}%`,
                    ...(customColor ? {
                        backgroundColor: customColor,
                        boxShadow: `0 0 8px color-mix(in srgb, ${customColor} 38%, transparent)`
                    } : {})
                }}
            />
        </div>
    );
}
