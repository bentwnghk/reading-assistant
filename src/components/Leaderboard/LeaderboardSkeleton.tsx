"use client";
import { cn } from "@/utils/style";

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-muted", className)} />
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex gap-3 px-3">
        <SkeletonBlock className="h-4 w-8" />
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-4 w-16 ml-auto" />
        <SkeletonBlock className="h-4 w-12" />
        <SkeletonBlock className="h-4 w-12" />
      </div>
      {/* Rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border p-3">
          <SkeletonBlock className="h-8 w-8 rounded-full shrink-0" />
          <SkeletonBlock className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
          <SkeletonBlock className="h-6 w-16 rounded-full" />
          <SkeletonBlock className="h-4 w-10 hidden sm:block" />
          <SkeletonBlock className="h-4 w-10 hidden sm:block" />
          <SkeletonBlock className="h-4 w-10 hidden sm:block" />
        </div>
      ))}
    </div>
  );
}

export function PersonalStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-4 space-y-2">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}
