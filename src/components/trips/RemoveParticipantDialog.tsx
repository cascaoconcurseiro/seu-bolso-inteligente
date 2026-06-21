import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Wallet, HeartHandshake, AlertTriangle, CheckCircle2, UserMinus } from "lucide-react";
import { moneyUtils } from "@/utils/money";
import { cn } from "@/lib/utils";

interface RemoveParticipantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: {
    id: string;
    trip_id: string;
    user_id: string | null;
    member_id: string;
    name: string;
    role: string;
  } | null;
  balance: {
    participantId: string;
    name: string;
    paid: number;
    owes: number;
    balance: number;
    currency: string;
  } | null;
  onConfirmDirectRemove: () => Promise<void>;
  onConfirmSettleRemove: (accountId: string) => Promise<void>;
  onConfirmForgiveRemove: () => Promise<void>;
  isRemoving: boolean;
  currency: string;
  accounts: any[];
}

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function RemoveParticipantDialog({
  open,
  onOpenChange,
  participant,
  balance,
  onConfirmDirectRemove,
  onConfirmSettleRemove,
  onConfirmForgiveRemove,
  isRemoving,
  currency,
  accounts,
}: RemoveParticipantDialogProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [activeMode, setActiveMode] = useState<"choose" | "settle">("choose");

  if (!participant) return null;

  if (participant.role === 'owner') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md rounded-3xl p-6 border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-2 text-xl font-display font-black tracking-tight text-destructive">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
              Ação Não Permitida
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground font-medium">
              Não é possível remover <span className="font-bold text-foreground">{participant.name}</span> porque ele(a) é o criador da viagem.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-11 px-5">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const currentBalance = balance?.balance || 0;
  const isSettled = Math.abs(currentBalance) < 0.01;
  const owesGroup = currentBalance < -0.01;

  const handleSettleSubmit = async () => {
    if (!selectedAccountId) return;
    await onConfirmSettleRemove(selectedAccountId);
    setActiveMode("choose");
    setSelectedAccountId("");
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) {
        setActiveMode("choose");
        setSelectedAccountId("");
      }
    }}>
      <DialogContent className="w-full sm:max-w-md !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-lg !rounded-b-none sm:!rounded-b-lg p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] flex flex-col border-b-0 sm:border-b bg-card overflow-hidden">
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>
        <DialogHeader className="px-6 pt-2 pb-2 text-left shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-display font-black tracking-tight text-foreground">
            <UserMinus className="h-5 w-5 text-destructive animate-pulse" />
            Remover Viajante
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground font-medium">
            Gerencie o encerramento da participação de <span className="font-bold text-foreground">{participant.name}</span> na viagem.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 overflow-y-auto hide-scrollbar">
        {activeMode === "choose" ? (
          <div className="space-y-6 my-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Visualização de Saldos do Participante */}
            <div className={cn(
              "p-5 rounded-2xl border transition-all duration-300",
              isSettled 
                ? "border-green-500/20 bg-green-500/5 dark:bg-green-500/[0.02]" 
                : owesGroup
                  ? "border-orange-500/20 bg-orange-500/5 dark:bg-orange-500/[0.02]"
                  : "border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/[0.02]"
            )}>
              <div className="flex items-center gap-3.5 mb-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-md",
                  isSettled ? "bg-green-500 text-white" : owesGroup ? "bg-orange-500 text-white" : "bg-blue-500 text-white"
                )}>
                  {isSettled ? <CheckCircle2 className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Status Financeiro</h4>
                  <p className="text-xs text-muted-foreground">
                    {isSettled 
                      ? "Totalmente em dia com a viagem." 
                      : owesGroup 
                        ? `Deve ${moneyUtils.format(Math.abs(currentBalance), currency)} ao grupo.`
                        : `O grupo deve ${moneyUtils.format(currentBalance, currency)} a ele(a).`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center border-t border-border/40 pt-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-0.5">Pagou</p>
                  <p className="font-mono text-xs font-black text-foreground">
                    {moneyUtils.format(balance?.paid || 0, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-0.5">Sua Parte</p>
                  <p className="font-mono text-xs font-black text-foreground">
                    {moneyUtils.format(balance?.owes || 0, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-0.5">Saldo</p>
                  <p className={cn(
                    "font-mono text-xs font-black",
                    isSettled ? "text-green-600 dark:text-green-400" :
                    owesGroup ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400"
                  )}>
                    {isSettled ? moneyUtils.format(0, currency) : (owesGroup ? "-" : "+") + moneyUtils.format(Math.abs(currentBalance), currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Ações Inteligentes de Remoção baseadas no Saldo */}
            {isSettled ? (
              <div className="p-4 rounded-xl border border-green-500/10 bg-green-500/[0.01] flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Como este participante não possui pendências, você pode removê-lo diretamente. O histórico de transações passadas dele continuará preservado na viagem.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Como deseja lidar com as pendências?</p>
                
                {/* Opção 1: Zerar e Remover */}
                <button
                  onClick={() => {
                    if (accounts.length > 0) {
                      setSelectedAccountId(accounts[0].id);
                    }
                    setActiveMode("settle");
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-border bg-card hover:bg-muted/30 hover:border-primary/20 text-left transition-all group"
                >
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary/20 text-primary flex items-center justify-center shrink-0 transition-colors">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">Zerar e Remover (Recomendado)</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Registrar um acerto completo de {moneyUtils.format(Math.abs(currentBalance), currency)} antes de concluir a remoção.
                      </p>
                    </div>
                  </div>
                </button>

                {/* Opção 2: Perdoar Dívida */}
                <button
                  onClick={onConfirmForgiveRemove}
                  disabled={isRemoving}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-border bg-card hover:bg-muted/30 hover:border-primary/20 text-left transition-all group disabled:opacity-50"
                >
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 transition-colors">
                      <HeartHandshake className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">Perdoar Dívida / Ajustar Custo</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {owesGroup 
                          ? "Perdoar o valor devido. O saldo será consolidado como despesa geral do grupo."
                          : "Zerar o saldo sem pagamentos. O valor será integrado como custo geral do grupo."}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Opção 3: Apenas Remover */}
                <button
                  onClick={onConfirmDirectRemove}
                  disabled={isRemoving}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-border bg-card hover:bg-muted/30 hover:border-destructive/20 text-left transition-all group disabled:opacity-50"
                >
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 group-hover:bg-destructive/20 text-destructive flex items-center justify-center shrink-0 transition-colors">
                      <Trash2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">Apenas Remover (Manter Histórico)</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Cortar o acesso do participante na hora, mantendo o saldo pendente visível no relatório da viagem.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 my-4 animate-fade-in">
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Você está registrando um acerto no valor de <span className="font-black text-foreground">{moneyUtils.format(Math.abs(currentBalance), currency)}</span> para zerar as contas de <span className="font-bold text-foreground">{participant.name}</span>. Por favor, escolha a conta financeira associada.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Conta Financeira</label>
                {accounts.length === 0 ? (
                  <p className="text-xs text-destructive">Nenhuma conta cadastrada para registrar a transação.</p>
                ) : (
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="w-full h-11 rounded-xl border-border bg-card">
                      <SelectValue placeholder="Selecione a conta..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border bg-card/95 backdrop-blur-md">
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id} className="rounded-lg py-2.5">
                          {acc.name} ({acc.bank_name || 'Carteira'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button 
                variant="outline" 
                onClick={() => setActiveMode("choose")}
                disabled={isRemoving}
                className="rounded-xl h-11 px-5"
              >
                Voltar
              </Button>
              <Button 
                onClick={handleSettleSubmit}
                disabled={isRemoving || !selectedAccountId}
                className="rounded-xl h-11 px-5 shadow-lg shadow-primary/20"
              >
                {isRemoving ? "Processando..." : "Confirmar e Remover"}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className={cn("gap-2 sm:gap-0", activeMode !== "choose" && "hidden")}>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isRemoving}
            className="rounded-xl h-11 px-5"
          >
            Cancelar Remoção
          </Button>
          {isSettled && (
            <Button 
              variant="destructive" 
              onClick={onConfirmDirectRemove}
              disabled={isRemoving}
              className="rounded-xl h-11 px-5 shadow-lg shadow-destructive/10"
            >
              {isRemoving ? "Removendo..." : "Confirmar Remoção"}
            </Button>
          )}
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
