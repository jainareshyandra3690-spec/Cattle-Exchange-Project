import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border-muted bg-surface/50 p-8 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-border-muted/40 text-forest">
          {icon}
        </div>
      )}
      <h4 className="text-base font-semibold text-charcoal">{title}</h4>
      <p className="mt-1.5 max-w-sm text-sm text-slate-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

