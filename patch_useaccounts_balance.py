import sys

content = open('src/hooks/useAccounts.ts', 'r', encoding='utf-8').read()

old_code = '''              if (sc.credit_limit !== null && sc.credit_limit !== undefined) {
                acc.credit_limit = sc.credit_limit;
              }
              // Marca como compartilhado (útil para a UI saber se o usuário não é o dono original)
              acc.is_shared_with_me = true;'''
new_code = '''              if (sc.credit_limit !== null && sc.credit_limit !== undefined) {
                acc.credit_limit = sc.credit_limit;
              }
              // Marca como compartilhado (útil para a UI saber se o usuário não é o dono original)
              acc.is_shared_with_me = true;
              
              // Zera o balance global da conta para que os gastos do dono original
              // não apareçam como dívidas para o convidado (data leak).
              // O saldo do convidado deve ser calculado apenas pelos seus próprios lançamentos.
              acc.balance = 0;'''

content = content.replace(old_code, new_code)
open('src/hooks/useAccounts.ts', 'w', encoding='utf-8').write(content)
print("Updated useAccounts.ts to fix balance leakage")
