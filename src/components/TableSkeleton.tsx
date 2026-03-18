import React from 'react';
import { Skeleton, TableRowSkeleton } from './Skeleton';

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  hasTabs?: boolean;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ columns = 5, rows = 5, hasTabs = true }) => {
  return (
    <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
      {hasTabs && (
        <div className="flex border-b border-slate-200 h-14 items-center px-4 gap-8">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      )}
      
      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <Skeleton className="h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRowSkeleton key={i} columns={columns} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableSkeleton;
