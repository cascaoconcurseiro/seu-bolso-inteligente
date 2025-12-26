# 🎯 PRÓXIMOS PASSOS - FUNCIONALIDADES FALTANTES

## ✅ JÁ IMPLEMENTADO (90%)
- ✅ Sistema de permissões completo
- ✅ Formulário de transação em modal
- ✅ Validação de data da viagem
- ✅ Moeda dinâmica da viagem
- ✅ Divisão com família
- ✅ Parcelamento em cartão de crédito
- ✅ Componentes de UI (Tabs, Modal, FAB, etc)

## 🔴 FALTAM IMPLEMENTAR (10%)

### 1. ABA "RESUMO" NA PÁGINA DE VIAGENS
**Status**: Fácil - 30 min
**Descrição**: Adicionar aba "Resumo" antes de "Gastos" na página de viagem
**Conteúdo da aba**:
- Total gasto vs orçamento
- Gasto por categoria
- Gasto por participante
- Gráfico de evolução

### 2. PARCELAMENTO UNIVERSAL
**Status**: Médio - 1h
**Descrição**: Permitir parcelar QUALQUER despesa, não só cartão de crédito
**Mudanças**:
- Remover restrição `isCreditCard` do parcelamento
- Mover UI de parcelamento para seção "Opções Adicionais"
- Permitir parcelar em qualquer conta

### 3. RECORRÊNCIA COMPLETA
**Status**: Complexo - 2h
**Descrição**: Sistema completo de recorrência
**Funcionalidades**:
- UI para configurar frequência (Diária, Semanal, Mensal, Anual)
- Campo "Dia da recorrência" para mensal
- Geração automática de transações futuras (job)
- Botão "Atualizar Futuras" em modo edição

### 4. LEMBRETE
**Status**: Médio - 1h
**Descrição**: Sistema de lembretes
**Funcionalidades**:
- Switch "Lembrete"
- Opções: No dia, 1 dia antes, 2 dias antes, 1 semana antes, Data personalizada
- Notificação (email ou push - requer integração)

### 5. CONVERSÃO DE MOEDA (TRANSFERÊNCIAS INTERNACIONAIS)
**Status**: Complexo - 2h
**Descrição**: Transferências com conversão de câmbio
**Funcionalidades**:
- Toggle "Conversão Internacional"
- Campo de taxa de câmbio
- Cálculo automático do valor convertido
- Mostra valor final a receber
- Validação de contas internacionais

### 6. VALIDAÇÃO DE DUPLICATAS
**Status**: Médio - 1h
**Descrição**: Detectar transações duplicadas
**Funcionalidades**:
- Alerta piscando quando detectar transação similar
- Critérios: mesmo valor, mesma descrição, mesma data (±3 dias)
- Permitir usuário confirmar ou cancelar

### 7. ESTORNO
**Status**: Fácil - 30 min
**Descrição**: Estornar transações
**Funcionalidades**:
- Botão "Estornar" em transações
- Criar transação inversa automaticamente
- Marcar como estorno (`is_refund`, `refund_of_transaction_id`)
- Badge visual de "Estorno"

### 8. ANTECIPAÇÃO DE PARCELAS
**Status**: Médio - 1h
**Descrição**: Antecipar parcelas futuras
**Funcionalidades**:
- Modal para antecipar parcelas
- Recalcular valores com desconto (opcional)
- Marcar parcelas como pagas
- Atualizar saldo da conta

---

## 📊 PRIORIZAÇÃO

### ALTA PRIORIDADE (Implementar AGORA)
1. **Parcelamento Universal** - Funcionalidade muito solicitada
2. **Validação de Duplicatas** - Previne erros do usuário
3. **Aba Resumo** - Melhora UX de viagens

### MÉDIA PRIORIDADE (Próxima iteração)
4. **Lembrete** - Funcionalidade útil
5. **Estorno** - Funcionalidade útil
6. **Antecipação de Parcelas** - Funcionalidade avançada

### BAIXA PRIORIDADE (Futuro)
7. **Recorrência Completa** - Funcionalidade complexa
8. **Conversão de Moeda** - Requer integração externa

---

## 🚀 PLANO DE AÇÃO

### FASE 1: Funcionalidades Rápidas (2h)
- [ ] Implementar Parcelamento Universal
- [ ] Implementar Validação de Duplicatas
- [ ] Adicionar Aba Resumo na página de Viagens

### FASE 2: Funcionalidades Médias (3h)
- [ ] Implementar Lembrete
- [ ] Implementar Estorno
- [ ] Implementar Antecipação de Parcelas

### FASE 3: Funcionalidades Complexas (4h)
- [ ] Implementar Recorrência Completa
- [ ] Implementar Conversão de Moeda

---

## 📝 NOTAS

- Todas as funcionalidades já têm campos no banco de dados
- Apenas falta implementar a UI e lógica
- PE copy tem todas as funcionalidades como referência
- Tempo total estimado: 9 horas

**Data**: 26/12/2024
**Status**: Pronto para implementação
