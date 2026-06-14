import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar, DollarSign, Save, Info, Users, AlertCircle, Loader2 } from "lucide-react";
import { formatLocalDate } from "@/utils/dateUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";

import { useFamilyMembers } from "@/hooks/useFamily";
import { useCategoriesHierarchical } from "@/hooks/useCategories";
import { useCreateTransaction } from "@/hooks/useTransactions";
import { useAuth } from "@/contexts/AuthContext";
import { CategorySelector } from "@/components/transactions/CategorySelector";
import { toast } from "sonner";

type CreditCardAccount = any;

interface ImportBillsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  account: CreditCardAccount;
  onImport: (transactions: unknown[]) => void;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export function ImportBillsDialog({ isOpen, onClose, account, onImport }: ImportBillsDialogProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("installment");

  // Tab 1: Global state
  const [year, setYear] = useState(new Date().getFullYear());
  const [months, setMonths] = useState<{ date: string; label: string; amount: string; isPast: boolean }[]>([]);

  // Tab 2: Installments state
  const [desc, setDesc] = useState("");
  const [instValue, setInstValue] = useState("");
  const [currentInst, setCurrentInst] = useState("1");
  const [totalInst, setTotalInst] = useState("2");
  
  // New Installment Fields
  const [selectedMonth, setSelectedMonth] = useState(dateFns.format(new Date(), 'yyyy-MM'));
  const [categoryId, setCategoryId] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [assigneeId, setAssigneeId] = useState("");
  const [assigneePercentage, setAssigneePercentage] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: familyMembers = [] } = useFamilyMembers();
  const { data: categories = [] } = useCategoriesHierarchical();
  const createTransaction = useCreateTransaction();

  const availableMembers = familyMembers.filter(m => m.linked_user_id !== user?.id);

  // Gerar lista de meses (12 meses: atual + 11 próximos)
  const availableMonths = Array.from({ length: 12 }, (_, i) => {
    const date = dateFns.addMonths(new Date(), i);
    return {
      value: dateFns.format(date, 'yyyy-MM'),
      label: dateFns.format(date, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase()),
    };
  });

  useEffect(() => {
    if (isOpen) {
      const nextMonths = [];
      const today = new Date();
      
      for (let i = 0; i < 12; i++) {
        const targetDate = new Date(year, i, 1);
        let isPast = false;
        if (year < today.getFullYear() || (year === today.getFullYear() && i < today.getMonth())) {
          isPast = true;
        } else if (year === today.getFullYear() && i === today.getMonth()) {
          const closingDay = account?.closing_day || 1;
          if (today.getDate() >= closingDay) {
            isPast = true;
          }
        }
        const monthName = targetDate.toLocaleDateString('pt-BR', { month: 'long' });
        const label = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
        
        nextMonths.push({
          date: formatLocalDate(targetDate),
          label,
          amount: '',
          isPast
        });
      }
      setMonths(nextMonths);
    }
  }, [isOpen, year, account]);

  useEffect(() => {
    if (isOpen && availableMembers.length > 0 && !assigneeId) {
      setAssigneeId(availableMembers[0].id);
    }
  }, [isOpen, availableMembers, assigneeId]);

  const handleAmountChange = (index: number, value: string) => {
    if (months[index].isPast) return;
    const newMonths = [...months];
    newMonths[index].amount = value;
    setMonths(newMonths);
  };

  const handleSaveGlobal = () => {
    const transactionsToCreate = months
      .filter(m => m.amount && parseFloat(m.amount) > 0)
      .map(m => {
        const [y, month] = m.date.split('-').map(Number);
        const closingDay = account.closing_day || 1;
        const transactionDate = new Date(y, month - 1, closingDay);
        
        return {
          date: formatLocalDate(transactionDate),
          competence_date: formatLocalDate(new Date(y, month - 1, 1)),
          amount: parseFloat(m.amount),
          type: "EXPENSE",
          description: `Fatura Importada - ${m.label}`,
          account_id: account.id,
          domain: "PERSONAL",
        };
      });

    if (transactionsToCreate.length > 0) {
      onImport(transactionsToCreate);
    }
  };

  const handleSaveInstallments = async () => {
    const valueNum = parseFloat(instValue.replace(/\./g, '').replace(',', '.')); // in case user types with comma
    const currNum = parseInt(currentInst);
    const totNum = parseInt(totalInst);

    if (!desc || isNaN(valueNum) || valueNum <= 0 || isNaN(currNum) || isNaN(totNum) || currNum > totNum) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }

    if (isShared && !assigneeId) {
      toast.error("Selecione um membro para compartilhar.");
      return;
    }

    setIsSubmitting(true);

    try {
      const [yearStr, monthStr] = selectedMonth.split('-');
      
      // Criamos a transação num dia anterior ao fechamento para que a competência (fatura)
      // caia exatamente no mês selecionado, de acordo com o ciclo do cartão.
      const closingDay = account?.closing_day || 1;
      const transactionDate = new Date(Number(yearStr), Number(monthStr) - 1, closingDay - 1);
      const transactionDateStr = formatLocalDate(transactionDate);

      // Quantas parcelas vamos criar
      const installmentsToCreate = totNum - currNum + 1;
      const totalRemainingAmount = valueNum * installmentsToCreate;

      const baseTransaction = {
        amount: totalRemainingAmount,
        description: desc,
        date: transactionDateStr,
        type: "EXPENSE" as const,
        account_id: account.id,
        category_id: categoryId || undefined,
        domain: isShared ? ("SHARED" as const) : ("PERSONAL" as const),
        is_installment: true,
        current_installment: currNum,
        total_installments: totNum,
        is_shared: isShared,
        splits: isShared ? [
          {
            member_id: user!.id,
            percentage: 100 - assigneePercentage,
            amount: totalRemainingAmount * ((100 - assigneePercentage) / 100),
          },
          {
            member_id: assigneeId,
            percentage: assigneePercentage,
            amount: totalRemainingAmount * (assigneePercentage / 100),
          }
        ] : undefined
      };

      await createTransaction.mutateAsync(baseTransaction);

      toast.success("Parcelas criadas com sucesso!");
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao criar parcelas.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calcular data da última parcela
  let lastInstallmentText = '';
  if (selectedMonth && currentInst && totalInst) {
    const installmentsToCreate = parseInt(totalInst) - parseInt(currentInst) + 1;
    if (installmentsToCreate >= 1) {
      const [year, month] = selectedMonth.split('-').map(Number);
      const baseDate = new Date(year, month - 1, 1);
      const lastDate = dateFns.addMonths(baseDate, installmentsToCreate - 1);
      lastInstallmentText = dateFns.format(lastDate, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase());
    }
  }

  // Valores da divisão
  const parsedValue = parseFloat(instValue) || 0;
  const assigneeParcelAmount = (parsedValue * assigneePercentage) / 100;
  const creatorParcelAmount = parsedValue - assigneeParcelAmount;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col no-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Importar Transações - {account?.name}</span>
          </DialogTitle>
          <DialogDescription>
            Escolha como deseja importar compras para este cartão.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          {/* Aba 'global' removida provisoriamente conforme solicitado */}
          <TabsList className="grid w-full grid-cols-1 hidden">
            <TabsTrigger value="installment">Compra Parcelada</TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="flex-1 overflow-hidden flex flex-col mt-4">
            <div className="flex items-center justify-center gap-4 py-1">
              <Button variant="ghost" size="icon" onClick={() => setYear(y => y - 1)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="text-lg font-bold font-mono">{year}</span>
              <Button variant="ghost" size="icon" onClick={() => setYear(y => y + 1)}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 py-2 no-scrollbar pr-2">
              {months.map((month, index) => (
                <div key={month.date} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3 flex-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{month.label}</span>
                  </div>
                  <div className="w-32">
                    {month.isPast ? (
                      <span className="text-xs text-muted-foreground">Encerrado</span>
                    ) : (
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="0,00"
                          value={month.amount}
                          onChange={(e) => handleAmountChange(index, e.target.value)}
                          className="pl-7 h-8 text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="mt-4 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
              <Button 
                onClick={handleSaveGlobal}
                disabled={!months.some(m => m.amount && parseFloat(m.amount) > 0) || isSubmitting}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Faturas
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="installment" className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col mt-4 space-y-4 no-scrollbar pr-2 pb-4">
            <div className="space-y-4 px-1">
              <div className="space-y-2">
                <Label>Descrição da Compra</Label>
                <Input placeholder="Ex: TV Nova" value={desc} onChange={e => setDesc(e.target.value)} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mês da Próxima Parcela</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMonths.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor da Parcela (R$)</Label>
                  <Input type="number" step="0.01" placeholder="0,00" value={instValue} onChange={e => setInstValue(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Parcela Atual (Ex: 3)</Label>
                  <Input type="number" value={currentInst} onChange={e => setCurrentInst(e.target.value)} min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Total de Parcelas (Ex: 10)</Label>
                  <Input type="number" value={totalInst} onChange={e => setTotalInst(e.target.value)} min="2" />
                </div>
              </div>

              {lastInstallmentText && (
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-border/50">
                  <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Última Parcela</p>
                    <p className="text-muted-foreground">A última parcela será em <strong>{lastInstallmentText}</strong>.</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Categoria</Label>
                <CategorySelector
                  categories={categories}
                  value={categoryId}
                  onValueChange={setCategoryId}
                  type="expense"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    É uma compra compartilhada?
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    O valor total fica no cartão, mas a outra pessoa ficará com saldo devedor para você nas Contas Compartilhadas.
                  </p>
                </div>
                <Switch 
                  checked={isShared}
                  onCheckedChange={setIsShared}
                />
              </div>

              {isShared && (
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <Label>Com quem você dividiu?</Label>
                    <Select value={assigneeId} onValueChange={setAssigneeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um membro" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Porcentagem da outra pessoa ({assigneePercentage}%)</Label>
                      <span className="text-sm font-medium text-primary">
                        {formatCurrency(assigneeParcelAmount)} / parcela
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="99"
                      value={assigneePercentage}
                      onChange={(e) => setAssigneePercentage(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Sua parte: {formatCurrency(creatorParcelAmount)} ({(100 - assigneePercentage).toFixed(0)}%)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-auto pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
              <Button onClick={handleSaveInstallments} disabled={!desc || !instValue || parseFloat(instValue) <= 0 || isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Importar Parcelas
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
