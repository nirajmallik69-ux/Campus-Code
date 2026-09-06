import { useEffect, useRef } from "react";

const LENGTH = 6;

export default function OtpInput({ value, onChange, disabled, error }) {
  const inputsRef = useRef([]);
  const digits = value.split("").concat(Array(LENGTH).fill("")).slice(0, LENGTH);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const setDigit = (index, char) => {
    const next = digits.slice();
    next[index] = char;
    onChange(next.join("").replace(/\s/g, ""));
  };

  const handleChange = (index, e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setDigit(index, "");
      return;
    }
    // Handles fast typing/paste-into-a-single-box gracefully.
    const chars = raw.split("");
    const next = digits.slice();
    let cursor = index;
    for (const ch of chars) {
      if (cursor >= LENGTH) break;
      next[cursor] = ch;
      cursor += 1;
    }
    onChange(next.join("").slice(0, LENGTH));
    const focusIndex = Math.min(cursor, LENGTH - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    onChange(pasted.padEnd(LENGTH, "").slice(0, LENGTH).replace(/\s/g, ""));
    const focusIndex = Math.min(pasted.length, LENGTH - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  return (
    <div>
      <div className="otp-inputs">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputsRef.current[index] = el)}
            className={`input ${error ? "input-error" : ""}`}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={LENGTH}
            value={digit}
            disabled={disabled}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            aria-label={`OTP digit ${index + 1}`}
          />
        ))}
      </div>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
