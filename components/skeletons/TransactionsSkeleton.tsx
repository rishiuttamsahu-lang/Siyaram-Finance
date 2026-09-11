'use client';

import React from 'react';
import { StatsCardsSkeleton } from './StatsCardsSkeleton';

interface TransactionsSkeletonProps {
  type?: 'income' | 'expense';
}

export const TransactionsSkeleton: React.FC<TransactionsSkeletonProps> = ({ type = 'income' }) => {
  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-300">
      {/* 2 Top Summary Cards Skeleton */}
      <StatsCardsSkeleton count={2} />

      {/* Search Bar Skeleton */}
      <div className="flex items-center justify-between gap-2">
        <div className="h-10 rounded-2xl skeleton-shimmer flex-1" />
        <div className="w-24 h-10 rounded-2xl skeleton-shimmer shrink-0" />
      </div>

      {/* Ledger Rows Skeleton List */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            className="glass-card rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3"
          >
            {/* Left: Icon + Description + Timestamp */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl skeleton-shimmer shrink-0" />
              <div className="space-y-1.5 min-w-0">
                <div className="w-32 sm:w-48 h-3.5 rounded-full skeleton-shimmer" />
                <div className="w-20 h-2.5 rounded-full skeleton-shimmer opacity-70" />
              </div>
            </div>

            {/* Right: Amount & Mode Badge */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="w-16 h-4 rounded-full skeleton-shimmer" />
              <div className="w-10 h-3 rounded-full skeleton-shimmer opacity-60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
