# Melhorias de Viagens - Pendentes

## 1. ✅ Edição de Viagem (Criador)
- [ ] Botão "Editar" na página de detalhes da viagem
- [ ] Modal de edição com mesmos campos do criar
- [ ] Apenas owner pode editar
- [ ] Atualizar nome, destino, datas, moeda, orçamento

## 2. ✅ Gerenciar Membros
- [ ] Seção "Participantes" na página da viagem
- [ ] Botão "Adicionar participante" (apenas owner)
- [ ] Botão "Remover" ao lado de cada membro (apenas owner)
- [ ] Mostrar status: owner vs member
- [ ] Mostrar orçamento individual de cada membro

## 3. ✅ Seletor de Moeda
**Moedas principais:**
- BRL - Real Brasileiro (R$)
- USD - Dólar Americano ($)
- EUR - Euro (€)
- GBP - Libra Esterlina (£)
- ARS - Peso Argentino ($)
- CLP - Peso Chileno ($)
- UYU - Peso Uruguaio ($)
- PYG - Guarani Paraguaio (₲)

**Implementação:**
```typescript
const currencies = [
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileiro' },
  { code: 'USD', symbol: '$', name: 'Dólar Americano' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'Libra Esterlina' },
  { code: 'ARS', symbol: '$', name: 'Peso Argentino' },
  { code: 'CLP', symbol: '$', name: 'Peso Chileno' },
  { code: 'UYU', symbol: '$', name: 'Peso Uruguaio' },
  { code: 'PYG', symbol: '₲', name: 'Guarani' },
];
```

## 4. ✅ Orçamento Obrigatório
- [ ] Remover "(opcional)" do campo orçamento
- [ ] Validar que orçamento foi preenchido
- [ ] Desabilitar botão "Criar" se orçamento vazio

## 5. ✅ Orçamento Individual do Membro
**Banco de Dados:**
- Tabela `trip_members` já tem campo `personal_budget`
- Adicionar na UI quando membro aceita convite

**Fluxo:**
1. Membro recebe convite
2. Ao aceitar, modal pergunta: "Qual seu orçamento para esta viagem?"
3. Salva em `trip_members.personal_budget`
4. Mostra na lista de participantes

## 6. ✅ Otimização de Performance

**Hooks a otimizar:**
```typescript
// useCategories
staleTime: 300000, // 5 minutos (categorias mudam pouco)
retry: false,

// useFamilyMembers  
staleTime: 60000, // 1 minuto
retry: false,

// useFinancialSummary
staleTime: 30000, // 30 segundos
retry: false,

// useSharedFinances
staleTime: 30000,
retry: false,
```

**Páginas lentas identificadas:**
- Dashboard
- Transactions
- SharedExpenses
- Reports
- Trips
- Family

**Causa:** Múltiplas queries sem cache, retry infinito

**Solução:** Adicionar `staleTime` e `retry: false` em todos os hooks

## Prioridade de Implementação

### Alta (Fazer agora)
1. Seletor de moeda no formulário
2. Orçamento obrigatório
3. Otimização de performance (staleTime em todos os hooks)

### Média (Próxima sessão)
4. Edição de viagem
5. Gerenciar membros (adicionar/remover)
6. Orçamento individual do membro

### Baixa (Futuro)
7. Histórico de mudanças na viagem
8. Notificações quando alguém é removido
