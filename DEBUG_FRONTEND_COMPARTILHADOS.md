# 🔍 DEBUG FRONTEND - COMPARTILHADOS

## PROBLEMA IDENTIFICADO

O filtro do tab REGULAR está filtrando por **mês atual** do contexto `MonthContext`.

Se o usuário estiver visualizando outro mês (ex: Janeiro/2025), a transação de Dezembro/2024 não aparecerá!

---

## VERIFICAÇÃO RÁPIDA

### 1. Verificar Mês Selecionado
Abra o DevTools (F12) e execute no Console:

```javascript
// Verificar qual mês está selecionado
const monthSelector = document.querySelector('[data-month-selector]');
console.log('Mês selecionado:', monthSelector?.textContent);

// Ou verificar no localStorage
console.log('Current date:', localStorage.getItem('currentDate'));
```

### 2. Verificar Dados Carregados
```javascript
// Verificar se as transações foram carregadas
const queries = window.__REACT_QUERY_DEVTOOLS__;
console.log('Queries:', queries);
```

### 3. Forçar Dezembro/2024
Na página "Compartilhados":
1. Procure o seletor de mês (geralmente no topo)
2. Selecione **Dezembro 2024**
3. Verifique se a transação aparece

---

## SOLUÇÃO TEMPORÁRIA

### Opção 1: Mudar para Dezembro/2024
- Clique no seletor de mês
- Selecione "Dezembro 2024"
- A transação deve aparecer

### Opção 2: Criar nova transação no mês atual
- Crie uma nova despesa compartilhada
- Use a data de hoje
- Verifique se aparece

---

## SOLUÇÃO PERMANENTE

O filtro de data está correto para o comportamento esperado (mostrar apenas transações do mês selecionado).

**Comportamento atual**:
- Tab REGULAR: Mostra apenas transações do mês selecionado
- Tab TRAVEL: Mostra todas as transações de viagens
- Tab HISTORY: Mostra todas as transações pagas

**Se quiser ver TODAS as transações regulares**:
- Remover o filtro de data do tab REGULAR
- Ou adicionar um toggle "Ver todos os meses"

---

## TESTE COMPLETO

1. ✅ Verificar se transação existe no banco
2. ✅ Verificar se mirror foi criado
3. ✅ Verificar se splits existem
4. ✅ Verificar se ledger está correto
5. 🔄 **Verificar se mês selecionado é Dezembro/2024**
6. 🔄 Verificar se transação aparece na tela

---

## COMANDOS SQL PARA VERIFICAR

```sql
-- Verificar transações compartilhadas de Wesley
SELECT 
  id,
  description,
  date,
  amount,
  is_shared,
  EXTRACT(MONTH FROM date) as month,
  EXTRACT(YEAR FROM date) as year
FROM transactions
WHERE user_id = '56ccd60b-641f-4265-bc17-7b8705a2f8c9'
  AND is_shared = true
ORDER BY date DESC;

-- Verificar transações compartilhadas de Fran
SELECT 
  id,
  description,
  date,
  amount,
  is_shared,
  source_transaction_id,
  EXTRACT(MONTH FROM date) as month,
  EXTRACT(YEAR FROM date) as year
FROM transactions
WHERE user_id = '9545d0c1-94be-4b69-b110-f939bce072ee'
  AND is_shared = true
ORDER BY date DESC;
```

---

## PRÓXIMO PASSO

**TESTE IMEDIATO**: 
1. Abra a página "Compartilhados"
2. Verifique qual mês está selecionado no topo
3. Se não for Dezembro/2024, mude para Dezembro/2024
4. A transação deve aparecer!

Se ainda não aparecer, o problema pode ser:
- Cache do React Query (limpar com F5 hard refresh: Ctrl+Shift+R)
- RLS policies bloqueando acesso
- Outro filtro no frontend
