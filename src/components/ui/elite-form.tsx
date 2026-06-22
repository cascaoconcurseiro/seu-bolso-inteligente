/**
 * Elite Form Components
 * Componentes padronizados para formulários seguindo o Elite Design System
 */

import { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── FORM CONTAINER ─────────────────────────────────────────────────────────
interface EliteFormContainerProps {
  children: ReactNode;
  className?: string;
}

export function EliteFormContainer({ children, className }: EliteFormContainerProps) {
  return (
    <div className={cn("flex flex-col h-full min-h-screen bg-background p-6 space-y-8", className)}>
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
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div className="space-y-1">
            <h1 className="font-display font-black text-3xl tracking-tight leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground font-medium">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      {typeof progress === 'number' && (
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
      "rounded-3xl bg-muted/50 p-8 flex flex-col items-center justify-center text-center space-y-3",
      className
    )}>
      <p className="text-sm uppercase tracking-widest text-muted-foreground font-bold">
        {label}
      </p>
      <div className="font-display font-black text-5xl tracking-tight">
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
    <div className={cn("space-y-4", className)}>
      {label && (
        <label className="block text-sm uppercase tracking-widest text-muted-foreground font-bold">
          {label}
        </label>
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
      "flex items-center gap-4 p-6 rounded-3xl border-2 border-border bg-background focus-within:border-foreground transition-colors",
      className
    )}>
      <span className="text-3xl font-bold text-muted-foreground shrink-0">
        {currency}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-3xl font-bold outline-none placeholder:text-muted-foreground/40"
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
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "w-full h-16 rounded-3xl bg-foreground text-background font-bold text-base",
        "flex items-center justify-center gap-3",
        "transition-all duration-200",
        "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        className
      )}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
      ) : (
        <>
          {children}
          {icon}
        </>
      )}
    </button>
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
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full h-16 rounded-3xl border-2 border-border bg-background text-foreground font-bold text-base",
        "flex items-center justify-center gap-3",
        "transition-all duration-200",
        "hover:bg-muted active:scale-[0.98]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
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
      "flex items-center gap-4 px-6 h-16 rounded-3xl border-2 border-border bg-background focus-within:border-foreground transition-colors",
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
        className="flex-1 bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground/40"
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
  const selected = options.find(opt => opt.value === value);
  
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full px-6 h-16 rounded-3xl border-2 border-border bg-background",
        "text-base font-medium appearance-none cursor-pointer",
        "focus:border-foreground focus:outline-none transition-colors",
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
    <div className={cn("mt-auto pt-8 space-y-3", className)}>
      {children}
    </div>
  );
}
