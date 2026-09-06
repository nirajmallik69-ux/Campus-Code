export default function Input({ label, hint, error, id, className = "", ...rest }) {
  const inputId = id || rest.name;

  return (
    <div className="field">
      {label && <label htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        className={`input ${error ? "input-error" : ""} ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...rest}
      />
      {error ? (
        <span className="field-error" id={`${inputId}-error`}>
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint" id={`${inputId}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
