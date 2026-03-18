import React from 'react';
import { Skeleton } from './Skeleton';

const FormSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center" aria-hidden="true">
        <Skeleton className="h-8 w-64" aria-label="Loading form title" />
      </div>

      <div className="flex gap-6 border-b border-slate-200 h-12">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 space-y-6" aria-label="Loading primary details">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" aria-label="Loading label" />
                <Skeleton className="h-10 w-full rounded-lg" aria-label="Loading input" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" aria-label="Loading label" />
                <Skeleton className="h-10 w-full rounded-lg" aria-label="Loading input" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" aria-label="Loading label" />
              <Skeleton className="h-24 w-full rounded-lg" aria-label="Loading textarea" />
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-3 items-center">
                <Skeleton className="col-span-6 h-10 rounded-lg" />
                <Skeleton className="col-span-2 h-10 rounded-lg" />
                <Skeleton className="col-span-2 h-10 rounded-lg" />
                <Skeleton className="col-span-2 h-10 rounded-lg" />
              </div>
            ))}
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <Skeleton className="h-12 flex-1 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormSkeleton;
