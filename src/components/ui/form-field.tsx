import { cloneElement, isValidElement, ReactElement, ReactNode, useId } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  /** Deixa o label com a aparência padrão (maior, sem uppercase). Útil para checkboxes/switches. */
  plainLabel?: boolean;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
  plainLabel = false,
}: FormFieldProps) {
  const generatedId = useId();
  const child = isValidElement(children)
    ? (children as ReactElement<Record<string, unknown>>)
    : null;
  const fieldId = htmlFor || (child?.props.id as string | undefined) || generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = [
    child?.props["aria-describedby"] as string | undefined,
    error ? errorId : hint ? hintId : undefined,
  ]
    .filter(Boolean)
    .join(" ");
  const field = child
    ? cloneElement(child, {
        id: fieldId,
        "aria-invalid": error ? true : child.props["aria-invalid"],
        "aria-required": required ? true : child.props["aria-required"],
        "aria-describedby": describedBy || undefined,
      })
    : children;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label
          htmlFor={fieldId}
          className={cn(
            plainLabel
              ? "text-sm font-medium text-foreground"
              : "text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          )}
        >
          {label}
          {required && (
            <span className="text-destructive ml-1" aria-hidden="true">
              *
            </span>
          )}
        </Label>
      )}
      {field}
      {error && (
        <p id={errorId} className="text-xs text-destructive leading-snug" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground leading-snug">
          {hint}
        </p>
      )}
    </div>
  );
}
