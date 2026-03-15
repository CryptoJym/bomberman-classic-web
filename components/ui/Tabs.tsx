'use client';

import { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils/cn';

// Tabs Context
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

export interface TabsProps {
  /** Default active tab */
  defaultValue: string;
  /** Controlled active tab */
  value?: string;
  /** Callback when tab changes */
  onValueChange?: (value: string) => void;
  /** Additional class names */
  className?: string;
  /** Tab children */
  children: React.ReactNode;
}

/**
 * Root tabs container
 */
export function Tabs({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeTab = value ?? internalValue;

  const setActiveTab = (newValue: string) => {
    if (!value) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn('flex flex-col', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps {
  /** Additional class names */
  className?: string;
  /** Tab trigger children */
  children: React.ReactNode;
}

/**
 * Container for tab triggers
 */
export function TabsList({ className, children }: TabsListProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1',
        'p-1',
        'bg-retro-darker',
        'border-2 border-t-gray-700 border-l-gray-700 border-b-game-wall border-r-game-wall',
        'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]',
        className
      )}
      role="tablist"
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps {
  /** Tab value */
  value: string;
  /** Whether the tab is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
  /** Tab trigger content */
  children: React.ReactNode;
}

/**
 * Individual tab trigger button
 */
export function TabsTrigger({ value, disabled, className, children }: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      disabled={disabled}
      aria-selected={isActive}
      onClick={() => !disabled && setActiveTab(value)}
      className={cn(
        'px-4 py-2',
        'font-pixel text-[10px] uppercase tracking-wider',
        'transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-bomber-blue/50 focus:ring-offset-1 focus:ring-offset-retro-darker',
        isActive
          ? cn(
              'bg-retro-navy text-bomber-yellow',
              'border-2 border-t-game-wall border-l-game-wall border-b-retro-dark border-r-retro-dark',
              'shadow-[2px_2px_0_0_rgba(0,0,0,0.4)]',
              '-translate-y-0.5'
            )
          : cn(
              'text-gray-400',
              'hover:text-white hover:bg-game-wall/20',
              'border-2 border-transparent'
            ),
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps {
  /** Tab value this content belongs to */
  value: string;
  /** Additional class names */
  className?: string;
  /** Tab content */
  children: React.ReactNode;
}

/**
 * Tab content panel
 */
export function TabsContent({ value, className, children }: TabsContentProps) {
  const { activeTab } = useTabsContext();

  if (activeTab !== value) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      className={cn(
        'mt-2 p-4',
        'bg-retro-navy/50',
        'border-2 border-game-wall/30',
        'animate-in fade-in-50 duration-200',
        className
      )}
    >
      {children}
    </div>
  );
}

// Vertical Tabs variant
export interface VerticalTabsProps extends TabsProps {
  /** Width of the tab list */
  tabListWidth?: string;
}

export function VerticalTabs({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
}: VerticalTabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeTab = value ?? internalValue;

  const setActiveTab = (newValue: string) => {
    if (!value) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn('flex', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function VerticalTabsList({ className, children }: TabsListProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1',
        'p-1',
        'bg-retro-darker',
        'border-2 border-t-gray-700 border-l-gray-700 border-b-game-wall border-r-game-wall',
        'shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]',
        'min-w-[140px]',
        className
      )}
      role="tablist"
      aria-orientation="vertical"
    >
      {children}
    </div>
  );
}

export function VerticalTabsTrigger({ value, disabled, className, children }: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      disabled={disabled}
      aria-selected={isActive}
      onClick={() => !disabled && setActiveTab(value)}
      className={cn(
        'px-4 py-2 text-left',
        'font-pixel text-[10px] uppercase tracking-wider',
        'transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-bomber-blue/50',
        isActive
          ? cn(
              'bg-retro-navy text-bomber-yellow',
              'border-2 border-t-game-wall border-l-game-wall border-b-retro-dark border-r-retro-dark',
              'shadow-[2px_2px_0_0_rgba(0,0,0,0.4)]',
              'translate-x-0.5'
            )
          : cn(
              'text-gray-400',
              'hover:text-white hover:bg-game-wall/20',
              'border-2 border-transparent'
            ),
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
}

export function VerticalTabsContent({ value, className, children }: TabsContentProps) {
  const { activeTab } = useTabsContext();

  if (activeTab !== value) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      className={cn(
        'flex-1 ml-2 p-4',
        'bg-retro-navy/50',
        'border-2 border-game-wall/30',
        'animate-in fade-in-50 duration-200',
        className
      )}
    >
      {children}
    </div>
  );
}
