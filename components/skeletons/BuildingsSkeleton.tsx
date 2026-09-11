'use client';

import React from 'react';
import { StatsCardsSkeleton } from './StatsCardsSkeleton';

export const BuildingsSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-300">
      {/* 3 Top Summary Gauges Skeleton */}
      <StatsCardsSkeleton count={3} />

      {/* Building Wing Tabs Skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-24 h-10 rounded-2xl skeleton-shimmer" />
        ))}
      </div>

      {/* Floor & Flat Grid Skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, fIdx) => (
          <div key={fIdx} className="glass-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 space-y-3">
            {/* Floor Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="w-16 h-4 rounded-full skeleton-shimmer" />
              <div className="w-12 h-3 rounded-full skeleton-shimmer opacity-70" />
            </div>

            {/* Flats Grid */}
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, flIdx) => (
                <div key={flIdx} className="h-16 rounded-2xl skeleton-shimmer" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
