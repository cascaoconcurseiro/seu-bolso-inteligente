# Plano de Correção de Bugs - Sistema de Família

## 🎯 OBJETIVO
Corrigir bugs de exibição para que Wesley e Fran apareçam um para o outro corretamente.

## 📋 CHECKLIST DE CORREÇÕES

### 1. ✅ Página Família - Exibição de Membros
**Problema:** Wesley não aparece para Fran e vice-versa

**Correção:**
- [x] Corrigir `useFamily()` para buscar família tanto como owner quanto como member
- [x] Buscar dados do owner junto com a família
- [x] Remover lógica complexa de "adicionar owner como pseudo-membro"
- [x] Simplificar: filtrar apenas o próprio usuário logado
- [x] Adicionar flag `isOwner` no objeto do owner
- [x] Mostrar owner com badge de coroa
- [ ] Testar: Wesley vê Fran / Fran vê Wesley

### 2. ✅ Formulário de Transação - Lista de Pessoas
**Problema:** Pode incluir o próprio usuário nas opções

**Correção:**
- [x] Adicionar filtro `.filter(m => m.linked_user_id !== user?.id)` em familyMembers
- [x] Garantir que `availableMembers` NUNCA inclui o usuário logado
- [x] Simplificar lógica de filtro
- [ ] Testar: Usuário não aparece como opção

### 3. ✅ Viagens - Participantes
**Problema:** Mesma lógica incorreta de membros

**Correção:**
- [ ] Aplicar mesma lógica de família
- [ ] Owner da viagem + participantes (exceto eu)
- [ ] Testar: Criador vê participantes / Participante vê criador

### 4. ⏭️ Página Compartilhados (Criar depois)
- [ ] Criar página
- [ ] Listar pessoas vinculadas
- [ ] Mostrar saldo com cada pessoa
- [ ] Implementar "Acertar contas"

## 🔧 ORDEM DE EXECUÇÃO

1. **Página Família** (mais crítico)
2. **Formulário de Transação** (impacta uso diário)
3. **Viagens** (menos crítico)
4. **Compartilhados** (nova feature)

## 📝 NOTAS
- Não mexer em estrutura de dados
- Não mexer em RLS policies (já corrigidas)
- Apenas corrigir lógica de exibição na UI
