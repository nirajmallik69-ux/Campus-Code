import { Inbox, AlertTriangle } from "lucide-react";
import Button from "./Button";

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  error = false,
  actionLabel,
  onAction
}) {
  return (
    <div className={`state-block ${error ? "state-error" : ""}`}>
      <div className="state-icon">
        <Icon size={22} />
      </div>
      <h3>{title}</h3>
      {description && <p className="text-secondary">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, onRetry }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      description={description}
      error
      actionLabel={onRetry ? "Try again" : undefined}
      onAction={onRetry}
    />
  );
}
