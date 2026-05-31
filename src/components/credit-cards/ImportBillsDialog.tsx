import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar, DollarSign, Save, Info, HelpCircle } from "lucide-react";
import { formatLocalDate } from "@/utils/dateUtils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addMonths } from "date-fns";

type CreditCardAccount = any;

interface ImportBillsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  account: CreditCardAccount;
  onImport: (transactions: unknown[]) => void;
}

export function ImportBillsDialog({ isOpen, onClose, account, onImport }: ImportBillsDialogProps) {
  const [activeTab, setActiveTab] = useState("global");

  // Tab 1: Global state
  const [year, setYear] = useState(new Date().getFullYear());
  const [months, setMonths] = useState<{ date: string; label: string; amount: string; isPast: boolean }[]>([]);

  // Tab 2: Installments state
  const [desc, setDesc] = useState("");
  const [instValue, setInstValue] = useState("");
  const [currentInst, setCurrentInst] = useState("1");
  const [totalInst, setTotalInst] = useState("2");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);

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

  const handleSaveInstallments = () => {
    const valueNum = parseFloat(instValue);
    const currNum = parseInt(currentInst);
    const totNum = parseInt(totalInst);

    if (!desc || isNaN(valueNum) || valueNum <= 0 || isNaN(currNum) || isNaN(totNum) || currNum > totNum) {
      return;
    }

    const transactionsToCreate = [];
    let baseDate = new Date(purchaseDate);
    // Ajusta baseDate pra não pegar UTC errado e perder um dia
    baseDate = new Date(baseDate.getTime() + baseDate.getTimezoneOffset() * 60000);

    const closingDay = account.closing_day || 1;

    let iterationCompetence = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    if (baseDate.getDate() >= closingDay) {
      iterationCompetence = addMonths(iterationCompetence, 1);
    }

    for (let i = currNum; i <= totNum; i++) {
      const compDateStr = formatLocalDate(iterationCompetence);

      transactionsToCreate.push({
        date: purchaseDate, // a data de compra original se mantém
        competence_date: compDateStr,
        amount: valueNum,
        type: "EXPENSE",
        description: desc,
        account_id: account.id,
        domain: "PERSONAL",
        is_installment: true,
        current_installment: i,
        total_installments: totNum,
      });
      
      iterationCompetence = addMonths(iterationCompetence, 1);
    }

    if (transactionsToCreate.length > 0) {
      onImport(transactionsToCreate);
    }
  };

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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="global">Valores Mensais Globais</TabsTrigger>
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
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button 
                onClick={handleSaveGlobal}
                disabled={!months.some(m => m.amount && parseFloat(m.amount) > 0)}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Faturas
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="installment" className="flex-1 overflow-hidden flex flex-col mt-4 space-y-4">
            <div className="space-y-4 px-1 py-2 overflow-y-auto">
              <div className="space-y-2">
                <Label>Descrição da Compra</Label>
                <Input placeholder="Ex: TV Nova" value={desc} onChange={e => setDesc(e.target.value)} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data da Compra</Label>
                  <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Valor da Parcela (R$)</Label>
                  <Input type="number" placeholder="0,00" value={instValue} onChange={e => setInstValue(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Parcela Atual (ex: 3)</Label>
                  <Input type="number" value={currentInst} onChange={e => setCurrentInst(e.target.value)} min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Total de Parcelas (ex: 10)</Label>
                  <Input type="number" value={totalInst} onChange={e => setTotalInst(e.target.value)} min="2" />
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                <Info className="h-4 w-4 inline-block mr-2" />
                O sistema irá gerar automaticamente as parcelas restantes a partir do mês correto da fatura, cobrindo da parcela atual até a última.
              </div>
            </div>

            <DialogFooter className="mt-auto pt-4 border-t">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleSaveInstallments} disabled={!desc || !instValue || parseFloat(instValue) <= 0}>
                <Save className="h-4 w-4 mr-2" />
                Importar Parcelas
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
