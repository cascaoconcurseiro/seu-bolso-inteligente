import sys

content = open('src/components/credit-cards/CreditCardDetailView.tsx', 'r', encoding='utf-8').read()

# Add X to lucide-react import
content = content.replace('Share2 } from "lucide-react";', 'Share2, X } from "lucide-react";')

# Update useSharedCreditCards import
content = content.replace('import { useSharedCreditCards } from "@/hooks/useSharedCreditCards";', 'import { useSharedCreditCards, useRevokeSharedCard } from "@/hooks/useSharedCreditCards";')

# Add revokeMutation
content = content.replace('  const { data: sharedCards = [] } = useSharedCreditCards(selectedCard.id);\n\n  const handleExportCard =', '  const { data: sharedCards = [] } = useSharedCreditCards(selectedCard.id);\n  const revokeMutation = useRevokeSharedCard();\n\n  const handleExportCard =')

# Add the X button to the avatar pill
old_avatar_ui = '''                    {sc.status === 'PENDING' && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-200 ml-1">Aguardando</Badge>
                    )}
                  </div>'''
new_avatar_ui = '''                    {sc.status === 'PENDING' && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-200 ml-1">Aguardando</Badge>
                    )}
                    <button 
                      onClick={() => revokeMutation.mutate(sc.id)}
                      className="ml-1 hover:bg-destructive/10 text-destructive/70 hover:text-destructive rounded-full p-0.5 transition-colors"
                      title="Remover"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>'''
content = content.replace(old_avatar_ui, new_avatar_ui)

open('src/components/credit-cards/CreditCardDetailView.tsx', 'w', encoding='utf-8').write(content)
print('Done!')
