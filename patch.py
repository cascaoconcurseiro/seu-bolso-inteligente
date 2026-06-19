import sys

content = open('src/pages/CreditCards.tsx', 'r', encoding='utf-8').read()

import_str = 'import { ShareCardDialog } from "@/components/credit-cards/ShareCardDialog";\nimport { PendingSharedCardInvitationsAlert } from "@/components/credit-cards/PendingSharedCardInvitationsAlert";\nimport { moneyUtils } from "@/utils/money";'

content = content.replace('import { ShareCardDialog } from "@/components/credit-cards/ShareCardDialog";\nimport { moneyUtils } from "@/utils/money";', import_str)

list_view_str = '  if (view === "list") return (\n    <div className="space-y-6 pb-20 sm:pb-6 fade-in max-w-3xl mx-auto">\n      <PendingSharedCardInvitationsAlert />\n      \n      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">'

content = content.replace('  if (view === "list") return (\n    <div className="space-y-6 pb-20 sm:pb-6 fade-in max-w-3xl mx-auto">\n      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">', list_view_str)

open('src/pages/CreditCards.tsx', 'w', encoding='utf-8').write(content)
print('Done!')
