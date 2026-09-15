import { useEffect, useRef, useState } from "react";

const MESSAGE = "404, page not found.";

export default function NotFound() {
  const [revealedCount, setRevealedCount] = useState(0);
  const [typingDone, setTypingDone] = useState(false);
  const [handleOffset, setHandleOffset] = useState(0);
  const textRef = useRef(null);
  const handleRef = useRef(null);

  const runAnimation = () => {
    setRevealedCount(0);
    setTypingDone(false);
    setHandleOffset(0);

    let i = 0;
    const typeTimer = setInterval(() => {
      i += 1;
      setRevealedCount(i);
      if (i >= MESSAGE.length) {
        clearInterval(typeTimer);
        setTypingDone(true);
      }
    }, 40);

    return () => clearInterval(typeTimer);
  };

  useEffect(() => {
    const timeout = setTimeout(runAnimation, 200);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typingDone && textRef.current) {
      setHandleOffset(textRef.current.offsetWidth);
    }
  }, [typingDone]);

  return (
    <div style={styles.container}>
      <style>{`
        @import url('https://fonts.googleapis.com/css?family=Roboto+Mono');

        .nf-handle {
          background: #ffe500;
          width: 14px;
          height: 30px;
          margin-top: 1px;
          animation: nf-blink 0.8s step-start infinite;
        }

        @keyframes nf-blink {
          50% { opacity: 0; }
        }

        .nf-char {
          opacity: 0;
          display: inline-block;
          animation: nf-fade-in 0.25s ease-out forwards;
        }

        @keyframes nf-fade-in {
          from { opacity: 0; transform: scale(1.4); }
          to { opacity: 1; transform: scale(1); }
        }

        #cb-replay {
          fill: #666;
          transition: fill 0.15s ease;
        }
        #cb-replay:hover {
          fill: #888;
        }
      `}</style>

      <div style={styles.copyContainer}>
        <p style={styles.text} ref={textRef}>
          {MESSAGE.slice(0, revealedCount)
            .split("")
            .map((char, idx) => (
              <span className="nf-char" key={idx}>
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
        </p>
        <span
          className="nf-handle"
          ref={handleRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transform: `translateX(${handleOffset}px)`,
            transition: typingDone ? "transform 0.7s steps(12)" : "none",
          }}
        />
      </div>

      <svg
        id="cb-replay"
        onClick={runAnimation}
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 279.9 297.3"
        style={styles.replayIcon}
      >
        <g>
          <path
            d="M269.4,162.6c-2.7,66.5-55.6,120.1-121.8,123.9c-77,4.4-141.3-60-136.8-136.9C14.7,81.7,71,27.8,140,27.8
              c1.8,0,3.5,0,5.3,0.1c0.3,0,0.5,0.2,0.5,0.5v15c0,1.5,1.6,2.4,2.9,1.7l35.9-20.7c1.3-0.7,1.3-2.6,0-3.3L148.6,0.3
              c-1.3-0.7-2.9,0.2-2.9,1.7v15c0,0.3-0.2,0.5-0.5,0.5c-1.7-0.1-3.5-0.1-5.2-0.1C63.3,17.3,1,78.9,0,155.4
              C-1,233.8,63.4,298.3,141.9,297.3c74.6-1,135.1-60.2,138-134.3c0.1-3-2.3-5.4-5.3-5.4l0,0C271.8,157.6,269.5,159.8,269.4,162.6z"
          />
        </g>
      </svg>
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    height: "100vh",
    backgroundColor: "#fff",
    fontFamily: "'Roboto Mono', monospace",
    position: "relative",
    userSelect: "none",
  },
  copyContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    textAlign: "center",
  },
  text: {
    color: "#1d4ed8",
    fontSize: 24,
    letterSpacing: 0.2,
    margin: 0,
    position: "relative",
    display: "inline-block",
  },
  replayIcon: {
    width: 20,
    margin: 15,
    position: "absolute",
    right: 0,
    bottom: 0,
    cursor: "pointer",
  },
};
