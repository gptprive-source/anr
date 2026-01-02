import { useState, useRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

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
  const startXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 100; // pixels to swipe right to trigger
  const TRACK_WIDTH = 180; // width of the track

  const handleStart = (clientX: number) => {
    if (disabled) return;
    setIsDragging(true);
    startXRef.current = clientX;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || disabled) return;
    const diff = clientX - startXRef.current;
    // Only allow rightward swipe (positive diff)
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
    handleStart(e.touches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const onTouchEnd = () => {
    handleEnd();
  };

  // Mouse events for desktop testing
  const onMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX);
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
    hangup: "bg-destructive",
    answer: "bg-green-600",
    decline: "bg-destructive",
  };

  const thumbStyles = {
    hangup: "bg-destructive-foreground text-destructive",
    answer: "bg-white text-green-600",
    decline: "bg-destructive-foreground text-destructive",
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative select-none touch-none",
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
      {/* Track background */}
      <div
        className={cn(
          "relative h-12 rounded-full overflow-hidden flex items-center",
          variantStyles[variant]
        )}
        style={{ width: TRACK_WIDTH }}
      >
        {/* Progress fill */}
        <div
          className="absolute inset-0 bg-white/20 origin-left"
          style={{ transform: `scaleX(${progress})` }}
        />

        {/* Label */}
        <span 
          className="absolute inset-0 flex items-center justify-center text-white text-sm font-medium pl-10 pr-4 pointer-events-none"
          style={{ opacity: 1 - progress * 0.5 }}
        >
          {children}
        </span>

        {/* Sliding thumb */}
        <div
          className={cn(
            "absolute left-1 w-10 h-10 rounded-full flex items-center justify-center transition-shadow",
            thumbStyles[variant],
            isDragging && "shadow-lg"
          )}
          style={{
            transform: `translateX(${dragOffset}px)`,
          }}
        >
          <ChevronRight className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
