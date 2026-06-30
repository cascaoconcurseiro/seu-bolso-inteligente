import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  /** Ícone Lucide renderizado inline antes do label da seção */
  icon?: ReactNode;
  /** Título da seção (ex: "Detalhes", "Valor", "Conta") */
  title?: string;
  children: ReactNode;
  className?: string;
  /** Remove o fundo bg-muted/40 (útil para seções de destaque especial) */
  plain?: boolean;
}

/**
 * Agrupa campos de formulário relacionados em um card visual com fundo sutil.
 * Uso padrão:
 * ```tsx
 * <FormSection icon={<DollarSign className="h-3.5 w-3.5" />} title="Valor">
 *   <AmountInput ... />
 * </FormSection>
 * ```
 */
export function FormSection({ icon, title, children, className, plain = false }: FormSectionProps) {
  return (
    <div
      className={cn(
        "rounded-xl flex flex-col gap-3",
        !plain && "bg-muted/40 border border-border/50 px-3.5 py-3",
        className
      )}
    >
      {title && (
        <div className="flex items-center gap-1.5">
          {icon && (
            <span className="text-muted-foreground [&>svg]:h-3.5 [&>svg]:w-3.5" aria-hidden="true">
              {icon}
            </span>
          )}
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
