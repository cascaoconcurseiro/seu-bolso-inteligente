import { Button } from "@/components/ui/button";
import { Plus, CreditCard } from "lucide-react";
import { CreditCardSummary } from "@/components/credit-cards/CreditCardSummary";
import { CreditCardItem } from "@/components/credit-cards/CreditCardItem";

interface CreditCardsListProps {
  creditCards: any[];
  totalInvoices: number;
  totalDebt: number;
  nextDueDate: Date | null;
  formatCurrency: (value: number) => string;
  getCardInvoice: (card: any) => { value: number; dueDate: Date | null; status: string };
  isLoading: boolean;
  onRefresh: () => void;
  onSelectCard: (card: any) => void;
  onNewCard: () => void;
}

export function CreditCardsList({
  creditCards,
  totalInvoices,
  totalDebt,
  nextDueDate,
  formatCurrency,
  getCardInvoice,
  isLoading,
  onRefresh,
  onSelectCard,
  onNewCard
}: CreditCardsListProps) {
  if (creditCards.length === 0) {
    return null; // O EmptyState é gerenciado no componente pai (CreditCards.tsx)
  }

  return (
    <>
      <CreditCardSummary 
        totalInvoices={totalInvoices} 
        totalDebt={totalDebt} 
        nextDueDate={nextDueDate} 
        formatCurrency={formatCurrency} 
        onRefresh={onRefresh} 
        isLoading={isLoading} 
      />
      <div className="space-y-3">
        {creditCards.map((card) => (
          <CreditCardItem 
            key={card.id} 
            card={card} 
            getCardInvoice={getCardInvoice} 
            formatCurrency={formatCurrency} 
            openCardDetail={onSelectCard} 
          />
        ))}
      </div>
    </>
  );
}
