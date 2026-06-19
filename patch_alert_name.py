import sys

# 1. Update useSharedCreditCards.ts
content_hooks = open('src/hooks/useSharedCreditCards.ts', 'r', encoding='utf-8').read()
old_select = '.select("*, user:profiles!shared_credit_cards_user_id_fkey(full_name, email)");'
new_select = '.select("*, user:profiles!shared_credit_cards_user_id_fkey(full_name, email), accounts(name)");'
content_hooks = content_hooks.replace(old_select, new_select)
open('src/hooks/useSharedCreditCards.ts', 'w', encoding='utf-8').write(content_hooks)

# 2. Update PendingSharedCardInvitationsAlert.tsx
content_alert = open('src/components/credit-cards/PendingSharedCardInvitationsAlert.tsx', 'r', encoding='utf-8').read()
old_alert_text = 'Você foi convidado(a) para participar de um cartão de crédito. Ao aceitar, vocês poderão dividir faturas.'
new_alert_text = 'Você foi convidado(a) para participar do cartão de crédito <b>{invite.accounts?.name || \'Compartilhado\'}</b>. Ao aceitar, vocês poderão dividir faturas.'
content_alert = content_alert.replace(old_alert_text, new_alert_text)
open('src/components/credit-cards/PendingSharedCardInvitationsAlert.tsx', 'w', encoding='utf-8').write(content_alert)

print('Done!')
