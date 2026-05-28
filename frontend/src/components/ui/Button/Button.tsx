import { forwardRef, memo } from 'react';
import { cx, sizeMap, generateStyles } from '@/design-system';
import { cn } from '@/utils/cn';
import type { ButtonProps } from './Button.types';

const ButtonComponent = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      // Design system props
      variant = 'solid',
      size = 'md',
      color = 'primary',

      // Button specific props
      children,
      loading = false,
      fullWidth = false,
      icon,
      iconPosition = 'left',
      disabled,

      // Style props
      p,
      px,
      py,
      pt,
      pr,
      pb,
      pl,
      m,
      mx,
      my,
      mt,
      mr,
      mb,
      ml,
      gap,
      fontSize,
      fontWeight,
      textAlign,
      textColor,
      display,
      borderRadius = 'lg',
      shadow,
      opacity,
      cursor,
      transition = true,

      // HTML props
      className,
      style,
      ...props
    },
    ref,
  ) => {
    // Generate base styles from design system props
    const designSystemStyles = generateStyles({
      p,
      px,
      py,
      pt,
      pr,
      pb,
      pl,
      m,
      mx,
      my,
      mt,
      mr,
      mb,
      ml,
      gap,
      fontSize: fontSize || (sizeMap[size].text as any),
      fontWeight: fontWeight || 'medium',
      textAlign,
      textColor,
      display: display || 'inline-flex',
      borderRadius,
      shadow: shadow || (variant === 'solid' ? 'sm' : undefined),
      opacity,
      cursor: cursor || (disabled || loading ? 'not-allowed' : 'pointer'),
      transition,
    });

    // Base button classes
    const baseClasses = cx(
      // Layout
      'inline-flex items-center justify-center',

      // Typography
      'font-medium',

      // Border radius (using design tokens)
      borderRadius === 'sm' && 'rounded-sm',
      borderRadius === 'md' && 'rounded-md',
      borderRadius === 'lg' && 'rounded-lg',
      borderRadius === 'xl' && 'rounded-xl',
      borderRadius === 'full' && 'rounded-full',

      // Transitions
      transition && 'transition-all duration-normal',

      // Focus states
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',

      // Disabled states
      'disabled:cursor-not-allowed disabled:opacity-50',

      // Active states
      'active:scale-[0.98]',

      // User select
      'select-none',
    );

    // Variant classes based on design system
    const variantClasses = cx(
      // Solid variant
      variant === 'solid' && [
        color === 'primary' &&
          'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 focus-visible:ring-primary-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95',
        color === 'secondary' &&
          'bg-secondary-400 text-white hover:bg-secondary-600 focus-visible:ring-secondary-400',
        color === 'success' &&
          'bg-success-500 text-white hover:bg-success-600 focus-visible:ring-success-500',
        color === 'warning' &&
          'bg-warning-500 text-white hover:bg-warning-600 focus-visible:ring-warning-500',
        color === 'error' &&
          'bg-error-500 text-white hover:bg-error-600 focus-visible:ring-error-500',
        color === 'info' && 'bg-info-500 text-white hover:bg-info-600 focus-visible:ring-info-500',
        color === 'gray' && 'bg-gray-600 text-white hover:bg-gray-700 focus-visible:ring-gray-600',
      ],

      // Outline variant
      variant === 'outline' && [
        color === 'primary' &&
          'bg-transparent text-primary-600 border-2 border-primary-600 hover:bg-primary-600 hover:text-white focus-visible:ring-primary-600 font-semibold transform hover:-translate-y-0.5 active:scale-95 transition-all duration-200',
        color === 'secondary' &&
          'bg-transparent text-secondary-400 border-2 border-secondary-400 hover:bg-secondary-50 focus-visible:ring-secondary-400',
        color === 'success' &&
          'bg-transparent text-success-500 border-2 border-success-500 hover:bg-success-50 focus-visible:ring-success-500',
        color === 'warning' &&
          'bg-transparent text-warning-500 border-2 border-warning-500 hover:bg-warning-50 focus-visible:ring-warning-500',
        color === 'error' &&
          'bg-transparent text-error-500 border-2 border-error-500 hover:bg-error-50 focus-visible:ring-error-500',
        color === 'info' &&
          'bg-transparent text-info-500 border-2 border-info-500 hover:bg-info-50 focus-visible:ring-info-500',
        color === 'gray' &&
          'bg-transparent text-gray-600 border-2 border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-400',
      ],

      // Ghost variant
      variant === 'ghost' && [
        color === 'primary' &&
          'bg-transparent text-primary-400 hover:bg-primary-50 focus-visible:ring-primary-400',
        color === 'secondary' &&
          'bg-transparent text-secondary-400 hover:bg-secondary-50 focus-visible:ring-secondary-400',
        color === 'success' &&
          'bg-transparent text-success-500 hover:bg-success-50 focus-visible:ring-success-500',
        color === 'warning' &&
          'bg-transparent text-warning-500 hover:bg-warning-50 focus-visible:ring-warning-500',
        color === 'error' &&
          'bg-transparent text-error-500 hover:bg-error-50 focus-visible:ring-error-500',
        color === 'info' &&
          'bg-transparent text-info-500 hover:bg-info-50 focus-visible:ring-info-500',
        color === 'gray' &&
          'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-gray-400',
      ],

      // Soft variant
      variant === 'soft' && [
        color === 'primary' &&
          'bg-primary-100 text-primary-700 hover:bg-primary-200 focus-visible:ring-primary-400',
        color === 'secondary' &&
          'bg-secondary-100 text-secondary-700 hover:bg-secondary-200 focus-visible:ring-secondary-400',
        color === 'success' &&
          'bg-success-100 text-success-700 hover:bg-success-200 focus-visible:ring-success-500',
        color === 'warning' &&
          'bg-warning-100 text-warning-700 hover:bg-warning-200 focus-visible:ring-warning-500',
        color === 'error' &&
          'bg-error-100 text-error-700 hover:bg-error-200 focus-visible:ring-error-500',
        color === 'info' &&
          'bg-info-100 text-info-700 hover:bg-info-200 focus-visible:ring-info-500',
        color === 'gray' &&
          'bg-gray-100 text-gray-700 hover:bg-gray-200 focus-visible:ring-gray-400',
      ],
    );

    // Size classes using design tokens
    const sizeClasses = cx(
      size === 'xs' && 'px-2 py-1 text-xs min-h-[32px]',
      size === 'sm' && 'px-3 py-1.5 text-sm min-h-[36px]',
      size === 'md' && 'px-4 py-2 text-base min-h-[40px]',
      size === 'lg' && 'px-6 py-3 text-lg min-h-[48px]',
      size === 'xl' && 'px-8 py-4 text-xl min-h-[56px]',
    );

    // Width classes
    const widthClasses = fullWidth ? 'w-full' : '';

    // Loading spinner
    const LoadingSpinner = (): JSX.Element => (
      <svg
        className="animate-spin h-4 w-4"
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
    );

    return (
      <button
        ref={ref}
        className={cn(baseClasses, variantClasses, sizeClasses, widthClasses, className)}
        style={{
          ...designSystemStyles,
          ...style,
        }}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className={cn(iconPosition === 'left' ? 'mr-2' : 'order-2 ml-2')}>
            <LoadingSpinner />
          </span>
        )}
        {icon && !loading && (
          <span className={cn('inline-flex', iconPosition === 'left' ? 'mr-2' : 'order-2 ml-2')}>
            {icon}
          </span>
        )}
        <span className="truncate">{children}</span>
      </button>
    );
  },
);

ButtonComponent.displayName = 'Button';

// Memoize Button component
export const Button = memo(ButtonComponent);
