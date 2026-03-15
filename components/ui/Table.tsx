'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils/cn';

export interface Column<T> {
  /** Unique key for the column */
  key: string;
  /** Column header text */
  header: string;
  /** Cell renderer */
  render?: (row: T, index: number) => React.ReactNode;
  /** Accessor for simple value extraction */
  accessor?: keyof T;
  /** Whether the column is sortable */
  sortable?: boolean;
  /** Column width */
  width?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T> {
  /** Column definitions */
  columns: Column<T>[];
  /** Data rows */
  data: T[];
  /** Unique key accessor for each row */
  rowKey: keyof T | ((row: T) => string);
  /** Empty state message */
  emptyMessage?: string;
  /** Whether to show loading state */
  loading?: boolean;
  /** Whether rows are selectable */
  selectable?: boolean;
  /** Selected row keys */
  selectedKeys?: string[];
  /** Callback when selection changes */
  onSelectionChange?: (keys: string[]) => void;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Whether to show alternating row colors */
  striped?: boolean;
  /** Whether to show borders */
  bordered?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class names */
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

/**
 * Pixel-art styled data table component
 */
export function Table<T>({
  columns,
  data,
  rowKey,
  emptyMessage = 'No data available',
  loading = false,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  onRowClick,
  striped = true,
  bordered = true,
  size = 'md',
  className,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const getRowKey = (row: T): string => {
    if (typeof rowKey === 'function') {
      return rowKey(row);
    }
    return String(row[rowKey]);
  };

  const handleSort = (columnKey: string) => {
    if (sortKey === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortKey(null);
      }
    } else {
      setSortKey(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) {
      return data;
    }

    const column = columns.find((c) => c.key === sortKey);
    if (!column?.accessor) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aVal = a[column.accessor!];
      const bVal = b[column.accessor!];

      if (aVal === bVal) {
        return 0;
      }
      if (aVal === null || aVal === undefined) {
        return 1;
      }
      if (bVal === null || bVal === undefined) {
        return -1;
      }

      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection, columns]);

  const handleSelectAll = () => {
    if (selectedKeys.length === data.length) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(data.map(getRowKey));
    }
  };

  const handleSelectRow = (key: string) => {
    if (selectedKeys.includes(key)) {
      onSelectionChange?.(selectedKeys.filter((k) => k !== key));
    } else {
      onSelectionChange?.([...selectedKeys, key]);
    }
  };

  const sizeStyles = {
    sm: {
      cell: 'px-2 py-1.5 text-xs',
      header: 'px-2 py-2 text-[10px]',
    },
    md: {
      cell: 'px-3 py-2 text-sm',
      header: 'px-3 py-2.5 text-xs',
    },
    lg: {
      cell: 'px-4 py-3 text-base',
      header: 'px-4 py-3 text-sm',
    },
  };

  const getCellValue = (row: T, column: Column<T>, index: number): React.ReactNode => {
    if (column.render) {
      return column.render(row, index);
    }
    if (column.accessor) {
      return String(row[column.accessor] ?? '');
    }
    return '';
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        'bg-retro-darker',
        bordered && [
          'border-2 border-t-gray-700 border-l-gray-700 border-b-game-wall border-r-game-wall',
          'shadow-[4px_4px_0_0_rgba(0,0,0,0.4)]',
        ],
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {/* Header */}
          <thead>
            <tr className="bg-retro-navy border-b-2 border-game-wall/50">
              {selectable && (
                <th className={cn(sizeStyles[size].header, 'w-10')}>
                  <input
                    type="checkbox"
                    checked={selectedKeys.length === data.length && data.length > 0}
                    onChange={handleSelectAll}
                    className="accent-bomber-blue"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    sizeStyles[size].header,
                    'font-pixel uppercase tracking-wider text-bomber-yellow',
                    'text-left',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sortable && 'cursor-pointer hover:text-accent-gold transition-colors',
                    column.width
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <span className="flex items-center gap-1">
                    {column.header}
                    {column.sortable && (
                      <span className="text-[8px]">
                        {sortKey === column.key ? (
                          sortDirection === 'asc' ? '▲' : sortDirection === 'desc' ? '▼' : '◇'
                        ) : (
                          '◇'
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className={cn(sizeStyles[size].cell, 'text-center text-gray-400')}
                >
                  <div className="flex items-center justify-center gap-2 py-8">
                    <span className="animate-spin">◌</span>
                    <span className="font-pixel text-xs">LOADING...</span>
                  </div>
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className={cn(sizeStyles[size].cell, 'text-center text-gray-400 py-8')}
                >
                  <span className="font-retro">{emptyMessage}</span>
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => {
                const key = getRowKey(row);
                const isSelected = selectedKeys.includes(key);

                return (
                  <tr
                    key={key}
                    className={cn(
                      'border-b border-game-wall/20 last:border-b-0',
                      'transition-colors duration-100',
                      striped && index % 2 === 1 && 'bg-retro-navy/30',
                      isSelected && 'bg-bomber-blue/20',
                      onRowClick && 'cursor-pointer hover:bg-game-wall/20',
                      !isSelected && !onRowClick && 'hover:bg-game-wall/10'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td
                        className={cn(sizeStyles[size].cell, 'w-10')}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(key)}
                          className="accent-bomber-blue"
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          sizeStyles[size].cell,
                          'font-retro text-white',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right'
                        )}
                      >
                        {getCellValue(row, column, index)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export interface PaginationProps {
  /** Current page (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Whether to show first/last buttons */
  showFirstLast?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Pagination controls for tables
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  className,
}: PaginationProps) {
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {showFirstLast && (
        <PaginationButton
          onClick={() => onPageChange(1)}
          disabled={!canGoPrev}
        >
          ««
        </PaginationButton>
      )}

      <PaginationButton
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrev}
      >
        «
      </PaginationButton>

      <span className="font-pixel text-xs text-white px-3 py-1">
        {currentPage} / {totalPages}
      </span>

      <PaginationButton
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext}
      >
        »
      </PaginationButton>

      {showFirstLast && (
        <PaginationButton
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
        >
          »»
        </PaginationButton>
      )}
    </div>
  );
}

function PaginationButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-2 py-1',
        'font-pixel text-xs text-white',
        'bg-retro-navy border border-game-wall',
        'transition-all duration-100',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-game-wall/30 hover:border-bomber-blue active:translate-y-0.5'
      )}
    >
      {children}
    </button>
  );
}
