import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FastForward, Lock, User, CheckCircle, Clock, Users, HandCoins, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SharedTransactionBadge } from "@/components/shared/SharedTransactionBadge";
import { Transaction } from "@/utils/transactionUtils";
import { haptics } from "@/utils/haptics";
import { usePrivacy } from "@/contexts/PrivacyContext";

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
  formatCurrency,
  onDetails,
  onSettlement,
  onAdvance,
  onDelete,
  isFullySettled,
  hasPendingSplits,
  getCreatorName,
  getPayerInfo,
  selectedAccount
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
  
  // Swipe to delete logic
  const [isSwiped, setIsSwiped] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    
    if (diff < 0) {
      const newOffset = Math.max(diff, -80);
      if (swipeOffset > -40 && newOffset <= -40) {
        haptics.light();
      }
      setSwipeOffset(newOffset);
      if (diff < -40) {
        setIsSwiped(true);
      }
    } else if (diff > 40) {
      setIsSwiped(false);
      setSwipeOffset(0);
    }
  };

  const handleTouchEnd = () => {
    touchStartX.current = null;
    if (swipeOffset < -40) {
      setSwipeOffset(-80);
      setIsSwiped(true);
      haptics.medium();
    } else {
      setSwipeOffset(0);
      setIsSwiped(false);
    }
  };
  
  let displayType = transaction.type;
  if (transaction.is_shared && !isPayer) {
    displayType = 'EXPENSE';
  }
  
  if (transaction.type === 'TRANSFER' && selectedAccount !== 'all') {
    displayType = transaction.destination_account_id === selectedAccount ? 'INCOME' : 'EXPENSE';
  }
  
  const isTransfer = transaction.type === 'TRANSFER';

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

  const isIncomingTransfer = isTransfer && selectedAccount !== 'all' && transaction.destination_account_id === selectedAccount;
  
  const displayAmount = isIncomingTransfer && transaction.destination_amount !== null && transaction.destination_amount !== undefined
    ? Number(transaction.destination_amount)
    : Number(transaction.amount);

  const displayCurrency = isIncomingTransfer && transaction.destination_currency
    ? transaction.destination_currency
    : (transaction.account?.currency || transaction.currency || "BRL");

  const isInternationalTransfer = isTransfer && 
    transaction.destination_amount && 
    transaction.destination_currency && 
    (transaction.account?.currency || transaction.currency || 'BRL') !== transaction.destination_currency;

  return (
    <div className="relative overflow-hidden group/item border-b last:border-0 border-border/50">
      {/* Background Delete Button (revealed on swipe) */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-20 bg-destructive flex items-center justify-center text-white cursor-pointer transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(transaction);
        }}
      >
        <Trash2 className="h-5 w-5" />
      </div>

      {/* Main Content (slides left) */}
      <div
        className={cn(
          "flex items-center justify-between py-4 px-4 bg-background transition-transform duration-200 cursor-pointer relative z-10",
          settled && "opacity-60 bg-green-50/30 dark:bg-green-950/10",
          isSwiped ? "-translate-x-20" : "translate-x-0"
        )}
        onClick={() => {
          if (isSwiped) {
            setIsSwiped(false);
          } else {
            onDetails(transaction);
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
      <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
        <div className={cn(
          "w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-base md:text-lg shrink-0",
          isTransfer ? "bg-blue-500/10 text-blue-500" :
          transaction.type === "INCOME" ? "bg-positive/10" : "bg-muted"
        )}>
          {isTransfer ? <FastForward className="h-5 w-5 rotate-90" /> : 
           transaction.category?.icon || (transaction.type === "INCOME" ? "💰" : "💸")}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn(
              "font-medium text-sm md:text-base truncate",
              settled && "line-through opacity-60"
            )}>
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
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                <Lock className="h-3 w-3" />
                Espelhada
              </span>
            )}
            {transaction.is_shared && creatorName && (
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                creatorName === 'Você' 
                  ? "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400"
                  : "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
              )}>
                <User className="h-3 w-3" />
                Criado por {creatorName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground flex-wrap mt-1">
            <span className="truncate">
              {isTransfer ? getTransferTypeLabel() : (transaction.category?.name || "Sem categoria")}
            </span>
            {transaction.account?.name && (
              <>
                <span>·</span>
                <span className="truncate">{transaction.account.name}</span>
              </>
            )}
            {transaction.is_installment && transaction.current_installment && transaction.total_installments && (
              <>
                <span>·</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted font-medium">
                  {transaction.current_installment}/{transaction.total_installments}
                </span>
              </>
            )}
            {transaction.is_shared && (
              <>
                <span>·</span>
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium",
                  settled 
                    ? "bg-positive/10 text-positive" 
                    : pending 
                      ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                      : "bg-muted"
                )}>
                  {settled ? (
                    <><CheckCircle className="h-3 w-3" /> Acertado</>
                  ) : pending ? (
                    <><Clock className="h-3 w-3" /> Pendente</>
                  ) : (
                    <><Users className="h-3 w-3" /> Dividido</>
                  )}
                </span>
              </>
            )}
            {payerInfo && (
              <>
                <span>·</span>
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded font-medium",
                  payerInfo.isMe 
                    ? "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400"
                    : "bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400"
                )}>
                  {payerInfo.label}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-start gap-3 shrink-0 pt-0.5">
        <div className="flex flex-col items-end gap-0.5">
          <span className={cn(
            "font-mono font-medium text-right whitespace-nowrap",
            displayType === "INCOME" ? "text-positive" : "text-negative",
            isPrivate && "blur-md opacity-50 select-none"
          )}>
            {isPrivate ? "•••••" : `${displayType === "INCOME" ? "+" : "-"}${formatCurrency(displayAmount, displayCurrency)}`}
          </span>
          {isInternationalTransfer && !isIncomingTransfer && (
            <span className={cn("text-[11px] font-mono font-bold text-positive text-right whitespace-nowrap flex items-center justify-end gap-1", isPrivate && "blur-md opacity-50 select-none")} title="Valor convertido creditado">
              <span>➔</span>
              <span>{isPrivate ? "•••••" : formatCurrency(Number(transaction.destination_amount), transaction.destination_currency || 'USD')}</span>
            </span>
          )}
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
            displayType === "INCOME" ? "text-positive" : "text-negative"
          )}>
            {isTransfer 
              ? (getTransferTypeLabel() === "Pagamento de Fatura" 
                  ? "PAGAMENTO" 
                  : (getTransferTypeLabel() === "Transferência Internacional" 
                      ? "TRANSF. INTERNACIONAL" 
                      : "TRANSFERÊNCIA"))
              : (displayType === "INCOME" ? "Crédito" : "Débito")}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 md:transition-opacity hidden md:flex" onClick={(e) => e.stopPropagation()}>

          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 md:h-8 md:w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(transaction)}
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {!canDelete && (
            <div className="h-8 w-8 flex items-center justify-center text-muted-foreground" title="Somente leitura">
              <Lock className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
