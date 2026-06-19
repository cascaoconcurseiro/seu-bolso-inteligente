import sys
import re

content = open('src/components/credit-cards/CreditCardDetailView.tsx', 'r', encoding='utf-8').read()

# 1. Import Tabs
if 'Tabs,' not in content:
    content = content.replace('import { Badge } from "@/components/ui/badge";', 'import { Badge } from "@/components/ui/badge";\nimport { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";')

# 2. Add dependentTransactions to props
content = content.replace('allYearTransactions?: any[];', 'allYearTransactions?: any[];\n  dependentTransactions?: any[];')

# 3. Add to destructured props
content = content.replace('allYearTransactions = [],\n  canDelete = false,', 'allYearTransactions = [],\n  dependentTransactions = [],\n  canDelete = false,')

# 4. Add state for active tab and compute displayedTransactions
card_tx_logic = '''  const cardTransactions = useMemo(() => {
    return allYearTransactions.filter(t => t.account_id === selectedCard.id || t.destination_account_id === selectedCard.id);
  }, [allYearTransactions, selectedCard.id]);'''

new_card_tx_logic = '''  const [activeTab, setActiveTab] = React.useState("mine");

  const myTransactions = useMemo(() => {
    return allYearTransactions.filter(t => t.account_id === selectedCard.id || t.destination_account_id === selectedCard.id);
  }, [allYearTransactions, selectedCard.id]);

  const dependentTransactionsForCard = useMemo(() => {
    return dependentTransactions.filter(t => t.account_id === selectedCard.id || t.destination_account_id === selectedCard.id);
  }, [dependentTransactions, selectedCard.id]);

  const cardTransactions = useMemo(() => {
    if (!isOwner || sharedCards.length === 0) return myTransactions;
    if (activeTab === "all") return [...myTransactions, ...dependentTransactionsForCard];
    if (activeTab === "mine") return myTransactions;
    // For a specific dependent:
    return dependentTransactionsForCard.filter(t => t.user_id === activeTab);
  }, [isOwner, sharedCards.length, activeTab, myTransactions, dependentTransactionsForCard]);'''

content = content.replace(card_tx_logic, new_card_tx_logic)

# Make sure React is imported for React.useState
if 'import React' not in content and 'import * as React' not in content:
    content = 'import React from "react";\n' + content

# 5. Render Tabs UI
tabs_ui = '''      {/* Month Navigation */}'''

new_tabs_ui = '''      {/* Dependent Tabs (Only for owner of shared card) */}
      {isOwner && sharedCards.length > 0 && (
        <div className="bg-muted/30 p-1 rounded-xl mb-4 overflow-x-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start h-auto p-1 bg-transparent border-none">
              <TabsTrigger value="mine" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Meus Gastos</TabsTrigger>
              {sharedCards.map((sc: any) => (
                <TabsTrigger key={sc.user_id} value={sc.user_id} className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
                  <UserAvatar name={sc.user?.full_name || 'Conv.'} avatarUrl={sc.user?.avatar_url} iconId={sc.user?.avatar_icon} colorId={sc.user?.avatar_color} size="xs" />
                  <span className="truncate max-w-[80px]">{sc.user?.full_name?.split(' ')[0] || 'Convidado'}</span>
                </TabsTrigger>
              ))}
              <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Fatura Completa</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Month Navigation */}'''

content = content.replace(tabs_ui, new_tabs_ui)

open('src/components/credit-cards/CreditCardDetailView.tsx', 'w', encoding='utf-8').write(content)
print("Updated CreditCardDetailView.tsx with Tabs")
