# 🧪 Teste do Zero - Sistema de Compartilhamento

**Data:** 27/12/2024  
**Status:** BANCO LIMPO - PRONTO PARA TESTAR

## ✅ Limpeza Realizada

- ✅ Todas as transações compartilhadas deletadas
- ✅ Todos os splits deletados
- ✅ Todos os membros da família deletados
- ✅ Todas as famílias deletadas
- ✅ Usuários mantidos: Wesley e Fran

## 📋 Passo a Passo para Teste

### PASSO 1: Wesley Cria uma Transação Compartilhada

1. **Login como Wesley** (wesley.diaslima@gmail.com)
2. Ir em "Transações" → "Nova transação"
3. Criar uma transação:
   - Descrição: "Teste 1 - Wesley"
   - Valor: R$ 100,00
   - Tipo: Despesa
   - **Marcar "Dividir com família"**
   - Selecionar "Fran" (deve aparecer na lista)
   - Valor do split: R$ 50,00 (metade)
4. Salvar

**Resultado Esperado:**
- ✅ Transação criada com sucesso
- ✅ 1 split criado para Fran
- ✅ 1 transação espelho criada para Fran (via trigger)

### PASSO 2: Verificar no Wesley

1. Ir em "Compartilhados"
2. Verificar se aparece:
   - **Membro:** Fran
   - **CREDIT:** R$ 50,00 (Fran deve a ele)
   - **Saldo:** +R$ 50,00

### PASSO 3: Verificar na Fran

1. **Fazer logout do Wesley**
2. **Login como Fran** (francy.von@gmail.com)
3. Ir em "Compartilhados"
4. Verificar se aparece:
   - **Membro:** Wesley
   - **DEBIT:** R$ 50,00 (ela deve a ele)
   - **Saldo:** -R$ 50,00

### PASSO 4: Fran Cria uma Transação Compartilhada

1. Ainda como Fran, ir em "Transações" → "Nova transação"
2. Criar uma transação:
   - Descrição: "Teste 2 - Fran"
   - Valor: R$ 80,00
   - Tipo: Despesa
   - **Marcar "Dividir com família"**
   - Selecionar "Wesley"
   - Valor do split: R$ 40,00 (metade)
3. Salvar

**Resultado Esperado:**
- ✅ Transação criada com sucesso
- ✅ 1 split criado para Wesley
- ✅ 1 transação espelho criada para Wesley (via trigger)

### PASSO 5: Verificar na Fran

1. Ir em "Compartilhados"
2. Verificar se aparece:
   - **Membro:** Wesley
   - **CREDIT:** R$ 40,00 (Wesley deve a ela)
   - **DEBIT:** R$ 50,00 (ela deve a ele)
   - **Saldo:** -R$ 10,00 (ela deve R$ 10 no total)

### PASSO 6: Verificar no Wesley

1. **Fazer logout da Fran**
2. **Login como Wesley**
3. Ir em "Compartilhados"
4. Verificar se aparece:
   - **Membro:** Fran
   - **CREDIT:** R$ 50,00 (Fran deve a ele)
   - **DEBIT:** R$ 40,00 (ele deve a ela)
   - **Saldo:** +R$ 10,00 (ele recebe R$ 10 no total)

## 🎯 Checklist de Sucesso

### Funcionalidades Básicas
- [ ] Wesley consegue criar transação compartilhada
- [ ] Fran consegue criar transação compartilhada
- [ ] Trigger cria espelhos automaticamente
- [ ] Splits são criados corretamente

### Visualização
- [ ] Wesley vê transações que ele criou (CREDIT)
- [ ] Wesley vê transações que Fran criou (DEBIT)
- [ ] Fran vê transações que ela criou (CREDIT)
- [ ] Fran vê transações que Wesley criou (DEBIT)

### Cálculos
- [ ] Saldos estão corretos
- [ ] Valores dos splits estão corretos
- [ ] Totais batem

### Interface
- [ ] Não aparece "(você)" ao lado do nome do membro
- [ ] Não aparece o próprio usuário na lista de membros
- [ ] Console sem erros

## 🚨 Se Algo Falhar

### Erro: "Payer user_id not found"
- Problema: RLS bloqueando acesso às source transactions
- Solução: Verificar se a policy foi aplicada corretamente

### Erro: Transação não aparece para o outro usuário
- Problema: Trigger não disparou ou espelho não foi criado
- Solução: Verificar logs do Supabase

### Erro: Membro não aparece na lista
- Problema: Família não foi criada automaticamente
- Solução: Verificar se o trigger de auto-conexão está funcionando

## 📊 Queries de Diagnóstico

```sql
-- Ver todas as transações compartilhadas
SELECT id, description, user_id, is_shared, source_transaction_id
FROM transactions
WHERE is_shared = true
ORDER BY created_at DESC;

-- Ver todos os splits
SELECT ts.*, t.description
FROM transaction_splits ts
JOIN transactions t ON t.id = ts.transaction_id
ORDER BY ts.created_at DESC;

-- Ver todos os membros
SELECT * FROM family_members
ORDER BY name;

-- Ver todas as famílias
SELECT * FROM families;
```

---

**Última Atualização:** 27/12/2024  
**Status:** Pronto para teste do zero
