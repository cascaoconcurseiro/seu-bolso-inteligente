import re

with open('src/components/transactions/form/useTransactionForm.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_check = r'''        const txDate = typeof tx.date === "string" ? parseISO(tx.date) : tx.date;
        const daysDiff = Math.abs(differenceInDays(txDate, date));
        
        // Exact day, exact amount, exact description
        return amountMatch && descMatch && daysDiff === 0;'''

new_check = '''        const txCreatedAt = tx.created_at ? new Date(tx.created_at) : (typeof tx.date === "string" ? parseISO(tx.date) : tx.date);
        // Calculate difference in minutes
        const minutesDiff = Math.abs((txCreatedAt.getTime() - new Date().getTime()) / 60000);
        
        // Exact amount, exact description, and created within the last 30 minutes
        return amountMatch && descMatch && minutesDiff <= 30;'''

if old_check in content:
    content = content.replace(old_check, new_check)
    with open('src/components/transactions/form/useTransactionForm.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated duplicate logic')
else:
    print('Could not find duplicate logic block')
