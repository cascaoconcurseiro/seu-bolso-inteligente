import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primário: cor de marca com foreground adaptado ao tema
        default: "bg-accent text-accent-foreground hover:bg-accent/92",
        // Secundário: bg transparente, borda, texto primary
        outline: "border border-input bg-transparent text-foreground hover:bg-accent/8",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent/8 text-foreground",
        link: "text-accent underline-offset-4 hover:underline active:scale-100",
        // Destrutivo: fundo semi-transparente danger + texto danger
        destructive:
          "text-destructive hover:bg-destructive/10 border border-transparent bg-destructive/8",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6",
        xl: "h-14 px-8 text-base",
        icon: "h-10 w-10 tap-target",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, children, disabled, ...props },
    ref
  ) => {
    const classes = cn(buttonVariants({ variant, size, className }));

    // Radix Slot exige exatamente um elemento React como filho. Manter o loader
    // como irmão do conteúdo fazia qualquer Button asChild lançar Children.only.
    if (asChild) {
      return (
        <Slot
          className={classes}
          ref={ref}
          aria-busy={loading || undefined}
          aria-disabled={disabled || loading || undefined}
          data-disabled={disabled || loading || undefined}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        className={classes}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
