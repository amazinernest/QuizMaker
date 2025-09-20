import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md';
    
    const variants = {
      primary: 'bg-primary hover:bg-primary-hover text-text-inverse focus:ring-primary border-0',
      secondary: 'bg-secondary hover:bg-secondary-hover text-text-inverse focus:ring-secondary border-0',
      outline: 'border border-border bg-transparent hover:bg-background-secondary text-text-primary focus:ring-accent hover:border-accent/50',
      ghost: 'bg-transparent hover:bg-background-secondary text-text-primary focus:ring-accent border-0 shadow-none hover:shadow-sm',
      destructive: 'bg-destructive hover:bg-destructive-hover text-text-inverse focus:ring-destructive border-0',
      gradient: 'gradient-primary text-text-inverse focus:ring-accent border-0 hover:opacity-90',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm h-8 min-w-[64px]',
      md: 'px-4 py-2 text-sm h-10 min-w-[80px]',
      lg: 'px-6 py-3 text-base h-12 min-w-[96px]',
      xl: 'px-8 py-4 text-lg h-14 min-w-[112px]',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;