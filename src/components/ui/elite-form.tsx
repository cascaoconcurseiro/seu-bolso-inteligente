/**
 * Elite Form Components
 * Alinhados ao design system unificado (8px scale, tokens compartilhados)
 */

import { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── FORM CONTAINER ─────────────────────────────────────────────────────────
interface EliteFormContainerProps {
  children: ReactNode;
  className?: string;
}

export function EliteFormContainer({ children, className }: EliteFormContainerProps) {
  return (
    <div className={cn("flex flex-col h-full min-h-screen bg-background p-4 md:p-6 gap-4", className)}>
      {children}
    </div>
  );
}

// ─── FORM HEADER ────────────────────────────────────────────────────────────
interface EliteFormHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClose?: () => void;
  progress?: number; // 0-100
}

export function EliteFormHeader({ title, subtitle, icon, onClose, progress }: EliteFormHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          {icon && (
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div className="space-y-2 min-w-0">
            <h1 className="font-display font-semibold text-xl md:text-xl tracking-tight leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {typeof progress === "number" && (
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground transition-all duration-500 ease-out rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ─── HIGHLIGHT CARD ─────────────────────────────────────────────────────────
interface EliteHighlightCardProps {
  label: string;
  value: string | ReactNode;
  className?: string;
}

export function EliteHighlightCard({ label, value, className }: EliteHighlightCardProps) {
  return (
    <div className={cn(
      "rounded-lg bg-muted/50 p-4 flex flex-col items-center justify-center text-center gap-2",
      className
    )}>
      <p className="text-sm text-muted-foreground font-medium">
        {label}
      </p>
      <div className="font-display font-semibold text-xl md:text-2xl tracking-tight value-display">
        {value}
      </div>
    </div>
  );
}

// ─── FORM SECTION ───────────────────────────────────────────────────────────
interface EliteFormSectionProps {
  label?: string;
  children: ReactNode;
  className?: string;
}

export function EliteFormSection({ label, children, className }: EliteFormSectionProps) {
  return (
    <div className={cn("form-field", className)}>
      {label && (
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

// ─── CURRENCY INPUT ─────────────────────────────────────────────────────────
interface EliteCurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  currency?: string;
  placeholder?: string;
  className?: string;
}

export function EliteCurrencyInput({
  value,
  onChange,
  currency = "R$",
  placeholder = "0,00",
  className
}: EliteCurrencyInputProps) {
  return (
    <div className={cn(
      "flex items-center gap-4 px-4 h-12 rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-colors",
      className
    )}>
      <span className="text-lg font-medium text-muted-foreground shrink-0">
        {currency}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-xl font-semibold outline-none placeholder:text-muted-foreground/40 value-display focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
      />
    </div>
  );
}

// ─── PRIMARY BUTTON ─────────────────────────────────────────────────────────
interface ElitePrimaryButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
  type?: "button" | "submit";
}

export function ElitePrimaryButton({
  children,
  onClick,
  disabled,
  loading,
  icon,
  className,
  type = "button"
}: ElitePrimaryButtonProps) {
  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      size="lg"
      className={cn("w-full", className)}
    >
      {children}
      {!loading && icon}
    </Button>
  );
}

// ─── SECONDARY BUTTON ───────────────────────────────────────────────────────
interface EliteSecondaryButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function EliteSecondaryButton({
  children,
  onClick,
  disabled,
  className
}: EliteSecondaryButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      size="lg"
      className={cn("w-full", className)}
    >
      {children}
    </Button>
  );
}

// ─── TEXT INPUT ─────────────────────────────────────────────────────────────
interface EliteTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  icon?: ReactNode;
  className?: string;
}

export function EliteTextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  className
}: EliteTextInputProps) {
  return (
    <div className={cn(
      "control items-center gap-3",
      className
    )}>
      {icon && (
        <span className="text-muted-foreground shrink-0">
          {icon}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent font-medium outline-none placeholder:text-muted-foreground/40 border-0 h-auto p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
      />
    </div>
  );
}

// ─── SELECT INPUT ───────────────────────────────────────────────────────────
interface EliteSelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface EliteSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: EliteSelectOption[];
  placeholder?: string;
  className?: string;
}

export function EliteSelect({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  className
}: EliteSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "control appearance-none cursor-pointer font-medium",
        className
      )}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ─── BOTTOM ACTIONS ─────────────────────────────────────────────────────────
interface EliteBottomActionsProps {
  children: ReactNode;
  className?: string;
}

export function EliteBottomActions({ children, className }: EliteBottomActionsProps) {
  return (
    <div className={cn("mt-auto pt-6 flex flex-col gap-2", className)}>
      {children}
    </div>
  );
}
