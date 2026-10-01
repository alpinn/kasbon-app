import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action: { label: string; onClick: () => void; icon?: LucideIcon };
}) {
  const ActionIcon = action.icon;
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
      <button
        type="button"
        onClick={action.onClick}
        className="btn btn-primary mt-6"
      >
        {ActionIcon && <ActionIcon className="size-4" aria-hidden="true" />}
        {action.label}
      </button>
    </div>
  );
}
