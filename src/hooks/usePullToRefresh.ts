import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface UsePullToRefreshOptions {
  queryKeys?: string[][];
  threshold?: number;
  onRefresh?: () => Promise<void>;
}

export function usePullToRefresh({
  queryKeys,
  threshold = 80,
  onRefresh,
}: UsePullToRefreshOptions = {}) {
  const queryClient = useQueryClient();
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      // Only trigger when scrolled to top
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (window.scrollY > 0) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) {
        setIsPulling(true);
        setPullDistance(Math.min(delta * 0.5, threshold * 1.5));
      }
    };

    const onTouchEnd = async () => {
      if (!isPulling) return;
      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        try {
          if (onRefresh) {
            await onRefresh();
          } else if (queryKeys) {
            await Promise.all(
              queryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key }))
            );
          } else {
            await queryClient.invalidateQueries();
          }
        } finally {
          setIsRefreshing(false);
        }
      }
      setIsPulling(false);
      setPullDistance(0);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [isPulling, pullDistance, threshold, queryKeys, queryClient, onRefresh]);

  const triggered = pullDistance >= threshold;

  return { containerRef, isPulling, pullDistance, isRefreshing, triggered };
}
