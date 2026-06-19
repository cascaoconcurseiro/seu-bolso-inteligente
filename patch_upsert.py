import sys

content = open('src/hooks/useSharedCreditCards.ts', 'r', encoding='utf-8').read()

old_insert = '''        .insert({
          account_id: accountId,
          user_id: userId,
          status: 'PENDING',
        })'''
new_insert = '''        .upsert({
          account_id: accountId,
          user_id: userId,
          status: 'PENDING',
        }, { onConflict: 'account_id,user_id' })'''

content = content.replace(old_insert, new_insert)

open('src/hooks/useSharedCreditCards.ts', 'w', encoding='utf-8').write(content)
print('Done!')
