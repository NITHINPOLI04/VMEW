import React from 'react';
import { Skeleton } from './Skeleton';

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="dash-premium">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div className="space-y-1.5" aria-hidden="true">
          <Skeleton className="h-6 w-32" aria-label="Loading header" />
          <Skeleton className="h-3 w-40" aria-label="Loading subheader" />
        </div>
        <Skeleton className="h-7 w-36 rounded-full" aria-label="Loading action button" />
      </div>

      {/* Smart Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5 shrink-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="insight-card">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-7 w-24 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Hero Chart */}
      <div className="hero-chart-card shrink-0">
        <div className="hero-chart-bg" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-7 w-28" />
            </div>
            <Skeleton className="h-9 w-36 rounded-xl" />
          </div>
          <Skeleton className="w-full rounded-lg h-[350px]" />
        </div>
      </div>

      {/* Action Hub */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5 shrink-0 pb-6" aria-label="Loading actions">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" aria-label={`Loading action ${i + 1}`} />
        ))}
      </div>
    </div>
  );
};

export default DashboardSkeleton;
