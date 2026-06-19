import sys

content = open('src/components/credit-cards/CreditCardDetailView.tsx', 'r', encoding='utf-8').read()

import_hook = 'import { useSharedCreditCards } from "@/hooks/useSharedCreditCards";\nimport { UserAvatar } from "@/components/ui/user-avatar";\nimport { Badge } from "@/components/ui/badge";\n'
content = content.replace('import { Button } from "@/components/ui/button";', import_hook + 'import { Button } from "@/components/ui/button";')

hook_call = '  const { data: sharedCards = [] } = useSharedCreditCards(selectedCard.id);\n\n  const handleExportCard ='
content = content.replace('  const handleExportCard =', hook_call)

avatars_ui = '''
          <div className="flex flex-col">
            <h1 className="font-display font-bold text-2xl tracking-tight">{selectedCard.name}</h1>
            {sharedCards.length > 0 && (
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground mr-1">Compartilhado com:</span>
                {sharedCards.map(sc => (
                  <div key={sc.id} className="flex items-center gap-1 bg-secondary/50 rounded-full pr-2 pl-1 py-0.5 border">
                    <UserAvatar name={sc.user?.full_name || 'U'} size="xs" className="w-5 h-5 text-[10px]" />
                    <span className="text-[10px] font-medium max-w-[80px] truncate">{sc.user?.full_name?.split(' ')[0]}</span>
                    {sc.status === 'PENDING' && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-200 ml-1">Aguardando</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
'''
content = content.replace('''          <div>
            <h1 className="font-display font-bold text-2xl tracking-tight">{selectedCard.name}</h1>
          </div>''', avatars_ui)

open('src/components/credit-cards/CreditCardDetailView.tsx', 'w', encoding='utf-8').write(content)
print('Done!')
