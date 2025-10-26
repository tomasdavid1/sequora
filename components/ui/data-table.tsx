import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => any);
  cell?: (value: any, row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
  filterable?: boolean | 'select'; // true = text filter, 'select' = dropdown filter
  filterPlaceholder?: string;
  filterOptions?: Array<{ label: string; value: string }>; // For select filters
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  getRowClassName?: (row: T) => string;
  emptyMessage?: string;
  loading?: boolean;
  hoverable?: boolean;
  striped?: boolean;
  searchable?: boolean; // Enable global search
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[]; // Which fields to search (if not provided, searches all)
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  getRowClassName,
  emptyMessage = 'No data available',
  loading = false,
  hoverable = true,
  striped = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  searchKeys
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [columnFilters, setColumnFilters] = React.useState<Record<number, string>>({});
  const [showFilters, setShowFilters] = React.useState(false);
  
  const getCellValue = (row: T, column: Column<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    return row[column.accessor];
  };
  
  // Check if any filters are active
  const hasActiveFilters = Object.values(columnFilters).some(v => v && v !== 'ALL');
  
  // Filter data based on search term and column filters
  const filteredData = React.useMemo(() => {
    let result = data;
    
    // Apply column filters first
    if (hasActiveFilters) {
      result = result.filter(row => {
        return Object.entries(columnFilters).every(([colIndex, filterValue]) => {
          if (!filterValue || filterValue === 'ALL') return true;
          
          const column = columns[parseInt(colIndex)];
          const cellValue = getCellValue(row, column);
          
          // Handle different value types
          if (cellValue == null) return false;
          if (Array.isArray(cellValue)) {
            return cellValue.some((item: any) => 
              String(item).toLowerCase().includes(filterValue.toLowerCase())
            );
          }
          
          return String(cellValue).toLowerCase().includes(filterValue.toLowerCase());
        });
      });
    }
    
    // Then apply global search
    if (searchable && searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      
      result = result.filter(row => {
        const keysToSearch = searchKeys || (Object.keys(row) as (keyof T)[]);
        
        return keysToSearch.some(key => {
          const value = row[key];
          if (value == null) return false;
          
          if (Array.isArray(value)) {
            return value.some((item: any) => 
              String(item).toLowerCase().includes(lowerSearch)
            );
          }
          
          if (typeof value === 'object') {
            return JSON.stringify(value).toLowerCase().includes(lowerSearch);
          }
          
          return String(value).toLowerCase().includes(lowerSearch);
        });
      });
    }
    
    return result;
  }, [data, searchTerm, columnFilters, searchable, searchKeys, columns, hasActiveFilters]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const hasFilterableColumns = columns.some(c => c.filterable);
  
  return (
    <div className="space-y-3">
      {/* Search Input & Filter Toggle */}
      <div className="flex gap-2">
        {searchable && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            {searchTerm && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                {filteredData.length} of {data.length}
              </div>
            )}
          </div>
        )}
        {hasFilterableColumns && (
          <Button
            variant={hasActiveFilters || showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            {hasActiveFilters ? `Filtered (${filteredData.length})` : 'Filters'}
          </Button>
        )}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setColumnFilters({})}
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
      
      {/* Table */}
      {filteredData.length === 0 && searchTerm ? (
        <div className="text-center py-8 text-gray-500">
          <p>No results found for "{searchTerm}"</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className={cn(
                  'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                  column.headerClassName
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
          {/* Filter Row */}
          {showFilters && (
            <tr className="bg-gray-100 border-t">
              {columns.map((column, index) => (
                <th key={index} className="px-4 py-2">
                  {column.filterable === 'select' && column.filterOptions ? (
                    <Select
                      value={columnFilters[index] || 'ALL'}
                      onValueChange={(value) => setColumnFilters({ ...columnFilters, [index]: value })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All</SelectItem>
                        {column.filterOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : column.filterable ? (
                    <Input
                      type="text"
                      placeholder={column.filterPlaceholder || 'Filter...'}
                      value={columnFilters[index] || ''}
                      onChange={(e) => setColumnFilters({ ...columnFilters, [index]: e.target.value })}
                      className="h-8 text-xs"
                    />
                  ) : null}
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody className="divide-y divide-gray-200">
          {filteredData.map((row, rowIndex) => {
            const rowClassName = getRowClassName ? getRowClassName(row) : '';
            const baseRowClass = cn(
              'transition-colors',
              hoverable && 'hover:bg-gray-50',
              striped && rowIndex % 2 === 0 && 'bg-gray-25',
              onRowClick && 'cursor-pointer',
              rowClassName
            );

            return (
              <tr
                key={rowIndex}
                className={baseRowClass}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column, colIndex) => {
                  const value = getCellValue(row, column);
                  const cellContent = column.cell ? column.cell(value, row) : value;

                  return (
                    <td
                      key={colIndex}
                      className={cn('px-4 py-3', column.className)}
                    >
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
      )}
    </div>
  );
}

