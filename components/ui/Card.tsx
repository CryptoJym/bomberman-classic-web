'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual variant */
  variant?: 'default' | 'glow' | 'interactive' | 'elevated';
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Whether to show hover effect */
  hoverable?: boolean;
}

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;
export type CardContentProps = React.HTMLAttributes<HTMLDivElement>;
export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', hoverable, children, ...props }, ref) => {
    const paddingStyles = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    const variantStyles = {
      default: cn(
        'bg-retro-navy/90 backdrop-blur-sm',
        'border-2 border-t-game-wall/70 border-l-game-wall/70 border-b-game-wall/30 border-r-game-wall/30',
        'shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]'
      ),
      glow: cn(
        'bg-retro-navy/90 backdrop-blur-sm',
        'border-2 border-accent-gold/50',
        'shadow-[0_0_15px_rgba(255,215,0,0.3),4px_4px_0_0_rgba(0,0,0,0.5)]',
        'animate-glow'
      ),
      interactive: cn(
        'bg-retro-navy/90 backdrop-blur-sm',
        'border-2 border-game-wall/50',
        'shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]',
        'cursor-pointer',
        'transition-all duration-150',
        'hover:border-bomber-blue hover:shadow-[2px_2px_0_0_rgba(0,0,0,0.5)] hover:translate-x-0.5 hover:translate-y-0.5',
        'active:shadow-none active:translate-x-1 active:translate-y-1'
      ),
      elevated: cn(
        'bg-gradient-to-b from-retro-navy to-retro-darker',
        'border-2 border-t-game-wall border-l-game-wall border-b-retro-dark border-r-retro-dark',
        'shadow-[6px_6px_0_0_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)]'
      ),
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative',
          variantStyles[variant],
          paddingStyles[padding],
          hoverable && variant !== 'interactive' && 'transition-transform hover:scale-[1.02]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'pb-3 mb-3',
          'border-b-2 border-game-wall/30',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn(
          'font-pixel text-sm uppercase tracking-wider text-bomber-yellow',
          className
        )}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('font-retro text-sm text-gray-400 mt-1', className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('', className)} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'pt-3 mt-3',
          'border-t-2 border-game-wall/30',
          'flex items-center gap-3',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
