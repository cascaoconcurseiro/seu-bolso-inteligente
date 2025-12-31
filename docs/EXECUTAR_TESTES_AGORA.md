# 🚀 EXECUTAR TESTES AGORA - GUIA RÁPIDO

## ⚠️ IMPORTANTE
O Docker Desktop não está rodando, então vamos executar os testes diretamente no banco de produção do Supabase.

---

## 📋 OPÇÃO 1: Testes Automatizados no Banco (10 minutos)

### Passo 1: Acessar Supabase Dashboard
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral esquerdo)

### Passo 2: Executar Script de Auditoria
1. Abra o arquivo: `docs/SCRIPT_AUDITORIA_COMPLETA_PRODUCAO.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **RUN** (ou pressione Ctrl+Enter)

### Passo 3: Analisar Resultados
O script vai gerar várias seções de resultados:

```
=== 1. TABELAS DO SISTEMA ===
[Lista de todas as tabelas]

=== 2. FOREIGN KEYS ===
[Lista de relacionamentos]

=== 3. VERIFICAÇÃO DE UNICIDADE ===
[Verifica duplicatas]

=== 4. INTEGRIDADE REFERENCIAL ===
[Verifica dados órfãos]

=== 5. VALIDAÇÃO FINANCEIRA ===
[Verifica valores incorretos]

... (continua até seção 15)

=== 15. RESUMO DE PROBLEMAS CRÍTICOS ===
[Resumo final com status]
```

### Passo 4: Interpretar Resultados

#### ✅ APROVADO se:
- Todos os problemas mostram `total = 0`
- Status mostra `✅ OK`
- Nenhum problema crítico encontrado

#### ⚠️ ATENÇÃO se:
- Alguns problemas mostram `total > 0` mas `< 5`
- Status mostra `⚠️ ATENÇÃO`
- Investigar e corrigir

#### ❌ CRÍTICO se:
- Problemas mostram `total > 5`
- Status mostra `❌ CRÍTICO`
- CORRIGIR ANTES DO LANÇAMENTO

---

## 📋 OPÇÃO 2: Testes Manuais Completos (4-6 horas)

### Preparação
1. Abra: `docs/CHECKLIST_TESTES_PRODUCAO_COMPLETO.md`
2. Acesse o sistema em: https://seu-dominio.vercel.app
3. Tenha 2 usuários de teste prontos (para testar compartilhamento)

### Execução
Siga o checklist seção por seção:

```
✅ 1. AUTENTICAÇÃO E PERFIL
   [ ] Criar nova conta
   [ ] Fazer login
   [ ] Editar perfil
   [ ] Alterar senha
   ...

✅ 2. CONTAS BANCÁRIAS
   [ ] Criar conta corrente
   [ ] Criar conta poupança
   [ ] Criar conta internacional
   ...

✅ 3. CARTÕES DE CRÉDITO
   [ ] Criar cartão
   [ ] Ver fatura
   [ ] Pagar fatura
   ...

... (continua até seção 20)
```

Marque cada item após testar: `[ ]` → `[x]`

---

## 📋 OPÇÃO 3: Testes Rápidos Essenciais (30 minutos)

Se você tem pouco tempo, teste apenas os fluxos críticos:

### 1. Autenticação (2 min)
- [ ] Login funciona
- [ ] Logout funciona
- [ ] Redirecionamento correto

### 2. Transação Normal (3 min)
- [ ] Criar despesa simples
- [ ] Verificar que saldo atualiza
- [ ] Editar transação
- [ ] Excluir transação

### 3. Transação Compartilhada (5 min)
- [ ] Criar despesa compartilhada
- [ ] Dividir 50/50 com membro
- [ ] Verificar que transação espelhada foi criada
- [ ] Verificar saldo na aba Compartilhados

### 4. Transação Parcelada (5 min)
- [ ] Criar despesa parcelada (3x)
- [ ] Verificar que 3 parcelas foram criadas
- [ ] Verificar datas corretas
- [ ] Verificar valores corretos

### 5. Viagem (5 min)
- [ ] Criar viagem
- [ ] Adicionar membro
- [ ] Criar transação na viagem
- [ ] Verificar orçamento

### 6. Transferência (3 min)
- [ ] Transferir entre contas
- [ ] Verificar que saldo saiu da origem
- [ ] Verificar que saldo entrou no destino

### 7. Cartão de Crédito (3 min)
- [ ] Criar cartão
- [ ] Criar despesa no cartão
- [ ] Verificar fatura

### 8. Cálculos (4 min)
- [ ] Verificar saldo total
- [ ] Verificar receitas do mês
- [ ] Verificar despesas do mês
- [ ] Verificar projeção mensal

---

## 🔍 TESTES ESPECÍFICOS POR FUNCIONALIDADE

### Teste: Transação Compartilhada Completa
```
1. Login como Usuário A
2. Criar despesa de R$ 100,00
3. Marcar como compartilhada
4. Selecionar Usuário B (50%)
5. Salvar
6. Verificar:
   ✅ Transação criada
   ✅ Split criado (R$ 50,00)
   ✅ Transação espelhada criada para Usuário B
   ✅ Ledger entries criadas (DEBIT e CREDIT)
   ✅ Saldo em Compartilhados mostra +R$ 50,00 (A recebe de B)
7. Login como Usuário B
8. Verificar:
   ✅ Transação espelhada aparece na lista
   ✅ Descrição indica "Paga por [Nome A]"
   ✅ Saldo em Compartilhados mostra -R$ 50,00 (B deve para A)
```

### Teste: Parcelamento com Compartilhamento
```
1. Criar despesa de R$ 300,00
2. Parcelar em 3x (R$ 100,00 cada)
3. Marcar como compartilhada
4. Dividir 50/50 com membro
5. Verificar:
   ✅ 3 parcelas criadas
   ✅ Cada parcela tem R$ 100,00
   ✅ Cada parcela tem split de R$ 50,00
   ✅ 3 transações espelhadas criadas
   ✅ Cada espelhada tem R$ 50,00
```

### Teste: Viagem com Câmbio
```
1. Criar viagem em USD
2. Registrar câmbio: R$ 1.000,00 → $200 (taxa 5.0)
3. Criar despesa de $50 na viagem
4. Verificar:
   ✅ Saldo em USD aumentou $200
   ✅ Saldo em BRL diminuiu R$ 1.000,00
   ✅ Despesa de $50 registrada
   ✅ Saldo em USD agora é $150
```

### Teste: Integridade de Dados
```
1. Criar transação compartilhada
2. Verificar no banco (SQL Editor):
   
   -- Verificar transação original
   SELECT * FROM transactions WHERE id = '[id-da-transacao]';
   
   -- Verificar splits
   SELECT * FROM transaction_splits WHERE transaction_id = '[id-da-transacao]';
   
   -- Verificar transações espelhadas
   SELECT * FROM transactions WHERE source_transaction_id = '[id-da-transacao]';
   
   -- Verificar ledger
   SELECT * FROM financial_ledger WHERE transaction_id = '[id-da-transacao]';
   
3. Confirmar:
   ✅ 1 transação original
   ✅ N splits (um para cada membro)
   ✅ N transações espelhadas
   ✅ 2N ledger entries (DEBIT + CREDIT para cada split)
```

---

## 🐛 PROBLEMAS COMUNS E SOLUÇÕES

### Problema: "Transação compartilhada sem splits"
```sql
-- Verificar
SELECT * FROM transactions 
WHERE is_shared = TRUE 
  AND source_transaction_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM transaction_splits 
    WHERE transaction_id = transactions.id
  );

-- Corrigir (se necessário)
-- Adicionar splits manualmente ou excluir transação
```

### Problema: "Splits sem user_id"
```sql
-- Verificar
SELECT * FROM transaction_splits WHERE user_id IS NULL;

-- Corrigir
UPDATE transaction_splits ts
SET user_id = (
  SELECT linked_user_id 
  FROM family_members 
  WHERE id = ts.member_id
)
WHERE user_id IS NULL;
```

### Problema: "Transações sem competence_date"
```sql
-- Verificar
SELECT COUNT(*) FROM transactions WHERE competence_date IS NULL;

-- Corrigir
UPDATE transactions
SET competence_date = DATE_TRUNC('month', date::date)
WHERE competence_date IS NULL;
```

### Problema: "Saldo da conta incorreto"
```sql
-- Recalcular saldo
-- (Usar função do banco se disponível)
SELECT calculate_account_balance('[account-id]');

-- Ou atualizar manualmente
UPDATE accounts
SET balance = (
  SELECT COALESCE(SUM(
    CASE 
      WHEN t.type = 'INCOME' THEN t.amount
      WHEN t.type = 'EXPENSE' THEN -t.amount
      ELSE 0
    END
  ), 0)
  FROM transactions t
  WHERE t.account_id = accounts.id
)
WHERE id = '[account-id]';
```

---

## 📊 RELATÓRIO DE TESTES

Após executar os testes, preencha:

### Resumo
```
Data: ___/___/______
Responsável: _________________
Opção Executada: [ ] 1 [ ] 2 [ ] 3

Tempo Total: _____ minutos/horas
```

### Resultados
```
✅ Testes Aprovados: ___
❌ Testes Reprovados: ___
⚠️ Testes com Ressalvas: ___

Total: ___
```

### Problemas Encontrados
```
1. [CRÍTICO/GRAVE/MODERADO/MENOR] Descrição
   - Como reproduzir: ...
   - Solução aplicada: ...

2. [CRÍTICO/GRAVE/MODERADO/MENOR] Descrição
   - Como reproduzir: ...
   - Solução aplicada: ...
```

### Decisão Final
```
[ ] Sistema APROVADO para produção
[ ] Sistema APROVADO COM RESSALVAS
[ ] Sistema REPROVADO - necessita correções

Observações:
_________________________________
_________________________________
_________________________________
```

---

## 🚀 APÓS APROVAÇÃO

### Checklist de Deploy
```
[ ] Backup do banco de dados feito
[ ] Variáveis de ambiente configuradas
[ ] Domínio e SSL configurados
[ ] Monitoramento configurado
[ ] Deploy em produção realizado
[ ] Smoke test em produção OK
[ ] Equipe notificada
[ ] Monitoramento ativo (24h)
```

---

## 📞 SUPORTE

### Se encontrar problemas:
1. Consulte: `docs/ANALISE_TECNICA_CODIGO_PRODUCAO.md`
2. Execute: `docs/SCRIPT_AUDITORIA_COMPLETA_PRODUCAO.sql`
3. Revise: `docs/CHECKLIST_TESTES_PRODUCAO_COMPLETO.md`
4. Documente: Problemas encontrados

### Recursos:
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Documentação Supabase](https://supabase.com/docs)
- [Relatório de Auditoria](./RELATORIO_FINAL_AUDITORIA_PRODUCAO.md)

---

**Boa sorte com os testes! 🚀**

**Data:** 31/12/2024  
**Versão:** 1.0.0
