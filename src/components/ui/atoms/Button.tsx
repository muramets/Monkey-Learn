import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'neutral' | 'history';
    size?: 'sm' | 'md' | 'lg' | 'icon' | 'history-icon';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export function Button({
    children,
    className = '',
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    disabled,
    ...props
}: ButtonProps) {

    const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-main text-bg-primary hover:bg-text-primary hover:text-bg-primary active:bg-sub active:text-bg-primary transition-colors duration-150",
        secondary: "bg-sub-alt text-text-primary hover:bg-text-primary hover:text-bg-primary active:bg-sub active:text-bg-primary transition-colors duration-150",
        danger: "bg-error text-bg-primary hover:bg-text-primary hover:text-bg-primary transition-colors duration-150",
        ghost: "bg-transparent text-sub hover:text-text-primary transition-colors duration-150",
        neutral: "bg-sub-alt text-text-primary hover:bg-text-primary hover:text-bg-primary active:bg-sub active:text-bg-primary transition-colors duration-150",
        history: "bg-sub-alt/50 text-sub hover:bg-error/20 hover:text-error transition-[color,background-color,box-shadow,transform] duration-300 shadow-lg hover:rotate-6 active:scale-90",
    };

    const sizes = {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 p-2",
        "history-icon": "h-11 min-w-[44px] p-0 flex-shrink-0 justify-center",
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : leftIcon ? (
                <span className={children ? "mr-2" : ""}>{leftIcon}</span>
            ) : null}

            {children}

            {!isLoading && rightIcon ? (
                <span className="ml-2">{rightIcon}</span>
            ) : null}
        </button>
    );
}
