import { useState, useRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { haptics } from "@/utils/haptics";

interface SwipeAction {
  icon: ReactNode;
  color: string; // Tailwind bg class, e.g. "bg-destructive"
  label?: string;
  onClick: () => void;
}

interface SwipeableRowProps {
  children: ReactNode;
  leftAction?: SwipeAction;  // revealed on swipe-right
  rightAction?: SwipeAction; // revealed on swipe-left
  className?: string;
}

const THRESHOLD = 52;
const MAX_OFFSET = 84;

export function SwipeableRow({ children, leftAction, rightAction, className }: SwipeableRowProps) {
  const [offset, setOffset] = useState(0);
  const [dir, setDir] = useState<'left' | 'right' | null>(null);
  const startX = useRef<number | null>(null);
  const isAnimating = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isAnimating.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const diff = e.touches[0].clientX - startX.current;

    if (diff < 0 && rightAction) {
      const next = Math.max(diff, -MAX_OFFSET);
      if (offset > -THRESHOLD && next <= -THRESHOLD) haptics.light();
      setOffset(next);
      setDir('left');
    } else if (diff > 0 && leftAction) {
      const next = Math.min(diff, MAX_OFFSET);
      if (offset < THRESHOLD && next >= THRESHOLD) haptics.light();
      setOffset(next);
      setDir('right');
    }
  };

  const handleTouchEnd = () => {
    startX.current = null;
    isAnimating.current = true;

    if (offset <= -THRESHOLD && rightAction) {
      setOffset(-MAX_OFFSET);
      haptics.medium();
    } else if (offset >= THRESHOLD && leftAction) {
      haptics.medium();
      setOffset(0);
      setDir(null);
      leftAction.onClick();
    } else {
      setOffset(0);
      setDir(null);
    }
  };

  const reset = () => { setOffset(0); setDir(null); };

  const isSnapped = dir === 'left' && offset <= -THRESHOLD;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Left action background (swipe right) */}
      {leftAction && (
        <div
          className={cn("absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center text-white cursor-pointer", leftAction.color)}
          onClick={(e) => { e.stopPropagation(); leftAction.onClick(); reset(); }}
        >
          {leftAction.icon}
        </div>
      )}

      {/* Right action background (swipe left) */}
      {rightAction && (
        <div
          className={cn("absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center text-white cursor-pointer", rightAction.color)}
          onClick={(e) => { e.stopPropagation(); rightAction.onClick(); reset(); }}
        >
          {rightAction.icon}
        </div>
      )}

      {/* Content */}
      <div
        className={cn(isAnimating.current && "transition-transform duration-200")}
        style={{ transform: `translateX(${isSnapped ? -MAX_OFFSET : offset}px)` }}
        onClick={() => { if (dir) { reset(); } }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
