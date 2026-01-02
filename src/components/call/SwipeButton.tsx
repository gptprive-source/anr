import { useState, useRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SwipeButtonProps {
  onSwipe: () => void;
  children: ReactNode;
  className?: string;
  variant?: "hangup" | "answer" | "decline";
  disabled?: boolean;
}

export const SwipeButton = ({
  onSwipe,
  children,
  className,
  variant = "hangup",
  disabled = false,
}: SwipeButtonProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startYRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 80; // pixels to swipe up to trigger

  const handleStart = (clientY: number) => {
    if (disabled) return;
    setIsDragging(true);
    startYRef.current = clientY;
  };

  const handleMove = (clientY: number) => {
    if (!isDragging || disabled) return;
    const diff = startYRef.current - clientY;
    // Only allow upward swipe (positive diff)
    const offset = Math.max(0, Math.min(diff, SWIPE_THRESHOLD + 20));
    setDragOffset(offset);
  };

  const handleEnd = () => {
    if (!isDragging || disabled) return;
    setIsDragging(false);
    
    if (dragOffset >= SWIPE_THRESHOLD) {
      onSwipe();
    }
    setDragOffset(0);
  };

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientY);
  };

  const onTouchEnd = () => {
    handleEnd();
  };

  // Mouse events for desktop testing
  const onMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientY);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientY);
  };

  const onMouseUp = () => {
    handleEnd();
  };

  const onMouseLeave = () => {
    if (isDragging) {
      handleEnd();
    }
  };

  const progress = Math.min(dragOffset / SWIPE_THRESHOLD, 1);

  const variantStyles = {
    hangup: "bg-destructive text-destructive-foreground",
    answer: "bg-green-600 text-white",
    decline: "bg-destructive text-destructive-foreground",
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex flex-col items-center select-none touch-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      {/* Swipe indicator arrow */}
      <div 
        className={cn(
          "absolute -top-8 text-muted-foreground transition-all duration-200",
          isDragging && "text-foreground"
        )}
        style={{
          opacity: 0.3 + progress * 0.7,
          transform: `translateY(${-progress * 10}px)`,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </div>

      {/* Button */}
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-3 rounded-full font-medium transition-all duration-150",
          variantStyles[variant],
          isDragging && "scale-105"
        )}
        style={{
          transform: `translateY(${-dragOffset}px) scale(${1 + progress * 0.05})`,
          boxShadow: progress > 0 ? `0 ${4 + progress * 8}px ${8 + progress * 16}px rgba(0,0,0,0.2)` : undefined,
        }}
      >
        {children}
      </div>

      {/* Swipe hint text */}
      <span 
        className="text-xs text-muted-foreground mt-2 transition-opacity duration-200"
        style={{ opacity: isDragging ? 0 : 0.7 }}
      >
        Glisser vers le haut
      </span>

      {/* Progress indicator */}
      {isDragging && (
        <div className="absolute -bottom-2 w-16 h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-100",
              variant === "answer" ? "bg-green-500" : "bg-destructive"
            )}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
    </div>
  );
};
