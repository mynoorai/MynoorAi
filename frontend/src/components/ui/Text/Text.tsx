import { forwardRef, memo } from 'react';
import { cx, generateStyles, type TextBaseProps } from '@/design-system';
import { cn } from '@/utils/cn';

export interface TextProps
  extends TextBaseProps, Omit<React.HTMLAttributes<HTMLElement>, keyof TextBaseProps> {
  as?: keyof JSX.IntrinsicElements;
}

const TextComponent = forwardRef<HTMLElement, TextProps>(
  (
    {
      // Text specific props
      as,
      variant = 'body',
      color = 'inherit',
      weight,
      align,
      truncate = false,
      clamp,
      children,

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
      opacity,

      // HTML props
      className,
      style,
      ...props
    },
    ref,
  ) => {
    // Determine the element to render
    const Element =
      as || (variant.startsWith('h') ? (variant as keyof JSX.IntrinsicElements) : 'p');

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
      fontSize,
      fontWeight: fontWeight || weight,
      textAlign: textAlign || align,
      textColor: textColor || color,
      display,
      opacity,
    });

    // Base text classes
    const baseClasses = cx(
      // Reset
      'm-0',

      // Variant classes
      variant === 'h1' && 'text-h1',
      variant === 'h2' && 'text-h2',
      variant === 'h3' && 'text-h3',
      variant === 'h4' && 'text-h4',
      variant === 'h5' && 'text-h5',
      variant === 'h6' && 'text-h6',
      variant === 'body' && 'text-base',
      variant === 'body-lg' && 'text-body-lg',
      variant === 'body-sm' && 'text-body-sm',
      variant === 'caption' && 'text-xs',

      // Color classes
      color === 'primary' && 'text-primary-400',
      color === 'secondary' && 'text-secondary-400',
      color === 'success' && 'text-success-500',
      color === 'warning' && 'text-warning-500',
      color === 'error' && 'text-error-500',
      color === 'info' && 'text-info-500',
      color === 'gray' && 'text-gray-600',
      color === 'inherit' && 'text-inherit',
      color === 'current' && 'text-current',

      // Weight classes (if not set by variant)
      weight === 'thin' && 'font-thin',
      weight === 'extralight' && 'font-extralight',
      weight === 'light' && 'font-light',
      weight === 'normal' && 'font-normal',
      weight === 'medium' && 'font-medium',
      weight === 'semibold' && 'font-semibold',
      weight === 'bold' && 'font-bold',
      weight === 'extrabold' && 'font-extrabold',
      weight === 'black' && 'font-black',

      // Alignment classes
      align === 'left' && 'text-left',
      align === 'center' && 'text-center',
      align === 'right' && 'text-right',
      align === 'justify' && 'text-justify',

      // Truncate classes
      truncate && 'truncate',

      // Line clamp classes
      clamp === 1 && 'line-clamp-1',
      clamp === 2 && 'line-clamp-2',
      clamp === 3 && 'line-clamp-3',
      clamp === 4 && 'line-clamp-4',
      clamp === 5 && 'line-clamp-5',
      clamp === 6 && 'line-clamp-6',
    );

    return (
      <Element
        ref={ref as any}
        className={cn(baseClasses, className)}
        style={{
          ...designSystemStyles,
          ...style,
        }}
        {...props}
      >
        {children}
      </Element>
    );
  },
);

TextComponent.displayName = 'Text';

// Memoize Text component
export const Text = memo(TextComponent);
