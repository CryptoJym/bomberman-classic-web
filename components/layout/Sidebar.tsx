'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

export interface SidebarProps {
  /** Sidebar children */
  children: React.ReactNode;
  /** Sidebar position */
  position?: 'left' | 'right';
  /** Width of the sidebar */
  width?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether the sidebar is collapsible */
  collapsible?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
  /** Controlled collapsed state */
  collapsed?: boolean;
  /** Callback when collapsed state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Whether to show on mobile as overlay */
  mobileOverlay?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Sidebar layout component for game lobbies and navigation
 */
export function Sidebar({
  children,
  position = 'left',
  width = 'md',
  collapsible = false,
  defaultCollapsed = false,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  mobileOverlay = true,
  className,
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const isCollapsed = controlledCollapsed ?? internalCollapsed;

  const handleToggle = () => {
    const newState = !isCollapsed;
    setInternalCollapsed(newState);
    onCollapsedChange?.(newState);
  };

  const widthStyles = {
    sm: isCollapsed ? 'w-12' : 'w-48',
    md: isCollapsed ? 'w-14' : 'w-64',
    lg: isCollapsed ? 'w-16' : 'w-80',
    xl: isCollapsed ? 'w-16' : 'w-96',
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOverlay && !isCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={handleToggle}
        />
      )}

      <aside
        className={cn(
          'flex flex-col',
          'bg-retro-navy/95 backdrop-blur-sm',
          // Border based on position
          position === 'left'
            ? 'border-r-2 border-game-wall/50'
            : 'border-l-2 border-game-wall/50',
          // Width transition
          'transition-all duration-200 ease-out',
          widthStyles[width],
          // Mobile positioning
          mobileOverlay && [
            'fixed top-0 bottom-0 z-50',
            position === 'left' ? 'left-0' : 'right-0',
            'md:relative',
            isCollapsed && 'translate-x-0',
            isCollapsed && position === 'left' && '-translate-x-full md:translate-x-0',
            isCollapsed && position === 'right' && 'translate-x-full md:translate-x-0',
          ],
          className
        )}
      >
        {/* Collapse toggle button */}
        {collapsible && (
          <button
            type="button"
            onClick={handleToggle}
            className={cn(
              'absolute top-4 z-10',
              position === 'left' ? '-right-3' : '-left-3',
              'w-6 h-10',
              'flex items-center justify-center',
              'bg-retro-navy border-2 border-game-wall',
              'text-gray-400 hover:text-white',
              'transition-colors duration-150',
              'shadow-[2px_2px_0_0_rgba(0,0,0,0.4)]'
            )}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span
              className={cn(
                'font-pixel text-xs transition-transform duration-200',
                position === 'left' && !isCollapsed && 'rotate-180',
                position === 'right' && isCollapsed && 'rotate-180'
              )}
            >
              {position === 'left' ? '‹' : '›'}
            </span>
          </button>
        )}

        {/* Sidebar content */}
        <div
          className={cn(
            'flex-1 overflow-hidden',
            isCollapsed ? 'opacity-0 md:opacity-100' : 'opacity-100'
          )}
        >
          {children}
        </div>
      </aside>
    </>
  );
}

export interface SidebarHeaderProps {
  /** Header children */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Sidebar header section
 */
export function SidebarHeader({ children, className }: SidebarHeaderProps) {
  return (
    <div
      className={cn(
        'p-4 border-b-2 border-game-wall/30',
        'bg-retro-darker/50',
        className
      )}
    >
      {children}
    </div>
  );
}

export interface SidebarContentProps {
  /** Content children */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Sidebar main content area
 */
export function SidebarContent({ children, className }: SidebarContentProps) {
  return (
    <div className={cn('flex-1 overflow-y-auto p-4', className)}>
      {children}
    </div>
  );
}

export interface SidebarFooterProps {
  /** Footer children */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Sidebar footer section
 */
export function SidebarFooter({ children, className }: SidebarFooterProps) {
  return (
    <div
      className={cn(
        'p-4 border-t-2 border-game-wall/30',
        'bg-retro-darker/50',
        className
      )}
    >
      {children}
    </div>
  );
}

export interface SidebarNavProps {
  /** Navigation children */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Sidebar navigation list
 */
export function SidebarNav({ children, className }: SidebarNavProps) {
  return (
    <nav className={cn('flex flex-col gap-1', className)}>{children}</nav>
  );
}

export interface SidebarNavItemProps {
  /** Item children/label */
  children: React.ReactNode;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Whether the item is active */
  active?: boolean;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Sidebar navigation item
 */
export function SidebarNavItem({
  children,
  icon,
  active,
  disabled,
  onClick,
  className,
}: SidebarNavItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2',
        'font-retro text-sm text-left',
        'transition-all duration-150',
        'border-2 border-transparent',
        active
          ? cn(
              'bg-bomber-blue/20 text-bomber-yellow',
              'border-bomber-blue/50',
              'shadow-[inset_2px_2px_4px_rgba(0,130,200,0.2)]'
            )
          : cn(
              'text-gray-300',
              'hover:bg-game-wall/20 hover:text-white hover:border-game-wall/30'
            ),
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {icon && <span className="flex-shrink-0 w-5 h-5">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  );
}

export interface SidebarSectionProps {
  /** Section title */
  title?: string;
  /** Section children */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Sidebar section with optional title
 */
export function SidebarSection({ title, children, className }: SidebarSectionProps) {
  return (
    <div className={cn('mb-4', className)}>
      {title && (
        <h3 className="px-3 mb-2 font-pixel text-[10px] uppercase tracking-wider text-gray-500">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
