/**
 * Shared Transaction Badge Component
 * 
 * Visual badge to identify shared transactions consistently across all pages.
 * Shows settlement status, transaction type (CREDIT/DEBIT), and member name.
 */

import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SharedTransactionBadgeProps {
  isShared: boolean;
  isSettled: boolean;
  type: 'CREDIT' | 'DEBIT';
  memberName?: string;
  compact?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Badge component for shared transactions
 * 
 * @param props - Component props
 * @returns JSX.Element
 * 
 * @example
 * ```tsx
 * <SharedTransactionBadge
 *   isShared={true}
 *   isSettled={false}
 *   type="CREDIT"
 *   memberName="Wesley"
 * />
 * ```
 */
export function SharedTransactionBadge({
  isShared,
  isSettled,
  type,
  memberName,
  compact = false,
}: SharedTransactionBadgeProps) {
  if (!isShared) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Shared Badge */}
      <Badge
        variant="outline"
        className={cn(
          "text-[9px] md:text-[10px] px-1 md:px-1.5 py-0.5 uppercase tracking-wider font-medium whitespace-nowrap",
          type === 'CREDIT'
            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-800"
            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800"
        )}
      >
        <Users className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5" />
        {compact ? "Comp." : "Compartilhado"}
        {memberName && !compact && ` - ${memberName}`}
      </Badge>

      {/* Settled Badge */}
      {isSettled && (
        <Badge
          variant="outline"
          className="text-[9px] md:text-[10px] px-1 md:px-1.5 py-0.5 font-bold border-green-500 text-green-700 bg-green-100 dark:border-green-700 dark:text-green-300 dark:bg-green-950/50 whitespace-nowrap"
        >
          <CheckCircle2 className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5" />
          PAGO
        </Badge>
      )}

      {/* Type Badge */}
      <Badge
        variant="outline"
        className={cn(
          "text-[9px] md:text-[10px] px-1 md:px-1.5 py-0.5 font-bold whitespace-nowrap",
          isSettled
            ? "border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-400"
            : type === 'CREDIT'
            ? "border-green-300 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-300 dark:bg-green-950/30"
            : "border-red-300 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-300 dark:bg-red-950/30"
        )}
      >
        {type === 'CREDIT' ? 'CRÉDITO' : 'DÉBITO'}
      </Badge>
    </div>
  );
}
