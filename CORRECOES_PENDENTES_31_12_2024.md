# Correções Pendentes - 31/12/2024

## 1. Despesa Compartilhada de Viagem Não Aparece

**Problema**: Criou despesa compartilhada vinculada a viagem, mas não aparece:
- ❌ Não aparece na aba Viagem do Compartilhado
- ❌ Não aparece na página da Viagem

**Investigação Necessária**:
- Verificar se `trip_id` está sendo salvo corretamente
- Verificar se `is_shared` está true
- Verificar filtro da aba TRAVEL em `useSharedFinances`

## 2. Categoria Aparece como "Desconhecido"

**Problema**: Na página da viagem, transação mostra:
```
?uber Desconhecido · 30 dez $ 20,00
```

Mas categoria foi selecionada no formulário.

**Causa Provável**:
- Query não está buscando a categoria
- Ou categoria não está sendo salva

## 3. Falta Tag "Compartilhado"

**Problema**: Transações compartilhadas não mostram tag visual indicando que são compartilhadas.

**Solução**:
- Adicionar badge "Compartilhado" em:
  - Página Transações
  - Extrato da conta
  - Página da viagem
  - Dashboard (atividade recente)

**Exemplo de badge**:
```tsx
{transaction.is_shared && (
  <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded uppercase tracking-wider">
    Compartilhado
  </span>
)}
```

---

## Próximos Passos

1. Investigar por que despesa de viagem não aparece
2. Corrigir exibição de categoria
3. Adicionar tags "Compartilhado" em todo sistema

---

**Data**: 31/12/2024  
**Status**: Pendente de investigação
