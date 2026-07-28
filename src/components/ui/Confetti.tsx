import { useEffect, useRef } from "react";

interface ConfettiProps {
  active: boolean;
  duration?: number;
}

/**
 * Confetti celebration — dispara ao atingir meta.
 * Usa canvas com partículas coloridas, performance-consciente.
 */
export function Confetti({ active, duration = 3000 }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!active || prefersReducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = [
      "#6366f1",
      "#f59e0b",
      "#10b981",
      "#ef4444",
      "#3b82f6",
      "#8b5cf6",
      "#ec4899",
      "#14b8a6",
      "#f97316",
      "#fbbf24",
    ];

    canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      rotSpeed: number;
    }[] = [];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * w,
        y: -20 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
      });
    }

    let frame = 0;
    const maxFrames = duration / 16;
    let animId: number;

    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      frame++;

      for (const p of particles) {
        p.x += p.vx;
        p.vy += 0.15; // gravity
        p.y += p.vy;
        p.rotation += p.rotSpeed;

        const alpha = Math.max(0, 1 - frame / maxFrames);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
        ctx.restore();
      }

      if (frame < maxFrames) {
        animId = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [active, duration, prefersReducedMotion]);

  if (!active || prefersReducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      aria-hidden="true"
    />
  );
}
