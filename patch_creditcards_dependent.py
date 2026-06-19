import sys

content = open('src/pages/CreditCards.tsx', 'r', encoding='utf-8').read()

# Add import
import_stmt = 'import { useDependentTransactions } from "@/hooks/transactions/useDependentTransactions";\n'
content = content.replace('import { useTransactions } from "@/hooks/transactions";', 'import { useTransactions } from "@/hooks/transactions";\n' + import_stmt)

# Add hook call
hook_call = '''  const { data: transactions = [], isLoading: transactionsLoading, refetch: refetchTransactions } = useTransactions({
    startDate: extendedStartDate,
    endDate: extendedEndDate,
    limit: 5000,
  });

  const ownedCardIds = useMemo(() => creditCards.filter(c => !c.is_shared_with_me).map(c => c.id), [creditCards]);
  const { data: dependentTransactions = [] } = useDependentTransactions({
    cardIds: ownedCardIds,
    startDate: extendedStartDate,
    endDate: extendedEndDate,
  });'''
content = content.replace('''  const { data: transactions = [], isLoading: transactionsLoading, refetch: refetchTransactions } = useTransactions({
    startDate: extendedStartDate,
    endDate: extendedEndDate,
    limit: 5000,
  });''', hook_call)

# Add to CreditCardDetailView
old_view = '<CreditCardDetailView\n          selectedCard={selectedCard}'
new_view = '<CreditCardDetailView\n          selectedCard={selectedCard}\n          dependentTransactions={dependentTransactions}'
content = content.replace(old_view, new_view)

open('src/pages/CreditCards.tsx', 'w', encoding='utf-8').write(content)
print("Updated CreditCards.tsx with useDependentTransactions")
