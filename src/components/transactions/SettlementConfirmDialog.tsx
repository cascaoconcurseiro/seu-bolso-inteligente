import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle, Users, Undo2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettleWithPayment, useSettleMultipleWithPayment, useUnsettleWithReversal } from "@/hooks/useSettlement";
import { useAccounts } from "@/hooks/useAccounts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Split {
  id: string;
  member_id: string | null;
  name: string;
  amount: number;
  percentage: number;
  is_settled: boolean;
  settled_at: string | null;
}

interface SettlementConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  transactionDescription: string;
  transactionAmount: number;
  splits: Split[];
}

export function SettlementConfirmDialog({
  open,
  onOpenChange,
  transactionId,
  transactionDescription,
  transactionAmount,
  splits,
}: SettlementConfirmDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  
  const { data: accounts = [] } = useAccounts();
  const settleWithPayment = useSettleWithPayment();
  const settleMultiple = useSettleMultipleWithPayment();
  const unsettleWithReversal = useUnsettleWithReversal();

  // Filtrar apenas contas que podem receber dinheiro (não cartões de crédito)
  const availableAccounts = accounts.filter(a => a.type !== "CARTÃO DE CRÉDITO");

  const pendingSplits = splits.filter(s => !s.is_settled);
  const settledSplits = splits.filter(s => s.is_settled);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleToggle = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === pendingSplits.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingSplits.map(s => s.id));
    }
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0 || !selectedAccountId) return;
    
    const selectedSplits = pendingSplits.filter(s => selectedIds.includes(s.id));
    
    if (selectedIds.length === 1) {
      const split = selectedSplits[0];
      await settleWithPayment.mutateAsync({
        splitId: split.id,
        transactionId,
        amount: split.amount,
        accountId: selectedAccountId,
        memberName: split.name,
        description: transactionDescription,
      });
    } else {
      await settleMultiple.mutateAsync({
        items: selectedSplits.map(s => ({
          splitId: s.id,
          transactionId,
          amount: s.amount,
          memberName: s.name,
          description: transactionDescription,
        })),
        accountId: selectedAccountId,
      });
    }
    
    setSelectedIds([]);
    onOpenChange(false);
  };

  const handleUnsettle = async (splitId: string) => {
    await unsettleWithReversal.mutateAsync(splitId);
  };

  const totalPending = pendingSplits.reduce((sum, s) => sum + s.amount, 0);
  const totalSelected = pendingSplits
    .filter(s => selectedIds.includes(s.id))
    .reduce((sum, s) => sum + s.amount, 0);

  const isLoading = settleWithPayment.isPending || settleMultiple.isPending;
  const isUnsettling = unsettleWithReversal.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-positive" />
            Confirmar Ressarcimento
          </DialogTitle>
          <DialogDescription>
            Confirme o recebimento dos valores devidos.
            <br />
            <span className="font-medium text-foreground">{transactionDescription}</span>
            <span className="text-xs ml-2">({formatCurrency(transactionAmount)})</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pending Splits */}
          {pendingSplits.length > 0 ? (
            <>
              <div className="flex items-center justify-between pb-2 border-b">
                <label className="text-sm font-medium cursor-pointer flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.length === pendingSplits.length && pendingSplits.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  Selecionar todos pendentes
                </label>
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length} de {pendingSplits.length}
                </span>
              </div>

              <div className="max-h-[200px] overflow-y-auto space-y-2">
                {pendingSplits.map((split) => (
                  <div
                    key={split.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedIds.includes(split.id)
                        ? "border-positive bg-positive/5"
                        : "border-border hover:bg-muted/50"
                    )}
                    onClick={() => handleToggle(split.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedIds.includes(split.id)}
                        onCheckedChange={() => handleToggle(split.id)}
                      />
                      <div>
                        <p className="font-medium text-sm flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {split.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {split.percentage.toFixed(0)}% do total
                        </p>
                      </div>
                    </div>
                    <span className="font-mono font-medium text-amber-600 dark:text-amber-400">
                      {formatCurrency(split.amount)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Account Selection */}
              {selectedIds.length > 0 && (
                <div className="space-y-2 pt-3 border-t">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Conta para receber
                  </label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({formatCurrency(Number(account.balance))})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    O valor será creditado nesta conta como receita.
                  </p>
                </div>
              )}

              {/* Total Selected */}
              {selectedIds.length > 0 && (
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-sm font-medium">Total a receber:</span>
                  <span className="font-mono font-bold text-lg text-positive">
                    +{formatCurrency(totalSelected)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-positive opacity-50" />
              <p>Todos os ressarcimentos já foram confirmados!</p>
            </div>
          )}

          {/* Already Settled - with Undo option */}
          {settledSplits.length > 0 && (
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Já confirmados (clique para reverter)
              </p>
              <div className="space-y-1">
                {settledSplits.map((split) => (
                  <div
                    key={split.id}
                    className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm group"
                  >
                    <span className="text-muted-foreground flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-positive" />
                      {split.name}
                      {split.settled_at && (
                        <span className="text-xs">
                          ({format(new Date(split.settled_at), "dd/MM", { locale: ptBR })})
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-positive">
                        {formatCurrency(split.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleUnsettle(split.id)}
                        disabled={isUnsettling}
                      >
                        {isUnsettling ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Undo2 className="h-3 w-3 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Reverter irá excluir a transação de entrada e atualizar o saldo.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {pendingSplits.length > 0 && (
            <Button
              onClick={handleConfirm}
              disabled={selectedIds.length === 0 || !selectedAccountId || isLoading}
              className="gap-2 bg-positive hover:bg-positive/90"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Confirmar {selectedIds.length > 0 && `(${selectedIds.length})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
