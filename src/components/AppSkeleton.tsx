import React from 'react';
import { Skeleton } from './Skeleton';

const AppSkeleton: React.FC = () => {
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar Skeleton */}
      <div className="w-64 flex-shrink-0 bg-[#F3F6FA] border-r border-[#E2E8F0] flex flex-col h-full">
        <div className="p-6 border-b border-transparent">
          <Skeleton className="h-8 w-32" />
        </div>
        <nav className="flex-1 py-4 px-3 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </nav>
        <div className="p-6 mt-auto">
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header/Content Area Skeleton */}
        <main className="flex-1 overflow-y-auto p-6 max-w-screen-2xl mx-auto w-full">
          <div className="flex justify-between items-center mb-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32 rounded-lg" />
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm">
                <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="h-12 border-b border-slate-100 flex items-center px-4 gap-4">
               <Skeleton className="h-4 w-24" />
               <Skeleton className="h-4 w-24" />
               <Skeleton className="h-4 w-24" />
            </div>
            <div className="p-4 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppSkeleton;
