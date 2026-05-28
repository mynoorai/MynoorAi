// Design System Utilities - Helper functions for applying design tokens

import { tokens } from './tokens';
import type {
  SpacingProps,
  TypographyProps,
  LayoutProps,
  BorderProps,
  EffectProps,
  StyleProps,
  Color,
  Size,
  Variant,
  ResponsiveValue,
} from './types';

// Breakpoint utilities
export const breakpoints = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// Get current breakpoint
export const getCurrentBreakpoint = (): keyof typeof breakpoints => {
  const width = window.innerWidth;

  if (width < breakpoints.sm) return 'xs';
  if (width < breakpoints.md) return 'sm';
  if (width < breakpoints.lg) return 'md';
  if (width < breakpoints.xl) return 'lg';
  if (width < breakpoints['2xl']) return 'xl';
  return '2xl';
};

// Handle responsive values
export const getResponsiveValue = <T>(
  value: ResponsiveValue<T> | undefined,
  defaultValue?: T,
): T | undefined => {
  if (value === undefined) return defaultValue;

  // If not an object, return as is
  if (typeof value !== 'object' || value === null) return value as T;

  // Get current breakpoint and find appropriate value
  const currentBreakpoint = getCurrentBreakpoint();
  const breakpointKeys = Object.keys(breakpoints) as Array<keyof typeof breakpoints>;
  const currentIndex = breakpointKeys.indexOf(currentBreakpoint);

  // Look for value at current breakpoint or lower
  for (let i = currentIndex; i >= 0; i--) {
    const breakpoint = breakpointKeys[i];
    if (breakpoint in value && value[breakpoint] !== undefined) {
      return value[breakpoint];
    }
  }

  return defaultValue;
};

// Spacing utilities
export const getSpacingValue = (
  value: keyof typeof tokens.spacing | 'auto' | undefined,
): string | undefined => {
  if (!value) return undefined;
  if (value === 'auto') return 'auto';
  return tokens.spacing[value];
};

export const generateSpacingClasses = (props: SpacingProps): string[] => {
  const classes: string[] = [];

  // Padding
  if (props.p) classes.push(`p-${props.p}`);
  if (props.px) classes.push(`px-${props.px}`);
  if (props.py) classes.push(`py-${props.py}`);
  if (props.pt) classes.push(`pt-${props.pt}`);
  if (props.pr) classes.push(`pr-${props.pr}`);
  if (props.pb) classes.push(`pb-${props.pb}`);
  if (props.pl) classes.push(`pl-${props.pl}`);

  // Margin
  if (props.m) classes.push(`m-${props.m}`);
  if (props.mx) classes.push(`mx-${props.mx}`);
  if (props.my) classes.push(`my-${props.my}`);
  if (props.mt) classes.push(`mt-${props.mt}`);
  if (props.mr) classes.push(`mr-${props.mr}`);
  if (props.mb) classes.push(`mb-${props.mb}`);
  if (props.ml) classes.push(`ml-${props.ml}`);

  // Gap
  if (props.gap) classes.push(`gap-${props.gap}`);
  if (props.gapX) classes.push(`gap-x-${props.gapX}`);
  if (props.gapY) classes.push(`gap-y-${props.gapY}`);

  return classes;
};

// Typography utilities
export const generateTypographyClasses = (props: TypographyProps): string[] => {
  const classes: string[] = [];

  if (props.fontSize) classes.push(`text-${props.fontSize}`);
  if (props.fontWeight) classes.push(`font-${props.fontWeight}`);
  if (props.textAlign) classes.push(`text-${props.textAlign}`);
  if (props.textColor) classes.push(`text-${props.textColor}`);

  return classes;
};

// Color utilities
export const getColorValue = (color: Color, shade: number = 400): string => {
  if (color === 'gray') return tokens.colors.gray[shade as keyof typeof tokens.colors.gray];
  return (
    tokens.colors[color][shade as keyof typeof tokens.colors.primary] ||
    tokens.colors[color].DEFAULT ||
    tokens.colors[color][500]
  );
};

// Size mapping utilities
export const sizeMap = {
  xs: { padding: '2 3', text: 'xs', height: '8' },
  sm: { padding: '2 4', text: 'sm', height: '10' },
  md: { padding: '3 6', text: 'base', height: '12' },
  lg: { padding: '4 8', text: 'lg', height: '14' },
  xl: { padding: '5 10', text: 'xl', height: '16' },
} as const;

// Variant utilities
export const getVariantClasses = (variant: Variant, color: Color): string[] => {
  const classes: string[] = [];

  switch (variant) {
    case 'solid':
      classes.push(`bg-${color}`, 'text-white', `hover:bg-${color}-600`, `focus:ring-${color}-500`);
      break;
    case 'outline':
      classes.push(
        'bg-transparent',
        `text-${color}`,
        `border-2 border-${color}`,
        `hover:bg-${color}-50`,
        `focus:ring-${color}-500`,
      );
      break;
    case 'ghost':
      classes.push(
        'bg-transparent',
        `text-${color}`,
        `hover:bg-${color}-50`,
        `focus:ring-${color}-500`,
      );
      break;
    case 'soft':
      classes.push(
        `bg-${color}-100`,
        `text-${color}-700`,
        `hover:bg-${color}-200`,
        `focus:ring-${color}-500`,
      );
      break;
  }

  return classes;
};

// Border utilities
export const generateBorderClasses = (props: BorderProps): string[] => {
  const classes: string[] = [];

  if (props.border)
    classes.push(`border${typeof props.border === 'number' ? `-${props.border}` : ''}`);
  if (props.borderTop)
    classes.push(`border-t${typeof props.borderTop === 'number' ? `-${props.borderTop}` : ''}`);
  if (props.borderRight)
    classes.push(`border-r${typeof props.borderRight === 'number' ? `-${props.borderRight}` : ''}`);
  if (props.borderBottom)
    classes.push(
      `border-b${typeof props.borderBottom === 'number' ? `-${props.borderBottom}` : ''}`,
    );
  if (props.borderLeft)
    classes.push(`border-l${typeof props.borderLeft === 'number' ? `-${props.borderLeft}` : ''}`);

  if (props.borderColor) classes.push(`border-${props.borderColor}`);
  if (props.borderRadius)
    classes.push(`rounded${props.borderRadius !== 'md' ? `-${props.borderRadius}` : ''}`);
  if (props.borderStyle && props.borderStyle !== 'solid')
    classes.push(`border-${props.borderStyle}`);

  return classes;
};

// Effect utilities
export const generateEffectClasses = (props: EffectProps): string[] => {
  const classes: string[] = [];

  if (props.shadow) classes.push(`shadow${props.shadow !== 'md' ? `-${props.shadow}` : ''}`);
  if (props.opacity !== undefined) classes.push(`opacity-${Math.round(props.opacity * 100)}`);
  if (props.cursor) classes.push(`cursor-${props.cursor}`);
  if (props.transition) classes.push('transition-all duration-normal');
  if (props.zIndex !== undefined) classes.push(`z-${props.zIndex}`);

  return classes;
};

// Layout utilities
export const generateLayoutClasses = (props: LayoutProps): string[] => {
  const classes: string[] = [];

  if (props.display) {
    if (props.display === 'flex') classes.push('flex');
    else if (props.display === 'inline-flex') classes.push('inline-flex');
    else if (props.display === 'grid') classes.push('grid');
    else if (props.display === 'block') classes.push('block');
    else if (props.display === 'inline-block') classes.push('inline-block');
    else if (props.display === 'none') classes.push('hidden');
  }

  if (props.position) classes.push(props.position);
  if (props.overflow) classes.push(`overflow-${props.overflow}`);

  // Width/Height (you might want to handle these differently based on your needs)
  if (props.width === 'full') classes.push('w-full');
  if (props.height === 'full') classes.push('h-full');
  if (props.maxWidth === 'full') classes.push('max-w-full');
  if (props.maxHeight === 'full') classes.push('max-h-full');

  return classes;
};

// Main utility to generate all classes from props
export const generateClasses = (props: StyleProps): string[] => {
  return [
    ...generateSpacingClasses(props),
    ...generateTypographyClasses(props),
    ...generateLayoutClasses(props),
    ...generateBorderClasses(props),
    ...generateEffectClasses(props),
  ];
};

// CSS-in-JS style generation
export const generateStyles = (props: StyleProps): React.CSSProperties => {
  const styles: React.CSSProperties = {};

  // Spacing
  if (props.p) styles.padding = getSpacingValue(props.p);
  if (props.px) {
    styles.paddingLeft = getSpacingValue(props.px);
    styles.paddingRight = getSpacingValue(props.px);
  }
  if (props.py) {
    styles.paddingTop = getSpacingValue(props.py);
    styles.paddingBottom = getSpacingValue(props.py);
  }
  if (props.pt) styles.paddingTop = getSpacingValue(props.pt);
  if (props.pr) styles.paddingRight = getSpacingValue(props.pr);
  if (props.pb) styles.paddingBottom = getSpacingValue(props.pb);
  if (props.pl) styles.paddingLeft = getSpacingValue(props.pl);

  if (props.m) styles.margin = getSpacingValue(props.m);
  if (props.mx) {
    styles.marginLeft = getSpacingValue(props.mx);
    styles.marginRight = getSpacingValue(props.mx);
  }
  if (props.my) {
    styles.marginTop = getSpacingValue(props.my);
    styles.marginBottom = getSpacingValue(props.my);
  }
  if (props.mt) styles.marginTop = getSpacingValue(props.mt);
  if (props.mr) styles.marginRight = getSpacingValue(props.mr);
  if (props.mb) styles.marginBottom = getSpacingValue(props.mb);
  if (props.ml) styles.marginLeft = getSpacingValue(props.ml);

  if (props.gap) styles.gap = getSpacingValue(props.gap);

  // Typography
  if (props.fontSize) {
    const fontSize = tokens.typography.fontSize[props.fontSize];
    if (Array.isArray(fontSize)) {
      styles.fontSize = fontSize[0];
      if (fontSize[1]?.lineHeight) styles.lineHeight = fontSize[1].lineHeight;
    }
  }
  if (props.fontWeight) styles.fontWeight = tokens.typography.fontWeight[props.fontWeight];
  if (props.textAlign) styles.textAlign = props.textAlign;
  if (props.textColor) {
    styles.color =
      props.textColor === 'inherit' || props.textColor === 'current'
        ? props.textColor
        : getColorValue(props.textColor as Color);
  }

  // Layout
  if (props.display) styles.display = props.display as any;
  if (props.position) styles.position = props.position as any;
  if (props.width) styles.width = props.width;
  if (props.height) styles.height = props.height;
  if (props.maxWidth) styles.maxWidth = props.maxWidth;
  if (props.maxHeight) styles.maxHeight = props.maxHeight;
  if (props.minWidth) styles.minWidth = props.minWidth;
  if (props.minHeight) styles.minHeight = props.minHeight;
  if (props.overflow) styles.overflow = props.overflow as any;

  // Border
  if (props.borderRadius) {
    styles.borderRadius = tokens.borders.radius[props.borderRadius];
  }

  // Effects
  if (props.shadow) {
    styles.boxShadow = tokens.shadows[props.shadow];
  }
  if (props.opacity !== undefined) styles.opacity = props.opacity;
  if (props.cursor) styles.cursor = props.cursor as any;
  if (props.transform) styles.transform = props.transform;
  if (props.zIndex !== undefined) styles.zIndex = props.zIndex;
  if (props.transition) {
    styles.transition = 'all 300ms cubic-bezier(0.645, 0.045, 0.355, 1)';
  }

  return styles;
};

// Merge classes utility (similar to clsx) — accepts nested arrays
type ClassValue = string | undefined | null | false | ClassValue[];

export const cx = (...classes: ClassValue[]): string => {
  return (classes as unknown[]).flat(Infinity).filter(Boolean).join(' ');
};

// Create consistent component class names
export const createComponentClasses = (
  componentName: string,
  props: StyleProps & { variant?: Variant; size?: Size; color?: Color },
  additionalClasses?: string[],
): string => {
  const baseClasses = [`ds-${componentName}`];

  // Add variant and size classes
  if (props.variant) baseClasses.push(`ds-${componentName}--${props.variant}`);
  if (props.size) baseClasses.push(`ds-${componentName}--${props.size}`);
  if (props.color) baseClasses.push(`ds-${componentName}--${props.color}`);

  // Add generated classes from props
  const generatedClasses = generateClasses(props);

  // Combine all classes
  return cx(...baseClasses, ...generatedClasses, ...(additionalClasses || []));
};
