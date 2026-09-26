import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  age: number;
}

const LIFETIME_MS = 650;
const MAX_PARTICLES = 60;

// A soft lime particle trail that follows the pointer. Purely decorative and
// additive: fixed, full-viewport, pointer-events-none canvas painted over
// everything else, so it never touches existing layout or interaction.
export function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const particles: Particle[] = [];
    let raf = 0;
    let lastX = -1;
    let lastY = -1;

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    const onMove = (e: PointerEvent) => {
      if (lastX >= 0) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        const dist = Math.hypot(dx, dy);
        const steps = Math.min(Math.ceil(dist / 12), 6);
        for (let i = 1; i <= steps; i++) {
          particles.push({
            x: lastX + (dx * i) / steps,
            y: lastY + (dy * i) / steps,
            age: 0,
          });
        }
      }
      lastX = e.clientX;
      lastY = e.clientY;
      if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES);
    };

    let lastFrame = performance.now();
    let running = false;

    // Only loop while there's something to animate. An rAF loop that runs
    // forever (even fully idle) can confuse tools that wait for the page to
    // go render-idle (e.g. automated screenshotting), and it burns battery
    // for a purely decorative effect.
    const tick = (now: number) => {
      const dt = now - lastFrame;
      lastFrame = now;
      ctx.clearRect(0, 0, width, height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (!p) continue;
        p.age += dt;
        if (p.age > LIFETIME_MS) {
          particles.splice(i, 1);
          continue;
        }
        const t = p.age / LIFETIME_MS;
        const radius = 5 * (1 - t) + 1;
        const alpha = 0.35 * (1 - t);
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(216, 239, 154, ${alpha})`;
        ctx.fill();
      }
      if (particles.length > 0) {
        raf = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };

    const ensureRunning = () => {
      if (running) return;
      running = true;
      lastFrame = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const onMoveWithWake = (e: PointerEvent) => {
      onMove(e);
      ensureRunning();
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMoveWithWake, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMoveWithWake);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
