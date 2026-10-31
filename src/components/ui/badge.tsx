import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-forest text-cream",
        secondary:
          "bg-olive text-cream",
        accent:
          "bg-terracotta text-white",
        outline:
          "text-charcoal border border-border-muted bg-surface",
        published:
          "bg-emerald-800 text-cream",
        success:
          "bg-emerald-800 text-cream",
        draft:
          "bg-amber-100 text-amber-900 border border-amber-300",
        sold:
          "bg-terracotta text-white font-bold",
        archived:
          "bg-gray-200 text-gray-700 border border-gray-300",
        destructive:
          "bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

