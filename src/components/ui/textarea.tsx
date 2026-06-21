import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-xl border border-input/50 bg-background/50 backdrop-blur-sm px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm resize-y",
          className,
        )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
