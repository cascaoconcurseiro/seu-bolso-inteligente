# Tarefas Pendentes Prioritárias - 27/12/2024

## ✅ CONCLUÍDO AGORA
1. ✅ Corrigido filtro de membros no NewTripDialog (apenas membros cadastrados)

## 🔴 ALTA PRIORIDADE (Fazer Agora)

### 1. Verificar e Testar Sistema de Convites de Viagem
- ✅ Banco de dados está correto
- ✅ Triggers funcionando
- ✅ Frontend implementado
- ⏳ **TESTAR**: Criar viagem, enviar convite, aceitar convite
- ⏳ **VERIFICAR**: Se viagem aparece para ambos os usuários após aceitar

### 2. Adicionar Botão "Nova Transação" em Todas as Páginas
**Páginas que faltam:**
- Accounts
- CreditCards  
- SharedExpenses
- Reports
- Trips
- Family
- Settings

**Código a adicionar em cada página:**
```typescript
const [showTransactionModal, setShowTransactionModal] = useState(false);

useEffect(() => {
  const handleOpenModal = () => setShowTransactionModal(true);
  window.addEventListener('openTransactionModal', handleOpenModal);
  return () => window.removeEventListener('openTransactionModal', handleOpenModal);
}, []);

// No JSX:
<TransactionModal
  open={showTransactionModal}
  onOpenChange={setShowTransactionModal}
/>
```

### 3. Otimizações de Performance
**Hooks que faltam adicionar staleTime:**
- `useCategories` - staleTime: 300000 (5 min)
- `useFamilyMembers` - staleTime: 60000 (1 min)
- `useFinancialSummary` - staleTime: 30000 (30 seg)
- `useSharedFinances` - staleTime: 30000 (30 seg)

### 4. Seletor de Mês Funcional
- Fazer `useTransactions` usar `MonthContext` automaticamente
- Remover seletor local de Reports
- Testar filtro em todas as páginas

## 🟡 MÉDIA PRIORIDADE (Próxima Sessão)

### 5. Edição de Viagem (Apenas Owner)
- Modal de edição
- Botão na página de detalhes
- Validação de permissões
- Campos: nome, destino, datas, moeda, orçamento

### 6. Gerenciar Membros da Viagem
- Adicionar membros depois de criar
- Remover membros
- Mostrar lista de participantes
- Mostrar permissões

### 7. Orçamento Individual do Membro
- Modal ao aceitar convite
- Campo `personal_budget` em `trip_members`
- Mostrar na lista de participantes

### 8. Escopo de Compartilhamento
- Implementar filtros em `useSharedFinances`
- Adicionar UI completa em `InviteMemberDialog`
- Badges na página Family
- Testar todos os escopos

## 🟢 BAIXA PRIORIDADE (Futuro)

### 9. Espelhamento de Viagens
- Avaliar se é realmente necessário
- Campo `source_trip_id` já existe
- Pode não ser necessário (viagem é única, membros compartilham)

### 10. Histórico de Mudanças
- Auditoria de alterações em viagens
- Notificações de remoção
- Log de ações

## 📊 PROGRESSO GERAL

**Sistema está 85% completo!**

- ✅ Banco de dados: 100%
- ✅ Transações compartilhadas: 100%
- ✅ Viagens compartilhadas: 90%
- ✅ Sistema de convites: 100%
- ⏳ Escopo de compartilhamento: 50%
- ⏳ Performance: 60%
- ⏳ UX/UI: 80%

## 🎯 FOCO DESTA SESSÃO

1. Testar sistema de convites de viagem
2. Adicionar botão "Nova Transação" em todas as páginas
3. Otimizar performance (staleTime)
4. Seletor de mês funcional

**Tempo estimado:** 1-2 horas
