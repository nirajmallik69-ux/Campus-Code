export default function Button({
  as: Component = "button",
  variant = "primary",
  size,
  loading = false,
  disabled = false,
  className = "",
  children,
  ...rest
}) {
  const classes = [
    "btn",
    `btn-${variant}`,
    size ? `btn-${size}` : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Component className={classes} disabled={disabled || loading} {...rest}>
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </Component>
  );
}
