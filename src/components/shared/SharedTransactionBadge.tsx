/**
 * Shared Transaction Badge Component
 *
 * Visual badge to identify shared transactions consistently across all pages.
 * Shows settlement status, transaction type (CREDIT/DEBIT), and member name.
 */

import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SharedTransactionBadgeProps {
  isShared: boolean;
  isSettled: boolean;
  type: "CREDIT" | "DEBIT";
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
    <div className="flex items-center gap-1 flex-wrap">
      {/* Status Badge - Priority 1: Settled/Pending */}
      <Badge
        variant="outline"
        className={cn(
          "text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap border-0",
          isSettled ? "bg-success/12 text-success" : "bg-warning/12 text-warning"
        )}
      >
        {isSettled ? (
          <>
            <CheckCircle2 className="h-3 w-3 mr-1" /> Pago
          </>
        ) : (
          <>
            <Clock className="h-3 w-3 mr-1" /> Pendente
          </>
        )}
      </Badge>

      {/* Tipo Badge - Priority 2: Shared type indicator */}
      <Badge
        variant="outline"
        className="text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap border-0 bg-accent/12 text-accent"
      >
        <Users className="h-3 w-3 mr-1" />
        {compact ? "Comp." : "Compartilhado"}
        {memberName && !compact && ` - ${memberName}`}
      </Badge>
    </div>
  );
}
