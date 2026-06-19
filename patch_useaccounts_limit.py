import sys

content = open('src/hooks/useAccounts.ts', 'r', encoding='utf-8').read()

old_code = '''        const sharedAccounts = sharedData
          .map((sc: any) => Array.isArray(sc.accounts) ? sc.accounts[0] : sc.accounts)
          .filter(Boolean)
          // Assegurar que só adicione cartões que não estão deletados e estão ativos
          .filter((a: any) => a.is_active === true && a.deleted !== true);'''

new_code = '''        const sharedAccounts = sharedData
          .map((sc: any) => {
            const acc = Array.isArray(sc.accounts) ? sc.accounts[0] : sc.accounts;
            if (acc) {
              // Override do limite de crédito com o limite personalizado do convite, se existir
              if (sc.credit_limit !== null && sc.credit_limit !== undefined) {
                acc.credit_limit = sc.credit_limit;
              }
              // Marca como compartilhado (útil para a UI saber se o usuário não é o dono original)
              acc.is_shared_with_me = true;
            }
            return acc;
          })
          .filter(Boolean)
          // Assegurar que só adicione cartões que não estão deletados e estão ativos
          .filter((a: any) => a.is_active === true && a.deleted !== true);'''

content = content.replace(old_code, new_code)
open('src/hooks/useAccounts.ts', 'w', encoding='utf-8').write(content)
print("Updated useAccounts.ts for credit_limit")
