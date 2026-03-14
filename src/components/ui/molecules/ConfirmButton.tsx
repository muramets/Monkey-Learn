import { useState, useEffect, useRef } from 'react';
import { Button } from '../atoms/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import type { ComponentProps } from 'react';

// Omit onClick from Button props since we handle it internally and expose onConfirm
interface ConfirmButtonProps extends Omit<ComponentProps<typeof Button>, 'onClick'> {
    onConfirm: () => void;
    confirmText?: string;
    defaultText?: string;
    confirmIcon?: React.ReactNode;
    defaultIcon?: React.ReactNode;
    timeoutDuration?: number;
}

export function ConfirmButton({
    onConfirm,
    confirmText = 'Are you sure?',
    defaultText = 'Delete',
    confirmIcon = <FontAwesomeIcon icon={faExclamationTriangle} />,
    defaultIcon = <FontAwesomeIcon icon={faTrash} />,
    timeoutDuration = 3000,
    disabled,
    ...props
}: ConfirmButtonProps) {
    const [isConfirming, setIsConfirming] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const handleClick = () => {
        if (isConfirming) {
            // Second click: Confirm action
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            setIsConfirming(false);
            onConfirm();
        } else {
            // First click: Enter confirmation state
            setIsConfirming(true);
            timeoutRef.current = setTimeout(() => {
                setIsConfirming(false);
            }, timeoutDuration);
        }
    };

    return (
        <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleClick}
            disabled={disabled}
            leftIcon={isConfirming ? confirmIcon : defaultIcon}
            // Merge default className with any passed className, defaulting to the style used in modals
            className={`transition-colors duration-200 ${props.className || 'text-[10px] uppercase tracking-wider font-bold px-3 py-2'}`}
            data-confirming={isConfirming}
            {...props}
        >
            {isConfirming ? confirmText : defaultText}
        </Button>
    );
}
