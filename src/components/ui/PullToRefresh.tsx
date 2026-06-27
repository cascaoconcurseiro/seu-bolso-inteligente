import { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

interface PullToRefreshProps {
  children: ReactNode;
  queryKeys?: string[][];
  onRefresh?: () => Promise<void>;
  className?: string;
}

export function PullToRefresh({ children, queryKeys, onRefresh, className }: PullToRefreshProps) {
  const { containerRef, pullDistance, isRefreshing, triggered } = usePullToRefresh({
    queryKeys,
    onRefresh,
  });

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-10 transition-all duration-200"
        style={{ top: -48 + pullDistance, opacity: Math.min(pullDistance / 60, 1) }}
      >
        <div className={cn(
          "w-9 h-9 rounded-full bg-card border border-border shadow-md flex items-center justify-center",
          triggered && "bg-primary/10 border-primary/30"
        )}>
          <RefreshCw
            className={cn(
              "h-4 w-4 transition-colors",
              triggered ? "text-primary" : "text-muted-foreground",
              isRefreshing && "animate-spin"
            )}
            style={{ transform: `rotate(${pullDistance * 2}deg)` }}
          />
        </div>
      </div>
      <div style={{ transform: `translateY(${pullDistance}px)`, transition: pullDistance === 0 ? "transform 0.3s ease" : "none" }}>
        {children}
      </div>
    </div>
  );
}
