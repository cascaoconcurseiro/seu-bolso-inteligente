import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar, DollarSign, Save, Info, HelpCircle } from "lucide-react";
import { formatLocalDate } from "@/utils/dateUtils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

type CreditCardAccount = any;

// Import Bills Dialog
interface ImportBillsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  account: CreditCardAccount;
  onImport: (transactions: unknown[]) => void;
}

export function ImportBillsDialog({ isOpen, onClose, account, onImport }: ImportBillsDialogProps) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [months, setMonths] = useState<{ date: string; label: string; amount: string; isPast: boolean }[]>([]);

  useEffect(() => {
    if (isOpen) {
      const nextMonths = [];
      const today = new Date();
      const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      for (let i = 0; i < 12; i++) {
        const targetDate = new Date(year, i, 1);
        let isPast = false;
        if (year < today.getFullYear() || (year === today.getFullYear() && i < today.getMonth())) {
          isPast = true;
        } else if (year === today.getFullYear() && i === today.getMonth()) {
          const closingDay = account.closing_day || 1;
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
  }, [isOpen, year]);

  const handleAmountChange = (index: number, value: string) => {
    if (months[index].isPast) return;
    const newMonths = [...months];
    newMonths[index].amount = value;
    setMonths(newMonths);
  };

  const handleSave = () => {
    const transactionsToCreate = months
      .filter(m => m.amount && parseFloat(m.amount) > 0)
      .map(m => {
        const [y, month] = m.date.split('-').map(Number);
        const closingDay = account.closing_day || 1;
        const transactionDate = new Date(y, month - 1, closingDay);
        
        return {
          date: formatLocalDate(transactionDate),
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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col no-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-12">
            <span>Importar Faturas</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 border bg-popover text-popover-foreground rounded-xl shadow-md z-50 font-normal">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-primary">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>O que é a Importação de Faturas?</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Esta funcionalidade serve para <strong>registrar valores globais estimados para faturas de cartão de crédito em andamento</strong>, ideal para provisão rápida de despesas recorrentes antes de lançar cada gasto individualmente.
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed font-semibold text-destructive bg-destructive/5 border border-destructive/10 rounded-lg p-2.5">
                    ⚠️ Atenção: Não serve para lançar parcelas de compras! Para compras parceladas de forma dividida, use a opção "Importar Parcelado" nas finanças compartilhadas.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </DialogTitle>
          <DialogDescription>
            Lançamento rápido do valor total estimado para as faturas de {account.name}
          </DialogDescription>
        </DialogHeader>

        {/* Year Selector */}
        <div className="flex items-center justify-center gap-4 py-1">
          <Button variant="ghost" size="icon" onClick={() => setYear(y => y - 1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-lg font-bold font-mono">{year}</span>
          <Button variant="ghost" size="icon" onClick={() => setYear(y => y + 1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Months List */}
        <div className="flex-1 overflow-y-auto space-y-2 py-2 no-scrollbar">
          {months.map((month, index) => (
            <div 
              key={month.date} 
              className="flex items-center gap-4 p-3 rounded-lg border border-border"
            >
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            onClick={handleSave}
            disabled={!months.some(m => m.amount && parseFloat(m.amount) > 0)}
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Faturas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

