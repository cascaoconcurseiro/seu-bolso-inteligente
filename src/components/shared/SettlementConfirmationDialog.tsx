import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { InvoiceItem } from "@/hooks/useSharedFinances";
import { useAccounts } from "@/hooks/useAccounts";
import { toast } from "sonner";

import * as dateFns from "date-fns";
import { Check, X, Wallet, Calendar, Info, Trash2, ArrowDownCircle, ArrowUpCircle, Globe } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SettlementConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  items: InvoiceItem[];
  onConfirm: (items: InvoiceItem[], accountId: string, date: string, exchangeRate?: number) => Promise<void>;
  isSettling: boolean;
}

export function SettlementConfirmationDialog({
  isOpen,
  onOpenChange,
  items: initialItems,
  onConfirm,
  isSettling
}: SettlementConfirmationDialogProps) {
  const { data: accounts = [] } = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [date, setDate] = useState(dateFns.format(new Date(), 'yyyy-MM-dd'));
  const [currentItems, setCurrentItems] = useState<InvoiceItem[]>([]);
  const [exchangeRate, setExchangeRate] = useState("5.15");

  useEffect(() => {
    if (isOpen) {
      setCurrentItems(initialItems);
    }
  }, [isOpen, initialItems]);

  const total = currentItems.reduce((sum, item) => sum + item.amount, 0);
  const currency = currentItems[0]?.currency || "BRL";
  
  // NOVO: Detectar se a ação é de pagamento (Débito) ou recebimento (Crédito)
  const isPayment = currentItems.length > 0 && currentItems[0].type === 'DEBIT';

  // Mostrar todas as contas de movimentação líquida (não cartões)
  // E apenas contas que sejam da mesma moeda da transação
  const filteredAccounts = accounts.filter(a => a.type !== 'CREDIT_CARD' && a.currency === currency);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const accountCurrency = selectedAccount?.currency || "BRL";
  const isMultiCurrency = accountCurrency.toUpperCase() !== currency.toUpperCase();

  useEffect(() => {
    if (isOpen && filteredAccounts.length > 0) {
      const isAlreadyValid = filteredAccounts.some(a => a.id === selectedAccountId);
      if (!isAlreadyValid) {
        const defaultAcc = filteredAccounts.find(a => a.type === 'CHECKING') || filteredAccounts[0];
        setSelectedAccountId(defaultAcc.id);
      }
    }
  }, [isOpen, filteredAccounts, selectedAccountId]);

  useEffect(() => {
    if (isOpen && filteredAccounts.length > 0) {
      const isAlreadyValid = filteredAccounts.some(a => a.id === selectedAccountId);
      if (!isAlreadyValid) {
        const defaultAcc = filteredAccounts.find(a => a.type === 'CHECKING') || filteredAccounts[0];
        setSelectedAccountId(defaultAcc.id);
      }
    } else if (isOpen && filteredAccounts.length === 0) {
      // Forçar reset se não houver conta válida na mesma moeda
      setSelectedAccountId("");
    }
  }, [isOpen, filteredAccounts, selectedAccountId]);

  const handleConfirm = async () => {
    if (filteredAccounts.length === 0) {
      toast.error(`Você não possui conta cadastrada na moeda da despesa (${currency}). Por favor, cadastre uma conta nessa moeda primeiro.`);
      return;
    }

    if (!selectedAccountId || currentItems.length === 0) return;

    // Dupla validação de segurança para impedir pagamentos em moedas diferentes
    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    if (!selectedAccount || selectedAccount.currency.toUpperCase() !== currency.toUpperCase()) {
      toast.error(`A conta selecionada (${selectedAccount?.currency}) não é compatível com a moeda do acerto (${currency}).`);
      return;
    }

    // Se for um pagamento (saída de dinheiro), validar se o saldo é suficiente
    if (isPayment) {
      if (selectedAccount.type !== 'CREDIT_CARD') {
        if (selectedAccount.balance < total) {
          toast.error(`Saldo insuficiente na conta "${selectedAccount.name}". Saldo atual: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: selectedAccount.currency }).format(selectedAccount.balance)}. Valor necessário: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: selectedAccount.currency }).format(total)}`);
          return;
        }
      }
    }

    await onConfirm(currentItems, selectedAccountId, date, undefined);
    onOpenChange(false);
  };

  const removeItem = (id: string) => {
    setCurrentItems(prev => prev.filter(item => item.id !== id));
  };

  const formatCurrencyValue = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl bg-background/95 backdrop-blur-xl">
        <div className={cn(
          "absolute inset-0 pointer-events-none",
          isPayment ? "bg-gradient-to-br from-red-500/10 via-transparent to-primary/5" : "bg-gradient-to-br from-green-500/10 via-transparent to-primary/5"
        )} />
        
        <div className="p-6 pb-0 relative">
          <DialogHeader>
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 animate-in zoom-in duration-300",
              isPayment ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"
            )}>
              {isPayment ? <ArrowUpCircle className="h-6 w-6" /> : <ArrowDownCircle className="h-6 w-6" />}
            </div>
            <DialogTitle className="text-2xl font-display font-bold">
              {isPayment ? "Confirmar Pagamento" : "Confirmar Recebimento"}
            </DialogTitle>
            <DialogDescription className="text-base">
              Verifique os itens e escolha a conta de {isPayment ? "origem" : "destino"} para este {isPayment ? "pagamento" : "recebimento"}.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5 relative">
          {/* Card de Resumo do Valor */}
          <div className={cn(
            "p-4 rounded-2xl border flex items-center justify-between group transition-all",
            isPayment ? "bg-red-500/5 border-red-500/20 hover:bg-red-500/10" : "bg-green-500/5 border-green-500/20 hover:bg-green-500/10"
          )}>
            <div className="space-y-1">
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                isPayment ? "text-red-600/70" : "text-green-600/70"
              )}>Total Selecionado</span>
              <div className={cn(
                "text-3xl font-mono font-bold tracking-tight",
                isPayment ? "text-red-600" : "text-green-600"
              )}>
                {formatCurrencyValue(total)}
              </div>
            </div>
            <Badge variant="outline" className={cn(
              "py-1 px-3",
              isPayment ? "bg-red-500/10 text-red-700 border-red-500/20" : "bg-green-500/10 text-green-700 border-green-500/20"
            )}>
              {currentItems.length} {currentItems.length === 1 ? "Item" : "Itens"}
            </Badge>
          </div>

          {/* Lista de Itens */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Detalhamento do Acerto
              </Label>
              <span className="text-[10px] text-muted-foreground uppercase font-medium">Remover se necessário</span>
            </div>
            
            <ScrollArea className="h-[140px] rounded-xl border border-border/50 bg-muted/30 p-2">
              {currentItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 py-8">
                  <Trash2 className="h-8 w-8 opacity-20" />
                  <p className="text-xs">Nenhum item selecionado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="group flex items-center justify-between p-3 rounded-lg bg-background border border-border/50 hover:border-primary/30 transition-all hover:shadow-sm"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="text-sm font-medium truncate">{item.description}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {dateFns.format(new Date(item.date + 'T12:00:00'), "dd MMM yyyy")} • {item.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold font-mono text-foreground whitespace-nowrap">
                          {formatCurrencyValue(item.amount)}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => removeItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Configurações da Transação */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                Conta de {isPayment ? "Origem" : "Destino"}
              </Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="h-11 rounded-xl bg-muted/50 border-border/50 focus:ring-primary/20">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {filteredAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id} className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        {acc.name} ({acc.currency})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Data {isPayment ? "Pagamento" : "Recebimento"}
              </Label>
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="h-11 rounded-xl bg-muted/50 border-border/50 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Aviso se não houver contas na moeda da transação */}
          {filteredAccounts.length === 0 && (
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10 space-y-2 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold text-sm">
                <Info className="h-4 w-4" />
                <span>Conta incompatível</span>
              </div>
              <p className="text-xs text-red-700/80 dark:text-red-400/80 leading-relaxed">
                Você não possui nenhuma conta de pagamento disponível na moeda desta despesa ({currency}). 
                <strong> É necessário usar uma conta da mesma moeda para realizar este acerto.</strong>
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-0 flex gap-3 sm:gap-0">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-xl h-11 hover:bg-muted"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isSettling || !selectedAccountId || currentItems.length === 0}
            className="flex-[2] rounded-xl h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            {isSettling ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Confirmando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                {isPayment ? "Confirmar Pagamento" : "Confirmar Recebimento"}
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

