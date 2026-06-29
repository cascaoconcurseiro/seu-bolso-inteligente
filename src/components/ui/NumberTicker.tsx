import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

interface NumberTickerProps {
  value: number;
  direction?: "up" | "down";
  className?: string;
  delay?: number;
  formatCurrency?: (val: number) => string;
}

export function NumberTicker({
  value,
  direction = "up",
  className,
  delay = 0,
  formatCurrency,
}: NumberTickerProps) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const motionValue = useMotionValue(direction === "down" ? value + 1000 : 0);
  const displayValue = useTransform(motionValue, (latest) =>
    formatCurrency ? formatCurrency(latest) : Math.round(latest).toString()
  );

  useEffect(() => {
    // Initial animation
    const timeout = setTimeout(() => {
      animate(motionValue, value, {
        type: "spring",
        damping: 30,
        stiffness: 100,
        mass: 1,
        onComplete: () => setHasAnimated(true),
      });
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [value, motionValue, delay]);

  useEffect(() => {
    // Animate to new values after initial animation
    if (hasAnimated) {
      animate(motionValue, value, {
        type: "spring",
        damping: 30,
        stiffness: 100,
        mass: 1,
      });
    }
  }, [value, hasAnimated, motionValue]);

  return <motion.span className={className}>{displayValue}</motion.span>;
}
