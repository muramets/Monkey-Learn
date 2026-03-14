import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faExclamationCircle, faTimes } from '@fortawesome/free-solid-svg-icons';

interface ToastProps {
    message: string;
    isVisible: boolean;
    duration?: number;
    onClose: () => void;
    type?: 'success' | 'error';
    actionLabel?: string;
    onAction?: () => void;
}

export function Toast({
    message,
    isVisible,
    duration = 5000,
    onClose,
    type = 'success',
    actionLabel,
    onAction,
}: ToastProps) {
    // Increase duration if action button present
    const effectiveDuration = actionLabel && onAction ? 7000 : duration;
    const [shouldRender, setShouldRender] = useState(false);
    const [animationClass, setAnimationClass] = useState('');

    // Handle global Enter key for action
    useEffect(() => {
        if (!isVisible || !onAction || !actionLabel) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onAction();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, onAction, actionLabel, onClose]);

    useEffect(() => {
        if (isVisible) {
            setTimeout(() => {
                setShouldRender(true);
                setAnimationClass('animate-fade-in-up');
            }, 0);

            const timer = setTimeout(() => {
                onClose();
            }, effectiveDuration);
            return () => clearTimeout(timer);
        } else if (shouldRender) {
            setTimeout(() => setAnimationClass('animate-fade-out-down'), 0);
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isVisible, effectiveDuration, onClose, shouldRender]);

    if (!shouldRender) return null;

    const bgColor = type === 'success' ? 'bg-correct' : 'bg-error';
    const icon = type === 'success' ? faCheckCircle : faExclamationCircle;

    // Determine if toast should be clickable
    const isClickable = actionLabel && onAction;
    const handleToastClick = () => {
        if (onAction) {
            onAction();
            onClose();
        }
    };

    return createPortal(
        <div
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[20000]"
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className={`${bgColor} text-bg-primary pl-4 pr-3 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] ${animationClass} ${isClickable ? 'cursor-pointer hover:brightness-110 transition-[filter]' : ''}`}
                onClick={isClickable ? handleToastClick : undefined}
            >
                <FontAwesomeIcon icon={icon} className="text-bg-primary flex-shrink-0" />
                <span className="text-sm font-medium font-mono flex-grow">{message}</span>

                {actionLabel && onAction && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleToastClick();
                        }}
                        className="bg-bg-primary/20 hover:bg-bg-primary/30 text-bg-primary font-mono text-xs px-3 py-1 rounded transition-colors font-bold uppercase tracking-wide"
                    >
                        {actionLabel}
                    </button>
                )}

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="bg-transparent border-none text-bg-primary/80 hover:text-bg-primary cursor-pointer p-1 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
                >
                    <FontAwesomeIcon icon={faTimes} className="text-sm" />
                </button>
            </div>
        </div>,
        document.body
    );
}
