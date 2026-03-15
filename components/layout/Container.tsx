'use client';

import { cn } from '@/lib/utils/cn';

export interface ContainerProps {
  /** Container children */
  children: React.ReactNode;
  /** Maximum width variant */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Padding variant */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Whether to center the container */
  centered?: boolean;
  /** Additional class names */
  className?: string;
  /** HTML element to render as */
  as?: 'div' | 'main' | 'section' | 'article';
}

/**
 * Responsive container component with max-width constraints
 */
export function Container({
  children,
  maxWidth = 'xl',
  padding = 'md',
  centered = true,
  className,
  as: Component = 'div',
}: ContainerProps) {
  const maxWidthStyles = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full',
  };

  const paddingStyles = {
    none: '',
    sm: 'px-2 sm:px-4',
    md: 'px-4 sm:px-6 lg:px-8',
    lg: 'px-6 sm:px-8 lg:px-12',
  };

  return (
    <Component
      className={cn(
        'w-full',
        maxWidthStyles[maxWidth],
        paddingStyles[padding],
        centered && 'mx-auto',
        className
      )}
    >
      {children}
    </Component>
  );
}

export interface PageContainerProps {
  /** Page children */
  children: React.ReactNode;
  /** Page title */
  title?: string;
  /** Page subtitle/description */
  subtitle?: string;
  /** Actions to display in header */
  actions?: React.ReactNode;
  /** Whether to show background pattern */
  showPattern?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Full page container with optional header and background
 */
export function PageContainer({
  children,
  title,
  subtitle,
  actions,
  showPattern = true,
  className,
}: PageContainerProps) {
  return (
    <main
      className={cn(
        'min-h-screen w-full',
        'bg-retro-dark',
        showPattern && 'bg-grid-pattern bg-grid',
        className
      )}
    >
      {/* Scanline overlay for CRT effect */}
      {showPattern && (
        <div className="pointer-events-none fixed inset-0 bg-scanlines opacity-[0.02] z-[1]" />
      )}

      <Container className="relative z-10 py-6 sm:py-8">
        {/* Page header */}
        {(title || actions) && (
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {title && (
                <h1 className="font-pixel text-lg sm:text-xl text-bomber-yellow uppercase tracking-wider">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="font-retro text-sm text-gray-400 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        )}

        {/* Page content */}
        {children}
      </Container>
    </main>
  );
}

export interface SectionProps {
  /** Section children */
  children: React.ReactNode;
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Actions to display in header */
  actions?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Content section with optional header
 */
export function Section({
  children,
  title,
  description,
  actions,
  className,
}: SectionProps) {
  return (
    <section className={cn('mb-8', className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between">
          <div>
            {title && (
              <h2 className="font-pixel text-sm text-bomber-yellow uppercase tracking-wider">
                {title}
              </h2>
            )}
            {description && (
              <p className="font-retro text-xs text-gray-400 mt-1">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export interface GridProps {
  /** Grid children */
  children: React.ReactNode;
  /** Number of columns */
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Gap between items */
  gap?: 'none' | 'sm' | 'md' | 'lg';
  /** Additional class names */
  className?: string;
}

/**
 * Responsive grid layout
 */
export function Grid({ children, cols = 3, gap = 'md', className }: GridProps) {
  const colStyles = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  };

  const gapStyles = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div className={cn('grid', colStyles[cols], gapStyles[gap], className)}>
      {children}
    </div>
  );
}

export interface StackProps {
  /** Stack children */
  children: React.ReactNode;
  /** Direction */
  direction?: 'horizontal' | 'vertical';
  /** Gap between items */
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  /** Alignment */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** Justification */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  /** Whether to wrap */
  wrap?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Flexbox stack layout
 */
export function Stack({
  children,
  direction = 'vertical',
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className,
}: StackProps) {
  const gapStyles = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const alignStyles = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  const justifyStyles = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  };

  return (
    <div
      className={cn(
        'flex',
        direction === 'horizontal' ? 'flex-row' : 'flex-col',
        gapStyles[gap],
        alignStyles[align],
        justifyStyles[justify],
        wrap && 'flex-wrap',
        className
      )}
    >
      {children}
    </div>
  );
}
