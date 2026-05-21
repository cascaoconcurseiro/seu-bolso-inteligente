import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar, DollarSign, Save, Info } from "lucide-react";
import { formatLocalDate } from "@/utils/dateUtils";

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
        const isPast = targetDate < currentMonthStart;
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Faturas</DialogTitle>
          <DialogDescription>
            Lançamento rápido do valor total estimado para as faturas de {account.name}
          </DialogDescription>
        </DialogHeader>
        
        {/* Bloco Explicativo do Recurso */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-2 text-sm text-foreground">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Info className="h-4 w-4 shrink-0" />
            <span>O que é a Importação de Faturas?</span>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Esta funcionalidade serve para <strong>registrar valores já existentes ou despesas de cartão anteriores ao seu início no Pé de Meia</strong>, como parcelas que já estão em andamento ou compras antigas que você quer provisionar rapidamente.
          </p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            <strong>Exemplo Prático:</strong> Se você comprou uma geladeira parcelada em 10x e já pagou 4 parcelas antes de se cadastrar no sistema, restam 6 parcelas. A importação serve exatamente para registrar o valor estimado destas 6 parcelas futuras de forma ágil, sem ter que cadastrar toda a compra do passado.
          </p>
          <div className="pt-1 text-[11px] font-medium text-primary">
            💡 Dica: Ao preencher os valores nos meses correspondentes abaixo, o sistema planeja as faturas futuras de forma a manter as suas previsões matemáticas e de fluxo de caixa perfeitas.
          </div>
        </div>

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
        <div className="flex-1 overflow-y-auto space-y-2 py-2">
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

