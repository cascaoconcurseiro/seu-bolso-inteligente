import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [font-size:11px]",
  {
    variants: {
      variant: {
        default: "bg-primary/12 text-primary border-0",
        secondary: "bg-muted text-secondary-foreground border-0",
        destructive: "bg-destructive/12 text-destructive border-0",
        outline: "border border-border text-foreground",
        success: "bg-success/12 text-success border-0",
        warning: "bg-warning/12 text-warning border-0",
        danger: "bg-destructive/12 text-destructive border-0",
        muted: "bg-muted text-muted-foreground border-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
