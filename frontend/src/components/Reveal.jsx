import { useEffect, useRef, useState } from "react";

/**
 * Fades + slides a section into view the first time it scrolls into
 * the viewport. Pure CSS handles the actual animation (.reveal /
 * .reveal-visible in global.css); this just toggles the class at
 * the right moment and disconnects once triggered, since we never
 * need to re-hide something a user has already seen.
 *
 * <Reveal delay={100}><SomeSection /></Reveal>
 */
export default function Reveal({ children, as: Component = "div", delay = 0, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // If the browser doesn't support IntersectionObserver for some
    // reason, just show the content immediately rather than hiding it.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Component
      ref={ref}
      className={`reveal ${visible ? "reveal-visible" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Component>
  );
}
