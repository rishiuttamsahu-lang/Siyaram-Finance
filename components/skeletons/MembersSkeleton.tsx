'use client';

import React from 'react';
import { StatsCardsSkeleton } from './StatsCardsSkeleton';

export const MembersSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-300">
      {/* 3 Top Summary Cards Skeleton */}
      <StatsCardsSkeleton count={3} />

      {/* Month Track Selector Skeleton */}
      <div className="glass-card rounded-2xl p-2 flex items-center gap-1.5 overflow-hidden">
        <div className="w-16 h-7 rounded-xl skeleton-shimmer shrink-0" />
        <div className="flex gap-1 overflow-hidden w-full">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-14 h-7 rounded-xl skeleton-shimmer shrink-0" />
          ))}
        </div>
      </div>

      {/* Search & Sort Controls Skeleton */}
      <div className="flex items-center justify-between gap-2">
        <div className="h-10 rounded-2xl skeleton-shimmer flex-1" />
        <div className="w-24 h-10 rounded-2xl skeleton-shimmer shrink-0" />
      </div>

      {/* Member Cards Skeleton List */}
      <div className="space-y-2.5">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            className="glass-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 flex items-center justify-between gap-3"
          >
            {/* Left: Avatar + Name + Subtitle */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl skeleton-shimmer shrink-0" />
              <div className="space-y-2 min-w-0">
                <div className="w-28 sm:w-36 h-4 rounded-full skeleton-shimmer" />
                <div className="w-20 h-3 rounded-full skeleton-shimmer opacity-70" />
              </div>
            </div>

            {/* Right: Due Badge + Action Button */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-16 sm:w-20 h-7 rounded-xl skeleton-shimmer" />
              <div className="w-8 h-8 rounded-full skeleton-shimmer hidden xs:block" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
