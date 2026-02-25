import { cn } from "@/utils/style";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circular" | "text" | "card";
  width?: string | number;
  height?: string | number;
  lines?: number;
}

function Skeleton({
  className,
  variant = "default",
  width,
  height,
  lines = 1,
  style,
  ...props
}: SkeletonProps) {
  const baseStyles = "animate-shimmer bg-gradient-to-r from-muted via-muted/70 to-muted bg-[length:200%_100%] rounded-md";

  const variantStyles = {
    default: "h-4 w-full",
    circular: "rounded-full",
    text: "h-4 w-full",
    card: "h-32 w-full rounded-lg",
  };

  if (variant === "text" && lines > 1) {
    return (
      <div className="space-y-2" {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              baseStyles,
              variantStyles.text,
              i === lines - 1 && "w-3/4",
              className
            )}
            style={style}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseStyles, variantStyles[variant], className)}
      style={{
        width: width ? (typeof width === "number" ? `${width}px` : width) : undefined,
        height: height ? (typeof height === "number" ? `${height}px` : height) : undefined,
        ...style,
      }}
      {...props}
    />
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 p-4 border rounded-lg", className)}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

function SkeletonQuiz({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg space-y-3">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-6 w-3/4" />
          <div className="space-y-2 pt-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex items-center gap-2">
                <Skeleton variant="circular" width={20} height={20} />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonFlashcard() {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="w-full max-w-md space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="w-full max-w-md aspect-[3/4] rounded-xl border-2">
        <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-3 w-24 mt-4" />
        </div>
      </div>
    </div>
  );
}

function SkeletonMindMap() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="relative w-full max-w-lg h-64">
        <Skeleton variant="circular" width={80} height={80} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <Skeleton variant="circular" width={50} height={50} className="absolute top-4 left-1/2 -translate-x-1/2" />
        <Skeleton variant="circular" width={50} height={50} className="absolute bottom-4 left-1/2 -translate-x-1/2" />
        <Skeleton variant="circular" width={50} height={50} className="absolute top-1/2 left-4 -translate-y-1/2" />
        <Skeleton variant="circular" width={50} height={50} className="absolute top-1/2 right-4 -translate-y-1/2" />
      </div>
    </div>
  );
}

function SkeletonGlossary({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 border rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonQuiz, SkeletonFlashcard, SkeletonMindMap, SkeletonGlossary };
