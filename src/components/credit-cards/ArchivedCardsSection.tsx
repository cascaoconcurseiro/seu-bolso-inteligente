import { Button } from "@/components/ui/button";
import { Archive, ChevronDown, RotateCcw } from "lucide-react";
import { getBankById } from "@/lib/banks";
import { BankIcon } from "@/components/financial/BankIcon";

interface ArchivedCardsSectionProps {
  archivedCards: any[];
  formatCurrency: (value: number) => string;
  onUnarchive: (id: string) => void;
  isUnarchiving: boolean;
}

export function ArchivedCardsSection({
  archivedCards,
  formatCurrency,
  onUnarchive,
  isUnarchiving
}: ArchivedCardsSectionProps) {
  const cards = archivedCards.filter(c => c.type === 'CREDIT_CARD');
  
  if (cards.length === 0) return null;

  return (
    <div className="space-y-4">
      <details className="group">
        <summary className="flex items-center justify-between cursor-pointer list-none p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Cartões Arquivados ({cards.length})
          </span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {cards.map((card) => {
            const bank = getBankById(card.bank_id);
            return (
              <div
                key={card.id}
                className="p-4 rounded-xl border border-border bg-muted/30"
                style={{ borderColor: bank.color + '40' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <BankIcon bankId={card.bank_id} accountName={card.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{card.name}</p>
                      <p className="text-xs text-muted-foreground">Cartão de Crédito</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Saldo:</span>
                    <span className="font-mono text-sm font-semibold text-destructive">
                      {formatCurrency(Math.abs(Number(card.balance)))}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUnarchive(card.id)}
                    disabled={isUnarchiving}
                    className="w-full gap-2"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Desarquivar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}
