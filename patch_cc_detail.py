import sys

content = open('src/components/credit-cards/CreditCardDetailView.tsx', 'r', encoding='utf-8').read()

# Import useAuth
content = content.replace(
    'import { EmptyState } from "@/components/ui/empty-state";',
    'import { EmptyState } from "@/components/ui/empty-state";\nimport { useAuth } from "@/contexts/AuthContext";'
)

# Hook and isOwner check
old_hooks = """  const { data: sharedCards = [] } = useSharedCreditCards(selectedCard.id);
  const revokeMutation = useRevokeSharedCard();"""
new_hooks = """  const { user } = useAuth();
  const { data: sharedCards = [] } = useSharedCreditCards(selectedCard.id);
  const revokeMutation = useRevokeSharedCard();
  const isOwner = selectedCard.user_id === user?.id;"""
content = content.replace(old_hooks, new_hooks)

# Hide "Compartilhado com" list
old_shared_list = """            {sharedCards.length > 0 && ("""
new_shared_list = """            {isOwner && sharedCards.length > 0 && ("""
content = content.replace(old_shared_list, new_shared_list)

# Hide "Compartilhar" button
old_share_btn = """        {/* Share Button highlighted */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={() => setShowSharingDialog(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md flex items-center gap-2 px-4 transition-all hover:scale-105"
              >
                <Share2 className="h-4 w-4" />
                Compartilhar
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs space-y-2 p-3 bg-card text-card-foreground shadow-premium-sm border-border">
              <p className="font-bold text-sm">Dividindo os Gastos?</p>
              <p className="text-xs text-muted-foreground">
                Envie um link para o seu parceiro ou familiar para que ele possa acompanhar os lançamentos da fatura e lançar os próprios gastos nesse cartão em tempo real!
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>"""
new_share_btn = """        {/* Share Button highlighted */}
        {isOwner && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => setShowSharingDialog(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md flex items-center gap-2 px-4 transition-all hover:scale-105"
                >
                  <Share2 className="h-4 w-4" />
                  Compartilhar
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs space-y-2 p-3 bg-card text-card-foreground shadow-premium-sm border-border">
                <p className="font-bold text-sm">Dividindo os Gastos?</p>
                <p className="text-xs text-muted-foreground">
                  Envie um link para o seu parceiro ou familiar para que ele possa acompanhar os lançamentos da fatura e lançar os próprios gastos nesse cartão em tempo real!
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}"""
content = content.replace(old_share_btn, new_share_btn)

open('src/components/credit-cards/CreditCardDetailView.tsx', 'w', encoding='utf-8').write(content)
print("Updated CreditCardDetailView.tsx")
