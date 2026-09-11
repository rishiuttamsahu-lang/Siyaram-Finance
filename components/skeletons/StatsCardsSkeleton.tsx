'use client';

import React from 'react';

interface StatsCardsSkeletonProps {
  count?: 2 | 3;
}

export const StatsCardsSkeleton: React.FC<StatsCardsSkeletonProps> = ({ count = 3 }) => {
  return (
    <div className={`grid ${count === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'} gap-2 sm:gap-3`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div 
          key={idx} 
          className="glass-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-4.5 flex flex-col justify-between space-y-3"
        >
          <div className="w-20 h-3 rounded-full skeleton-shimmer" />
          <div className="w-28 sm:w-36 h-7 sm:h-8 rounded-xl skeleton-shimmer my-1" />
          <div className="w-24 h-2.5 rounded-full skeleton-shimmer opacity-70" />
        </div>
      ))}
    </div>
  );
};
