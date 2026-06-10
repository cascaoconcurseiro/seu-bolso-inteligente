import React, { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DraggableQuickAddFABProps {
  onClick: () => void;
}

export function DraggableQuickAddFAB({ onClick }: DraggableQuickAddFABProps) {
  const [position, setPosition] = useState({ x: -16, y: -80 }); // Default bottom-right
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number; moved: boolean } | null>(null);

  // Load saved position
  useEffect(() => {
    const saved = localStorage.getItem("quickAddFabPosition");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPosition(parsed);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Save position on change
  const savePosition = (x: number, y: number) => {
    setPosition({ x, y });
    localStorage.setItem("quickAddFabPosition", JSON.stringify({ x, y }));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag with left click or touch
    if (e.button !== 0 && e.pointerType === "mouse") return;
    
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
      moved: false,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return;
    
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragRef.current.moved = true;
    }
    
    if (dragRef.current.moved) {
      let newX = dragRef.current.initialX + dx;
      let newY = dragRef.current.initialY + dy;
      
      // Simple boundary constraints (approximate)
      const maxX = 0;
      const minX = -(window.innerWidth - 64);
      const maxY = 0;
      const minY = -(window.innerHeight - 64);
      
      if (newX > maxX) newX = maxX;
      if (newX < minX) newX = minX;
      if (newY > maxY) newY = maxY;
      if (newY < minY) newY = minY;
      
      setPosition({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    
    if (dragRef.current?.moved) {
      savePosition(position.x, position.y);
    } else {
      // If didn't move much, it's a click
      onClick();
    }
    
    dragRef.current = null;
  };

  return (
    <Button
      className={cn(
        "hidden md:flex fixed h-14 w-14 rounded-full shadow-xl z-50 transition-colors active:scale-95 touch-none",
        isDragging ? "cursor-grabbing" : "cursor-grab"
      )}
      style={{
        right: 0,
        bottom: 0,
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      size="icon"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}
