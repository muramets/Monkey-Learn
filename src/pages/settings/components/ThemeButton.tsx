import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as faStarSolid } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons';
import type { Theme } from '../../../utils/themeManager';

interface ThemeButtonProps {
    theme: Theme;
    isActive: boolean;
    isFavorite: boolean;
    onClick: (themeName: string) => void;
    onToggleFavorite: (themeName: string) => void;
}

export function ThemeButton({ theme, isActive, isFavorite, onClick, onToggleFavorite }: ThemeButtonProps) {
    return (
        <button
            onClick={() => onClick(theme.name)}
            className={`
                group relative grid grid-cols-[1fr_auto_1fr] items-center gap-2
                px-3 py-2 rounded-lg transition-[transform,box-shadow] duration-150 ease-out
                hover:scale-110 hover:z-10
                ${isActive ? 'scale-110 z-10' : ''}
            `}
            style={{
                backgroundColor: theme.bgColor,
                color: theme.mainColor,
                boxShadow: isActive ? `0 0 0 0.2em ${theme.mainColor}` : 'none'
            }}
        >
            {/* Favorite Button */}
            <div
                className={`
                    cursor-pointer transition-opacity duration-200 justify-self-start
                    ${isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                `}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(theme.name);
                }}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
                <FontAwesomeIcon icon={isFavorite ? faStarSolid : faStarRegular} className="text-[14px]" />
            </div>

            {/* Theme Name */}
            <span className={`text-[13px] font-mono truncate text-center w-full ${isActive ? 'font-bold' : ''}`}>
                {theme.name.replace(/_/g, ' ')}
            </span>

            {/* Color Bubbles Preview */}
            <div className={`
                justify-self-end flex items-center gap-1.5 shrink-0 transition-opacity duration-200
                ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
            `}>
                {/* Main Color Bubble */}
                <div
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: theme.mainColor }}
                    title="Main"
                />
                {/* Sub Color Bubble */}
                <div
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: theme.subColor }}
                    title="Sub"
                />
                {/* Text Color Bubble */}
                <div
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: theme.textColor }}
                    title="Text"
                />
            </div>
        </button>
    );
}
