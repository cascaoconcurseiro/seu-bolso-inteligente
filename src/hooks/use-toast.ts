import * as React from "react";
import { toast as sonnerToast } from "sonner";

/**
 * Shim de compatibilidade sobre o Sonner.
 *
 * O app tinha dois sistemas de toast renderizando simultaneamente (Radix Toast
 * + Sonner). Este módulo preserva a API antiga `toast({ title, description,
 * variant })` usada pelos callsites legados, mas delega tudo ao Sonner — que é
 * o único <Toaster /> montado no App.
 */

type ToastVariant = "default" | "destructive";

interface ToastOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  duration?: number;
}

function toast({ title, description, variant, duration }: ToastOptions) {
  const message = title ?? description ?? "";
  const options = {
    description: title ? description : undefined,
    duration,
  };

  const id =
    variant === "destructive" ? sonnerToast.error(message, options) : sonnerToast(message, options);

  return {
    id: String(id),
    dismiss: () => sonnerToast.dismiss(id),
    update: (props: ToastOptions) =>
      sonnerToast(props.title ?? props.description ?? "", {
        id,
        description: props.title ? props.description : undefined,
      }),
  };
}

function useToast() {
  return {
    toasts: [] as never[],
    toast,
    dismiss: (toastId?: string) => sonnerToast.dismiss(toastId),
  };
}

export { useToast, toast };
