
import { CreditCardSummary } from "@/components/credit-cards/CreditCardSummary";
import { CreditCardItem } from "@/components/credit-cards/CreditCardItem";

interface CreditCardsListProps {
  creditCards: any[];
  totalInvoices: number;
  totalDebt: number;
  nextDueDate: number;
  formatCurrency: (value: number) => string;
  getCardInvoice: (card: any) => { value: number; dueDate: Date | null; status: string };
  isLoading: boolean;
  onRefresh: () => void;
  onSelectCard: (card: any) => void;
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
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
