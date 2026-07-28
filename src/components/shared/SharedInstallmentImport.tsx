 
/* eslint-disable unused-imports/no-unused-vars */
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { CurrencyInput } from "@/components/ui/currency-input";
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
import {
  DollarSign,
  Layers,
  Check,
  AlertCircle,
  Loader2,
  Users,
  HelpCircle,
  Info,
  Calendar,
} from "lucide-react";
import { FormSection } from "@/components/ui/form-section";
import { cn } from "@/lib/utils";
import { FamilyMember } from "@/hooks/useFamily";
import { useCreateTransaction } from "@/hooks/useTransactions";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { moneyUtils } from "@/utils/money";

interface SharedInstallmentImportProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  onSuccess?: () => void;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
};

export function SharedInstallmentImport({
  isOpen,
  onClose,
  members,
  onSuccess,
}: SharedInstallmentImportProps) {
  const { user } = useAuth();
  const createTransaction = useCreateTransaction();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState("2");
  const [selectedMonth, setSelectedMonth] = useState(dateFns.format(new Date(), "yyyy-MM"));
  const [assigneeId, setAssigneeId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const availableMembers = members.filter((m) => m.linked_user_id !== user?.id);

  const availableMonths = Array.from({ length: 12 }, (_, i) => {
    const date = dateFns.addMonths(new Date(), i);
    return {
      value: dateFns.format(date, "yyyy-MM"),
      label: dateFns
        .format(date, "MMMM yyyy", { locale: ptBR })
        .replace(/^\w/, (c) => c.toUpperCase()),
    };
  });

  useEffect(() => {
    if (isOpen) {
      setDescription("");
      setAmount("");
      setInstallments("2");
      setSelectedMonth(dateFns.format(new Date(), "yyyy-MM"));
      setIsSubmitting(false);
      setErrors([]);
      if (availableMembers.length > 0) {
        setAssigneeId(availableMembers[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, availableMembers.length]);

  const parseAmount = (val: string) => {
    return moneyUtils.parse(val) || 0;
  };

  const installmentAmount = parseAmount(amount);
  const numInstallments = parseInt(installments) || 1;
  const totalDebt = installmentAmount * numInstallments;

  let lastInstallmentText = "";
  if (selectedMonth && installments) {
    const totalInstallmentsNum = parseInt(installments) || 0;
    if (totalInstallmentsNum >= 1) {
      const [year, month] = selectedMonth.split("-").map(Number);
      const baseDate = new Date(year, month - 1, 1);
      const lastDate = dateFns.addMonths(baseDate, totalInstallmentsNum - 1);
      lastInstallmentText = dateFns
        .format(lastDate, "MMMM yyyy", { locale: ptBR })
        .replace(/^\w/, (c) => c.toUpperCase());
    }
  }

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!description.trim()) {
      newErrors.push("Descricao e obrigatoria");
    }

    const parsedAmount = parseAmount(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      newErrors.push("Valor mensal deve ser maior que zero");
    }

    const parsedInstallments = parseInt(installments);
    if (!parsedInstallments || parsedInstallments < 1) {
      newErrors.push("Numero de parcelas deve ser pelo menos 1");
    }

    if (parsedInstallments > 48) {
      newErrors.push("Numero maximo de parcelas e 48");
    }

    if (!assigneeId) {
      newErrors.push("Selecione quem deve");
    }

    if (!selectedMonth) {
      newErrors.push("Selecione o mes da proxima parcela");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const selectedMember = members.find((m) => m.id === assigneeId);
      if (!selectedMember) throw new Error("Membro nao encontrado");

      const [year, month] = selectedMonth.split("-").map(Number);
      const baseDate = new Date(year, month - 1, 1);
      const totalInstallmentsNum = parseInt(installments);

      const splits = [
        {
          member_id: assigneeId,
          percentage: 100,
          amount: totalDebt,
        },
      ];

      await createTransaction.mutateAsync({
        amount: totalDebt,
        description: description.trim(),
        date: dateFns.format(baseDate, "yyyy-MM-dd"),
        type: "EXPENSE",
        domain: "SHARED",
        is_shared: true,
        is_installment: true,
        total_installments: totalInstallmentsNum,
        payer_id: assigneeId,
        splits: splits,
      });

      toast.success(`${totalInstallmentsNum} parcelas importadas com sucesso!`);
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      toast.error("Erro ao importar parcelas");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedMemberName = members.find((m) => m.id === assigneeId)?.name.split(" ")[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md overflow-hidden flex flex-col w-full !bottom-0 !top-auto !translate-y-0 sm:!top-[50%] sm:!bottom-auto sm:!-translate-y-1/2 rounded-t-[2rem] sm:!rounded-4xl !rounded-b-none sm:!rounded-b-[2rem] p-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-lg max-h-[90vh] border-b-0 sm:border-b bg-background">
        <DialogHeader className="px-5 pt-5 pb-2 sm:px-6 sm:pt-6">
          <DialogTitle className="flex items-center gap-2 pr-8">
            <Layers className="h-5 w-5 text-primary shrink-0" />
            <span>Importar Parcelas</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                  aria-label="Como funciona?"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 border bg-popover text-popover-foreground rounded-xl shadow-md z-50 font-normal">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-primary">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>Como funciona?</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Use para registrar uma <strong>divida parcelada</strong> que alguem tem com
                    voce. Informe o valor mensal que a pessoa te deve, quantas parcelas restam e a
                    partir de qual mes.
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <strong>Exemplo:</strong> Jhonatan te deve R$ 910/mes por 5 meses. Informe R$
                    910 como valor mensal, 5 parcelas restantes, e o mes da primeira cobranca.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </DialogTitle>
          <DialogDescription>Registre parcelas que alguem te deve.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto flex flex-col gap-3 px-5 py-4 sm:px-6 no-scrollbar">
          {errors.length > 0 && (
            <div className="px-1 py-2 bg-destructive/10 text-destructive rounded-lg space-y-1.5">
              {errors.map((error, idx) => (
                <p key={idx} className="text-xs flex items-center gap-2 font-medium px-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              ))}
            </div>
          )}

          <FormSection icon={<DollarSign />} title="Valor e parcelas">
            <FormField label="Descricao" htmlFor="si-description" required>
              <Input
                id="si-description"
                name="si-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Airbnb, Emprestimo..."
                disabled={isSubmitting}
                autoComplete="off"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Valor Mensal" htmlFor="si-amount" required>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                  <CurrencyInput
                    id="si-amount"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0,00"
                    className="pl-9 font-mono"
                    disabled={isSubmitting}
                  />
                </div>
              </FormField>
              <FormField label="Parcelas Restantes" htmlFor="si-installments" required>
                <Input
                  type="number"
                  inputMode="decimal"
                  id="si-installments"
                  name="si-installments"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  min="1"
                  max="48"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection icon={<Calendar />} title="Agendamento">
            <FormField label="Mes da Primeira Parcela" htmlFor="si-month" required>
              <Select
                value={selectedMonth}
                onValueChange={setSelectedMonth}
                disabled={isSubmitting}
              >
                <SelectTrigger id="si-month">
                  <SelectValue placeholder="Selecione o mes..." />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {lastInstallmentText && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs text-foreground">
                    Ultima parcela em{" "}
                    <strong className="text-primary">{lastInstallmentText}</strong>
                  </span>
                </div>
              )}
            </FormField>
          </FormSection>

          <FormSection icon={<Users />} title="Quem deve">
            <FormField label="Devedor" htmlFor="si-assignee-section" required>
              {availableMembers.length === 0 ? (
                <div className="text-center py-4 border border-dashed rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Nenhum membro disponivel</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {availableMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setAssigneeId(member.id)}
                        className={cn(
                          "p-3 rounded-lg border text-sm font-medium transition-all",
                          assigneeId === member.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:border-primary"
                        )}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {assigneeId === member.id && <Check className="h-4 w-4" />}
                          {member.name.split(" ")[0]}
                        </div>
                      </button>
                    ))}
                  </div>

                  {assigneeId && installmentAmount > 0 && (
                    <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-2.5 animate-fade-in mt-2">
                      <p className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                        Resumo da divida
                      </p>

                      <div className="flex justify-between items-center text-foreground font-medium">
                        <span className="text-sm text-muted-foreground">Valor mensal a cobrar</span>
                        <span className="font-mono text-primary font-bold text-base">
                          {formatCurrency(installmentAmount)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>Parcelas restantes</span>
                        <span className="font-mono font-medium text-foreground">
                          {numInstallments}x
                        </span>
                      </div>

                      {numInstallments > 1 && (
                        <div className="flex justify-between items-center pt-2 border-t border-border">
                          <span className="text-sm font-medium text-muted-foreground">
                            Divida total de {selectedMemberName}
                          </span>
                          <span className="font-mono text-primary font-bold text-base">
                            {formatCurrency(totalDebt)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </FormField>
          </FormSection>
        </div>

        <DialogFooter className="px-5 pb-5 pt-2 sm:px-6 sm:pb-6">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || availableMembers.length === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : installmentAmount > 0 ? (
              `Confirmar ${installments}x de ${formatCurrency(installmentAmount)}`
            ) : (
              "Confirmar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
