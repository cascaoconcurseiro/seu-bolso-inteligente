import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  FastForward,
  Lock,
  CheckCircle,
  Clock,
  Users,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SharedTransactionBadge } from "@/components/shared/SharedTransactionBadge";
import { Transaction } from "@/utils/transactionUtils";
import { haptics } from "@/utils/haptics";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface PayerInfo {
  label: string;
  isMe: boolean;
}

interface FamilyMember {
  id: string;
  name: string;
  user_id?: string | null;
  linked_user_id?: string | null;
}

interface CurrentUser {
  id: string;
  email?: string;
}

interface TransactionItemProps {
  transaction: Transaction;
  user: CurrentUser | null;
  familyMembers: FamilyMember[];
  formatCurrency: (value: number, currency?: string) => string;
  onDetails: (tx: Transaction) => void;
  onSettlement: (tx: Transaction) => void;
  onAdvance: (tx: Transaction) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  isFullySettled: (tx: Transaction) => boolean;
  hasPendingSplits: (tx: Transaction) => boolean;
  getCreatorName: (tx: Transaction) => string | null;
  getPayerInfo: (tx: Transaction) => PayerInfo | null;
  isMirror?: boolean;
  selectedAccount: string;
}

export function TransactionItem({
  transaction,
  user,
  familyMembers,
  formatCurrency,
  onDetails,
  onSettlement,
  onAdvance,
  onEdit,
  onDelete,
  isFullySettled,
  hasPendingSplits,
  getCreatorName,
  getPayerInfo,
  selectedAccount,
}: TransactionItemProps) {
  const { isPrivate } = usePrivacy();
  const creatorName = getCreatorName(transaction);
  const isOwner = transaction.user_id === user?.id;
  const isCreator = transaction.creator_user_id === user?.id;
  const isMirror = !!transaction.source_transaction_id;
  const pending = hasPendingSplits(transaction);
  const settled = isFullySettled(transaction);

  const canDelete = (isOwner || isCreator) && !settled;

  const payerInfo = getPayerInfo(transaction);
  const isPayer = transaction.payer_id === user?.id || transaction.creator_user_id === user?.id;

  const SWIPE_THRESHOLD = 48; // px mínimo para revelar ação
  const SWIPE_MAX = 80; // px máximo de deslocamento

  const x = useMotionValue(0);
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);

  const handleDragEnd = (event: any, info: any) => {
    const offset = info.offset.x;

    if (offset <= -SWIPE_THRESHOLD && canDelete) {
      haptics.medium();
      setSwipeDir("left");
      animate(x, -SWIPE_MAX, { type: "spring", bounce: 0.2, duration: 0.3 });
    } else if (offset >= SWIPE_THRESHOLD) {
      haptics.medium();
      setSwipeDir(null);
      animate(x, 0, { type: "spring", bounce: 0.2, duration: 0.3 });
      onEdit(transaction);
    } else {
      setSwipeDir(null);
      animate(x, 0, { type: "spring", bounce: 0.2, duration: 0.3 });
    }
  };

  const isSwiped = swipeDir === "left";

  let displayType = transaction.type;
  if (transaction.is_shared && !isPayer) {
    displayType = "EXPENSE";
  }

  if (transaction.type === "TRANSFER" && selectedAccount !== "all") {
    displayType = transaction.destination_account_id === selectedAccount ? "INCOME" : "EXPENSE";
  }

  const isTransfer = transaction.type === "TRANSFER";

  const getTransferTypeLabel = () => {
    const desc = transaction.description.toLowerCase();
    const isFatura = desc.includes("fatura") || desc.includes("cartão") || desc.includes("cartao");
    if (isFatura) return "Pagamento de Fatura";

    const sourceCurrency = transaction.account?.currency || transaction.currency || "BRL";
    const destCurrency = transaction.destination_currency || sourceCurrency;

    if (sourceCurrency !== destCurrency) {
      return "Transferência Internacional";
    }
    return "Transferência";
  };

  const isIncomingTransfer =
    isTransfer &&
    selectedAccount !== "all" &&
    transaction.destination_account_id === selectedAccount;

  // Encontrar o split do usuário atual para transações compartilhadas
  const myMemberId = familyMembers?.find((m) => m.linked_user_id === user?.id)?.id;
  const mySplit = transaction.transaction_splits?.find(
    (s) => s.user_id === user?.id || s.member_id === myMemberId
  );

  const displayAmount =
    isIncomingTransfer &&
    transaction.destination_amount !== null &&
    transaction.destination_amount !== undefined
      ? Number(transaction.destination_amount)
      : transaction.is_shared && mySplit
        ? Number(mySplit.amount)
        : Number(transaction.amount);

  const displayCurrency =
    isIncomingTransfer && transaction.destination_currency
      ? transaction.destination_currency
      : transaction.account?.currency || transaction.currency || "BRL";

  const isInternationalTransfer =
    isTransfer &&
    transaction.destination_amount &&
    transaction.destination_currency &&
    (transaction.account?.currency || transaction.currency || "BRL") !==
      transaction.destination_currency;

  const isOptimistic = (transaction as any).is_optimistic;

  const settledItems = [
    ...(transaction.settled_as_debtor || []),
    ...(transaction.settled_as_creditor || []),
  ];
  const hasSettledItems = settledItems.length > 0;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      layout="position"
      initial={isOptimistic ? { opacity: 0, scale: 0.95, y: -10 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className="relative overflow-hidden group/item border-b last:border-0 border-border/50"
    >
      {/* Background Edit Button (revealed on swipe RIGHT) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-20 bg-primary flex items-center justify-center text-white cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(transaction);
        }}
      >
        <Edit className="h-5 w-5" />
      </div>

      {/* Background Delete Button (revealed on swipe LEFT) */}
      <div
        className="absolute right-0 top-0 bottom-0 w-20 bg-destructive flex items-center justify-center text-white cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(transaction);
        }}
      >
        <Trash2 className="h-5 w-5" />
      </div>

      {/* Main Content (slides based on swipe direction) */}
      <motion.div
        drag="x"
        dragConstraints={{ left: canDelete ? -SWIPE_MAX : 0, right: SWIPE_MAX }}
        dragElastic={0.1}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className={cn(
          "flex items-center justify-between py-3 px-3 md:py-4 md:px-4 bg-background cursor-pointer relative z-10",
          settled && "opacity-60 bg-success/5 dark:bg-success/10"
        )}
        onClick={() => {
          if (swipeDir) {
            animate(x, 0, { type: "spring", bounce: 0.2, duration: 0.3 });
            setSwipeDir(null);
          } else {
            onDetails(transaction);
          }
        }}
      >
        <div className="flex items-start gap-2 md:gap-2 flex-1 min-w-0">
          <div
            className={cn(
              "w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-base md:text-lg shrink-0",
              isTransfer
                ? "bg-accent/12 text-accent"
                : transaction.type === "INCOME"
                  ? "bg-success/12 text-success"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {isTransfer ? (
              <FastForward className="h-4 w-4 md:h-5 md:w-5 rotate-90" />
            ) : (
              transaction.category?.icon || (transaction.type === "INCOME" ? "💰" : "💸")
            )}
          </div>
          <div className="flex-1 min-w-0 pt-0.5 md:pt-0">
            <div className="flex items-center gap-2 md:gap-2 flex-wrap">
              <p
                className={cn(
                  "font-medium text-sm md:text-base truncate",
                  settled && "line-through opacity-60"
                )}
              >
                {transaction.description}
              </p>
              {transaction.is_shared && (
                <SharedTransactionBadge
                  isShared={true}
                  isSettled={settled}
                  type={isPayer ? "CREDIT" : "DEBIT"}
                  memberName={creatorName || undefined}
                  compact={false}
                />
              )}
              {isMirror && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Espelhada
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm md:text-sm text-muted-foreground flex-wrap mt-1">
              <span className="truncate">
                {isTransfer
                  ? getTransferTypeLabel()
                  : transaction.category?.name || "Sem categoria"}
              </span>
              {transaction.account?.name && (
                <>
                  <span>·</span>
                  <span className="truncate">{transaction.account.name}</span>
                </>
              )}
              {transaction.is_installment &&
                transaction.current_installment &&
                transaction.total_installments && (
                  <>
                    <span>·</span>
                    <span className="text-sm px-1.5 py-0.5 rounded bg-muted font-medium">
                      {transaction.current_installment}/{transaction.total_installments}
                    </span>
                  </>
                )}
              {transaction.is_shared && (
                <>
                  <span>·</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium",
                      settled
                        ? "bg-success/12 text-success"
                        : pending
                          ? "bg-warning/12 text-warning"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {settled ? (
                      <>
                        <CheckCircle className="h-3 w-3" /> Acertado
                      </>
                    ) : pending ? (
                      <>
                        <Clock className="h-3 w-3" /> Pendente
                      </>
                    ) : (
                      <>
                        <Users className="h-3 w-3" /> Dividido
                      </>
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3 shrink-0 pt-0.5">
          <div className="flex flex-col items-end gap-0.5">
            <span
              className={cn(
                "font-mono font-medium text-right whitespace-nowrap",
                displayType === "INCOME" ? "text-positive" : "text-negative",
                isPrivate && "blur-md opacity-50 select-none"
              )}
            >
              {isPrivate
                ? "•••••"
                : `${displayType === "INCOME" ? "+" : "-"}${formatCurrency(displayAmount, displayCurrency)}`}
            </span>
            {isInternationalTransfer && !isIncomingTransfer && (
              <span
                className={cn(
                  "text-xs font-mono font-bold text-positive text-right whitespace-nowrap flex items-center justify-end gap-1",
                  isPrivate && "blur-md opacity-50 select-none"
                )}
                title="Valor convertido creditado"
              >
                <span>➔</span>
                <span>
                  {isPrivate
                    ? "•••••"
                    : formatCurrency(
                        Number(transaction.destination_amount),
                        transaction.destination_currency || "USD"
                      )}
                </span>
              </span>
            )}
            <span
              className={cn(
                "text-xs font-bold uppercase tracking-wider whitespace-nowrap",
                displayType === "INCOME" ? "text-positive" : "text-negative"
              )}
            >
              {isTransfer
                ? getTransferTypeLabel() === "Pagamento de Fatura"
                  ? "PAGAMENTO"
                  : getTransferTypeLabel() === "Transferência Internacional"
                    ? "TRANSF. INTERNACIONAL"
                    : "TRANSFERÊNCIA"
                : displayType === "INCOME"
                  ? "Crédito"
                  : "Débito"}
            </span>
          </div>

          {hasSettledItems && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 mt-1 text-muted-foreground self-start hidden md:flex"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
          <div
            className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 md:transition-opacity hidden md:flex"
            onClick={(e) => e.stopPropagation()}
          >
            {canDelete && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 md:h-8 md:w-8 text-primary hover:text-primary/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(transaction);
                  }}
                  aria-label="Editar transação"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 md:h-8 md:w-8 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(transaction);
                  }}
                  aria-label="Excluir transação"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            {!canDelete && (
              <div
                className="h-8 w-8 flex items-center justify-center text-muted-foreground"
                title="Somente leitura"
              >
                <Lock className="h-4 w-4" />
              </div>
            )}
          </div>
        </div>
      </motion.div>
      {hasSettledItems && (
        <>
          <div
            className="md:hidden flex items-center justify-center py-2 bg-background border-t border-border/50 cursor-pointer text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            <span className="text-xs font-medium mr-1">
              {isExpanded ? "Recolher acertos" : "Ver acertos"}
            </span>
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </div>

          <motion.div
            initial={false}
            animate={{ height: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
            className="overflow-hidden bg-muted/30"
          >
            <div className="p-3 pl-12 text-sm border-t border-border/50">
              <p className="font-medium text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                Itens compensados:
              </p>
              <div className="space-y-2">
                {settledItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="truncate pr-2">
                      {item.parent?.description || "Transação deletada"}
                    </span>
                    <span className="font-mono text-muted-foreground text-xs">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
