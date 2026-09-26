import { useEffect, useRef } from "react";

export function SilkBackdrop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let start = 0;
    const draw = (now: number) => {
      if (!start) start = now;
      const t = (now - start) / 1000;
      const ph = t * 1.00;
      const amt = 1.00;
      const dir = 1;
      const spin = ph * dir;
      element.style.setProperty("--silk-angle", `${90 + Math.sin(spin * 0.6) * 24 * amt}deg`);
      frame = requestAnimationFrame(draw);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      element.style.setProperty("--silk-angle", "90deg");
      if (!media.matches) {
        start = 0;
        frame = requestAnimationFrame(draw);
      }
    };
    sync();
    media.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", sync);
    };
  }, []);

  return <div ref={ref} className="silk-backdrop" aria-hidden="true" />;
}