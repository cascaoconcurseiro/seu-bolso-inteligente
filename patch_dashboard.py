import sys

content = open('src/pages/Dashboard.tsx', 'r', encoding='utf-8').read()

import_hook = 'import { PendingTripInvitationsAlert } from "@/components/trips/PendingTripInvitationsAlert";\nimport { PendingSharedCardInvitationsAlert } from "@/components/credit-cards/PendingSharedCardInvitationsAlert";\n'
content = content.replace('import { PendingTripInvitationsAlert } from "@/components/trips/PendingTripInvitationsAlert";\n', import_hook)

alert_hook = '<PendingTripInvitationsAlert />\n        <PendingSharedCardInvitationsAlert />\n'
content = content.replace('<PendingTripInvitationsAlert />\n', alert_hook)

open('src/pages/Dashboard.tsx', 'w', encoding='utf-8').write(content)
print('Done!')
