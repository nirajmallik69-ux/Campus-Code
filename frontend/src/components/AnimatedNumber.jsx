import { useEffect, useRef, useState } from "react";

const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Animates counting up from 0 to `value` over `duration` ms the
 * first time it scrolls into view. Falls back to rendering the
 * already-formatted string as-is for non-numeric values (ordinal
 * ranks like "3rd", placeholders like "—", multi-part strings like
 * "Y1: 5  ·  Y2: 3") - only genuinely animates a clean integer.
 */
export default function AnimatedNumber({ value, duration = 900, formatter }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(null);
  const hasAnimated = useRef(false);

  const numeric =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : typeof value === "string" && /^-?\d+$/.test(value.replace(/,/g, ""))
      ? Number(value.replace(/,/g, ""))
      : null;

  useEffect(() => {
    if (numeric === null) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setDisplay(numeric);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();

          const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            setDisplay(Math.round(numeric * easeOutExpo(progress)));
            if (progress < 1) requestAnimationFrame(tick);
          };

          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numeric]);

  if (numeric === null) {
    return <span>{value}</span>;
  }

  const shown = display === null ? 0 : display;

  return (
    <span ref={ref} className="animated-number">
      {formatter ? formatter(shown) : shown.toLocaleString("en-US")}
    </span>
  );
}
