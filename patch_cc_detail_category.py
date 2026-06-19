import sys

content = open('src/components/credit-cards/CreditCardDetailView.tsx', 'r', encoding='utf-8').read()

# 1. Add getInvoiceData import
if 'getInvoiceData' not in content:
    content = content.replace('import * as dateFns', 'import { getInvoiceData } from "@/lib/invoiceUtils";\nimport * as dateFns')

# 2. Add localInvoiceData computation
old_card_tx = '''  const cardTransactions = useMemo(() => {
    if (!isOwner || sharedCards.length === 0) return myTransactions;
    if (activeTab === "all") return [...myTransactions, ...dependentTransactionsForCard];
    if (activeTab === "mine") return myTransactions;
    // For a specific dependent:
    return dependentTransactionsForCard.filter(t => t.user_id === activeTab);
  }, [isOwner, sharedCards.length, activeTab, myTransactions, dependentTransactionsForCard]);'''

new_card_tx = '''  const cardTransactions = useMemo(() => {
    if (!isOwner || sharedCards.length === 0) return myTransactions;
    if (activeTab === "all") return [...myTransactions, ...dependentTransactionsForCard];
    if (activeTab === "mine") return myTransactions;
    // For a specific dependent:
    return dependentTransactionsForCard.filter(t => t.user_id === activeTab);
  }, [isOwner, sharedCards.length, activeTab, myTransactions, dependentTransactionsForCard]);

  // Recalculate invoice based on selected tab transactions
  const localInvoiceData = React.useMemo(() => {
    // invoiceData originally comes from props (which is global), but we override it locally for tabs!
    const baseData = getInvoiceData(selectedCard, cardTransactions, selectedDate);
    // Preservar propriedades do invoiceData recebido via prop (como status) caso a gente não tenha calculado
    return { ...baseData, status: invoiceData?.status || baseData.status };
  }, [selectedCard, cardTransactions, selectedDate, invoiceData?.status]);

  // Calculate category summary for the current tab
  const categorySummary = React.useMemo(() => {
    const summary: Record<string, { amount: number, name: string, icon: string, color: string }> = {};
    let totalExpenses = 0;
    
    // Only use expenses that belong to the current invoice
    localInvoiceData.transactions.forEach(t => {
      if (t.type === 'EXPENSE' || (t.type === 'TRANSFER' && t.account_id === selectedCard.id)) {
        const catId = t.category_id || 'uncategorized';
        const catName = t.category?.name || 'Outros';
        const catIcon = t.category?.icon || 'help-circle';
        // Assign a random color if needed, or use a default
        const amount = Number(t.amount);
        
        if (!summary[catId]) {
          summary[catId] = { amount: 0, name: catName, icon: catIcon, color: 'bg-muted' };
        }
        summary[catId].amount += amount;
        totalExpenses += amount;
      }
    });
    
    return Object.values(summary).sort((a, b) => b.amount - a.amount).map(cat => ({
      ...cat,
      percent: totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0
    }));
  }, [localInvoiceData.transactions, selectedCard.id]);'''

content = content.replace(old_card_tx, new_card_tx)

# 3. Replace all usage of invoiceData with localInvoiceData (but only in the body, not in props!)
# Instead of a global replace, I'll be careful:
content = content.replace('invoiceData.invoiceTotal', 'localInvoiceData.invoiceTotal')
content = content.replace('invoiceData.status', 'localInvoiceData.status')
content = content.replace('invoiceData.dueDate', 'localInvoiceData.dueDate')
content = content.replace('invoiceData.transactions', 'localInvoiceData.transactions')
content = content.replace('invoiceData?.invoiceTotal', 'localInvoiceData?.invoiceTotal')
content = content.replace('invoiceData?.status', 'localInvoiceData?.status')

# 4. Inject Category Summary UI
# Right before the transactions list:
#     <div className="flex items-center justify-between mt-8 mb-4">
#        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
#          <Wallet className="h-5 w-5 text-primary" /> Fatura Atual
#        </h3>

category_ui = '''
      {categorySummary.length > 0 && (
        <div className="mt-6 mb-2 p-4 rounded-2xl border border-border/50 bg-card/30">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Resumo por Categoria</h4>
          <div className="space-y-3">
            {categorySummary.slice(0, 4).map((cat, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center shrink-0">
                  <span className="text-sm font-medium">{cat.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{cat.name}</span>
                    <span className="text-sm font-semibold">{formatCurrency(cat.amount)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${cat.percent}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
'''

transactions_header = '''      <div className="flex items-center justify-between mt-8 mb-4">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" /> Fatura Atual
        </h3>'''

content = content.replace(transactions_header, category_ui + '\n' + transactions_header)

open('src/components/credit-cards/CreditCardDetailView.tsx', 'w', encoding='utf-8').write(content)
print("Updated CreditCardDetailView.tsx with localInvoiceData and categorySummary")
