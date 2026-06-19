import sys

content = open('src/hooks/useSharedCreditCards.ts', 'r', encoding='utf-8').read()

old_query = '.select("*, user:profiles!shared_credit_cards_user_id_fkey(full_name, email, avatar_url), accounts(name)");'
new_query = '.select("*, user:profiles!shared_credit_cards_user_id_fkey(full_name, email, avatar_url, avatar_icon, avatar_color), accounts(name)");'
content = content.replace(old_query, new_query)

open('src/hooks/useSharedCreditCards.ts', 'w', encoding='utf-8').write(content)
print("Updated useSharedCreditCards.ts with avatar_icon and avatar_color")
