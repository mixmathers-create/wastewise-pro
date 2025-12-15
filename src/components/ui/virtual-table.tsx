import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

interface VirtualTableProps {
  data: any[];
  columns: { key: string; header: string; render: (item: any) => React.ReactNode }[];
  height?: number;
  itemHeight?: number;
}

export function VirtualTable({ data, columns, height = 400, itemHeight = 50 }: VirtualTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height, overflow: 'auto' }}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = data[virtualItem.index];
            return (
              <TableRow
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.render(item)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}