import { useState, useRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { haptics } from "@/utils/haptics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

interface SwipeAction {
  icon: ReactNode;
  color: string; // Tailwind bg class, e.g. "bg-destructive"
  label?: string;
  onClick: () => void;
}

interface SwipeableRowProps {
  children: ReactNode;
  leftAction?: SwipeAction; // revealed on swipe-right
  rightAction?: SwipeAction; // revealed on swipe-left
  className?: string;
}

const THRESHOLD = 52;
const MAX_OFFSET = 84;

const isTouchDevice =
  typeof window !== "undefined" && window.matchMedia("(hover: none) and (pointer: coarse)").matches;

export function SwipeableRow({ children, leftAction, rightAction, className }: SwipeableRowProps) {
  const [offset, setOffset] = useState(0);
  const [dir, setDir] = useState<"left" | "right" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const startX = useRef<number | null>(null);
  const isAnimating = useRef(false);
  // Long-press (HIG): menu contextual como alternativa descobrível ao swipe
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Desktop: substituir swipe por DropdownMenu
  if (!isTouchDevice && (leftAction || rightAction)) {
    const actions = [leftAction, rightAction].filter(Boolean) as SwipeAction[];
    return (
      <div className={cn("relative group", className)}>
        {children}
        <div className="absolute top-1/2 -translate-y-1/2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 rounded-lg bg-background/90 border border-border shadow-sm hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label="Mais ações"
              >
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map((action, i) => (
                <DropdownMenuItem key={i} onClick={action.onClick} className="gap-2">
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isAnimating.current = false;
    if (leftAction || rightAction) {
      cancelLongPress();
      longPressTimer.current = setTimeout(() => {
        haptics.light();
        setMenuOpen(true);
      }, 500);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const diff = e.touches[0].clientX - startX.current;
    if (Math.abs(diff) > 10) cancelLongPress();

    if (diff < 0 && rightAction) {
      const next = Math.max(diff, -MAX_OFFSET);
      if (offset > -THRESHOLD && next <= -THRESHOLD) haptics.light();
      setOffset(next);
      setDir("left");
    } else if (diff > 0 && leftAction) {
      const next = Math.min(diff, MAX_OFFSET);
      if (offset < THRESHOLD && next >= THRESHOLD) haptics.light();
      setOffset(next);
      setDir("right");
    }
  };

  const handleTouchEnd = () => {
    cancelLongPress();
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

  const reset = () => {
    setOffset(0);
    setDir(null);
  };

  const isSnapped = dir === "left" && offset <= -THRESHOLD;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Left action background (swipe right) */}
      {leftAction && (
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center text-white cursor-pointer",
            leftAction.color
          )}
          onClick={(e) => {
            e.stopPropagation();
            leftAction.onClick();
            reset();
          }}
        >
          {leftAction.icon}
        </div>
      )}

      {/* Right action background (swipe left) */}
      {rightAction && (
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center text-white cursor-pointer",
            rightAction.color
          )}
          onClick={(e) => {
            e.stopPropagation();
            rightAction.onClick();
            reset();
          }}
        >
          {rightAction.icon}
        </div>
      )}

      {/* Content */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <div
            className={cn(isAnimating.current && "transition-transform duration-200")}
            style={{ transform: `translateX(${isSnapped ? -MAX_OFFSET : offset}px)` }}
            onClick={() => {
              if (dir) {
                reset();
              }
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onContextMenu={(e) => e.preventDefault()}
          >
            {children}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          {([leftAction, rightAction].filter(Boolean) as SwipeAction[]).map((action, i) => (
            <DropdownMenuItem key={i} onClick={action.onClick} className="gap-2">
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
