import sys

content = open('src/hooks/useAccounts.ts', 'r', encoding='utf-8').read()
old_code = '''        const sharedAccounts = sharedData
          .map((sc: any) => sc.accounts)
          .filter(Boolean)
          // Assegurar que só adicione cartões que não estão deletados e estão ativos
          .filter((a: any) => a.is_active === true && a.deleted !== true);'''
new_code = '''        const sharedAccounts = sharedData
          .map((sc: any) => Array.isArray(sc.accounts) ? sc.accounts[0] : sc.accounts)
          .filter(Boolean)
          // Assegurar que só adicione cartões que não estão deletados e estão ativos
          .filter((a: any) => a.is_active === true && a.deleted !== true);'''
content = content.replace(old_code, new_code)
open('src/hooks/useAccounts.ts', 'w', encoding='utf-8').write(content)
print("Done")
