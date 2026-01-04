import { cn } from "@/lib/utils";
import {
    Lock,
    User,
    CheckCircle,
    Clock,
    Users,
    HandCoins,
    FastForward,
    Edit,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TransactionItemProps {
    transaction: any;
    user: any;
    familyMembers: any[];
    onEdit?: (t: any) => void;
    onDelete?: (t: any) => void;
    onAdvance?: (t: any) => void;
    onSettlement?: (t: any) => void;
    onClick?: (t: any) => void;
    showActions?: boolean;
    customActions?: React.ReactNode;
}

export function TransactionItem({
    transaction,
    user,
    familyMembers,
    onEdit,
    onDelete,
    onAdvance,
    onSettlement,
    onClick,
    showActions = true,
    customActions,
}: TransactionItemProps) {

    const formatMoney = (value: number, currency: string = "BRL") => {
        if (currency !== "BRL") {
            // Mapping for common currency symbols
            const symbols: Record<string, string> = {
                USD: "$",
                EUR: "€",
                GBP: "£",
                // Add more if needed
            };
            const symbol = symbols[currency] || currency; // Default to code if symbol not found
            return `${symbol} ${Math.abs(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(Math.abs(value));
    };

    const getCreatorName = (creatorUserId: string | null) => {
        if (!creatorUserId) return null;
        if (creatorUserId === user?.id) return null;

        const member = familyMembers.find(
            (m: any) => m.user_id === creatorUserId || m.linked_user_id === creatorUserId
        );
        return member?.name || 'Outro membro';
    };

    const getPayerInfo = (transaction: any) => {
        if (!transaction.is_shared) return null;

        if (!transaction.payer_id || transaction.payer_id === user?.id) {
            return { label: 'Você pagou', isMe: true };
        }

        const payer = familyMembers.find((m: any) => m.id === transaction.payer_id);
        if (payer) {
            return { label: `Pago por ${payer.name}`, isMe: false };
        }

        return null;
    };

    const hasPendingSplits = (transaction: any) => {
        if (!transaction.is_shared || !transaction.transaction_splits) return false;
        return transaction.transaction_splits.some((s: any) => !s.is_settled);
    };

    const isFullySettled = (transaction: any) => {
        if (!transaction.is_shared || !transaction.transaction_splits) return false;
        if (transaction.transaction_splits.length === 0) return false;
        return transaction.transaction_splits.every((s: any) => s.is_settled);
    };

    const creatorName = getCreatorName(transaction.creator_user_id);
    const isOwner = transaction.user_id === user?.id;
    const isCreator = transaction.creator_user_id === user?.id;
    const isMirror = !!transaction.source_transaction_id;

    const canEdit = (isOwner || isCreator) && !isMirror;
    const canDelete = isOwner || isCreator;

    const payerInfo = getPayerInfo(transaction);
    const pending = hasPendingSplits(transaction);
    const settled = isFullySettled(transaction);

    return (
        <div
            className="group flex items-center justify-between py-4 px-4 hover:bg-muted/30 transition-colors cursor-pointer border-b border-border last:border-0"
            onClick={() => onClick && onClick(transaction)}
        >
            <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                <div className={cn(
                    "w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-base md:text-lg shrink-0",
                    transaction.type === "INCOME" ? "bg-positive/10" : "bg-muted"
                )}>
                    {transaction.category?.icon || (transaction.type === "INCOME" ? "💰" : "💸")}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm md:text-base truncate">{transaction.description}</p>
                        {transaction.is_shared && (
                            <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded uppercase tracking-wider font-medium">
                                Compartilhado
                            </span>
                        )}
                        {isMirror && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                <Lock className="h-3 w-3" />
                                Espelhada
                            </span>
                        )}
                        {creatorName && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
                                <User className="h-3 w-3" />
                                {creatorName}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground flex-wrap mt-1">
                        <span className="truncate">{transaction.category?.name || "Sem categoria"}</span>
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
                        transaction.type === "INCOME" ? "text-positive" : "text-negative"
                    )}>
                        {transaction.type === "INCOME" ? "+" : "-"}
                        {formatMoney(Number(transaction.amount), transaction.account?.currency || transaction.currency || "BRL")}
                    </span>
                    <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                        transaction.type === "INCOME" ? "text-positive" : "text-negative"
                    )}>
                        {transaction.type === "INCOME" ? "Crédito" : "Débito"}
                    </span>
                </div>

                {showActions && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 md:transition-opacity" onClick={(e) => e.stopPropagation()}>
                        {/* Botão Confirmar Ressarcimento - apenas para compartilhadas pendentes que eu paguei */}
                        {transaction.is_shared && pending && (isOwner || isCreator) && onSettlement && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 md:h-8 md:w-8 text-positive hover:text-positive"
                                onClick={() => onSettlement(transaction)}
                                title="Confirmar ressarcimento"
                            >
                                <HandCoins className="h-4 w-4" />
                            </Button>
                        )}
                        {/* Botão Adiantar - apenas para parcelas */}
                        {transaction.is_installment && transaction.series_id && canEdit && onAdvance && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 md:h-8 md:w-8 text-blue-600 hover:text-blue-600"
                                onClick={() => onAdvance(transaction)}
                                title="Adiantar parcelas"
                            >
                                <FastForward className="h-4 w-4" />
                            </Button>
                        )}
                        {canEdit && !isMirror && onEdit && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 md:h-8 md:w-8 text-primary hover:text-primary"
                                onClick={() => onEdit(transaction)}
                                title="Editar"
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                        )}
                        {canDelete && onDelete && (
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
                        {customActions}
                        {!customActions && !canEdit && !canDelete && (
                            <div className="h-8 w-8 flex items-center justify-center text-muted-foreground" title="Somente leitura">
                                <Lock className="h-4 w-4" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
