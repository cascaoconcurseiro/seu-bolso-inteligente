# Instruções de Teste Completo - Sistema de Viagens e Transações

## 🎯 BUGS CORRIGIDOS NESTA SESSÃO

### 1. ✅ Formulário de Transação (Tela Branca)
**Problema**: Ao clicar em "Nova Transação", a tela ficava branca
**Causa**: Variável `tripId` usada antes de ser declarada no componente
**Solução**: Reordenado hooks para declarar estado antes de usar
**Arquivo**: `src/components/transactions/TransactionForm.tsx`

### 2. ✅ Convites de Viagem Não Aparecem
**Problema**: Convites existem no banco mas não aparecem no frontend (erro 400)
**Causa**: Sintaxe incorreta de joins do Supabase PostgREST
**Solução**: Removidos hints de foreign key, busca de dados relacionados feita separadamente
**Arquivos**: 
- `src/hooks/useTripInvitations.ts`
- `src/hooks/useTripMembers.ts`

### 3. ✅ Membros de Viagem Não Carregam
**Problema**: Lista de membros da viagem retorna erro 400
**Causa**: Mesma causa dos convites (joins incorretos)
**Solução**: Mesma solução dos convites

---

## 🧪 ROTEIRO DE TESTES

### TESTE 1: Formulário de Nova Transação
**Objetivo**: Verificar se o formulário abre corretamente

1. Fazer login como Wesley ou Fran
2. Em qualquer página, clicar no botão "Nova Transação" (canto superior direito)
3. **Resultado Esperado**: 
   - Formulário deve abrir em modal
   - Todos os campos devem estar visíveis
   - Não deve haver tela branca
   - Console não deve mostrar erros

### TESTE 2: Convites de Viagem - Visualização
**Objetivo**: Verificar se convites aparecem no Dashboard

**Dados no Banco** (confirmado via SQL):
- 4 convites pendentes:
  1. Fran → Wesley (viagem "wesley")
  2. Wesley → Fran (viagem "fran")
  3. Wesley → Fran (viagem "999")
  4. Wesley → Fran (viagem "ttt")

**Passos**:
1. Fazer login como **Fran** (francy.von@gmail.com)
2. Ir para o Dashboard
3. **Resultado Esperado**:
   - Deve aparecer 3 alertas de convite (viagens "fran", "999", "ttt")
   - Cada convite deve mostrar:
     - Nome da viagem
     - Nome do convidador (Wesley)
     - Destino (se houver)
     - Datas (se houver)
     - Botões: Aceitar e Recusar

4. Fazer login como **Wesley** (wesley.diaslima@gmail.com)
5. Ir para o Dashboard
6. **Resultado Esperado**:
   - Deve aparecer 1 alerta de convite (viagem "wesley")
   - Convite deve mostrar convidador como Fran

### TESTE 3: Convites de Viagem - Aceitar
**Objetivo**: Verificar se aceitar convite adiciona usuário à viagem

**Passos**:
1. Login como Fran
2. No Dashboard, clicar em "Aceitar" em um dos convites
3. **Resultado Esperado**:
   - Toast de sucesso: "🎉 Você agora faz parte da viagem [nome]!"
   - Convite desaparece da lista
   - Viagem aparece na página "Viagens"

4. Ir para página "Viagens"
5. Abrir a viagem aceita
6. **Resultado Esperado**:
   - Fran deve aparecer na lista de membros
   - Fran pode ver gastos da viagem
   - Fran pode adicionar orçamento pessoal
   - Fran NÃO pode editar detalhes da viagem (nome, datas, etc)

### TESTE 4: Convites de Viagem - Rejeitar
**Objetivo**: Verificar se rejeitar convite funciona

**Passos**:
1. Login como Fran
2. No Dashboard, clicar em "Recusar" em um dos convites
3. **Resultado Esperado**:
   - Toast: "Convite recusado"
   - Convite desaparece da lista
   - Viagem NÃO aparece na página "Viagens"

### TESTE 5: Membros de Viagem
**Objetivo**: Verificar se lista de membros carrega corretamente

**Passos**:
1. Login como Wesley
2. Ir para página "Viagens"
3. Abrir qualquer viagem que tenha membros
4. **Resultado Esperado**:
   - Lista de membros deve aparecer
   - Cada membro deve mostrar:
     - Nome completo
     - Email
     - Badge "Owner" ou "Membro"
   - Console não deve mostrar erros 400

### TESTE 6: Permissões de Viagem
**Objetivo**: Verificar se permissões funcionam corretamente

**Como Owner (Wesley)**:
1. Abrir uma viagem criada por Wesley
2. **Resultado Esperado**:
   - Botão "Editar Viagem" deve aparecer
   - Botão "Excluir Viagem" deve aparecer
   - Pode editar: nome, destino, datas, moeda, orçamento
   - Pode adicionar/remover membros

**Como Membro (Fran)**:
1. Abrir uma viagem onde Fran é membro (não owner)
2. **Resultado Esperado**:
   - Botão "Editar Viagem" NÃO deve aparecer
   - Botão "Excluir Viagem" NÃO deve aparecer
   - Botão "Meu Orçamento" deve aparecer
   - Pode adicionar/editar gastos
   - Pode gerenciar shopping/itinerary/checklist pessoal

### TESTE 7: Criar Nova Viagem com Convites
**Objetivo**: Verificar fluxo completo de criação de viagem

**Passos**:
1. Login como Wesley
2. Ir para página "Viagens"
3. Clicar em "Nova Viagem"
4. Preencher:
   - Nome: "Teste Orlando"
   - Destino: "Orlando, FL"
   - Data início: 01/02/2025
   - Data fim: 10/02/2025
   - Moeda: USD
   - Orçamento: 5000
5. Selecionar Fran como membro
6. Clicar em "Criar Viagem"
7. **Resultado Esperado**:
   - Toast: "Viagem criada com sucesso!"
   - Viagem aparece na lista
   - Wesley é owner

8. Fazer logout e login como Fran
9. Ir para Dashboard
10. **Resultado Esperado**:
    - Convite para "Teste Orlando" deve aparecer
    - Convite mostra Wesley como convidador

---

## 🔍 VERIFICAÇÕES NO CONSOLE

### Console Limpo (Sem Erros)
Ao usar o sistema, o console do navegador (F12) NÃO deve mostrar:
- ❌ Erros 400 (Bad Request)
- ❌ Erros de "used before declaration"
- ❌ Erros de foreign key

### Logs Esperados (Debug)
Você PODE ver estes logs (são normais):
- ✅ "Buscando convites para user: [id]"
- ✅ "Convites encontrados (sem inviter): [...]"
- ✅ "Convites enriquecidos: [...]"
- ✅ "Membros da viagem (sem profiles): [...]"
- ✅ "Membros enriquecidos: [...]"

---

## 📊 DADOS DE TESTE

### Usuários
- **Wesley**: wesley.diaslima@gmail.com (ID: 56ccd60b-641f-4265-bc17-7b8705a2f8c9)
- **Fran**: francy.von@gmail.com (ID: 9545d0c1-94be-4b69-b110-f939bce072ee)

### Viagens Existentes
1. **"wesley"** - Owner: Fran, Convidado: Wesley
2. **"fran"** - Owner: Wesley, Convidado: Fran
3. **"999"** - Owner: Wesley, Convidado: Fran
4. **"ttt"** - Owner: Wesley, Convidado: Fran

---

## ✅ CHECKLIST DE VALIDAÇÃO

Após executar todos os testes, verificar:

- [ ] Formulário de transação abre sem tela branca
- [ ] Convites aparecem no Dashboard
- [ ] Aceitar convite adiciona à lista de viagens
- [ ] Rejeitar convite remove da lista
- [ ] Lista de membros carrega corretamente
- [ ] Permissões de owner funcionam
- [ ] Permissões de membro funcionam
- [ ] Criar viagem com convites funciona
- [ ] Console sem erros 400
- [ ] Todas as funcionalidades responsivas

---

## 🚨 SE ENCONTRAR PROBLEMAS

### Problema: Convites não aparecem
**Verificar**:
1. Console do navegador (F12) - procurar erros
2. Network tab - verificar se requisição retorna 200 (não 400)
3. Fazer logout/login novamente
4. Limpar cache do navegador

### Problema: Formulário em branco
**Verificar**:
1. Console do navegador - procurar erro específico
2. Verificar se há erro de "used before declaration"
3. Recarregar página (Ctrl+F5)

### Problema: Membros não aparecem
**Verificar**:
1. Console - procurar erros 400
2. Network tab - verificar resposta da API
3. Verificar se viagem tem membros no banco

---

## 📝 COMMITS APLICADOS

1. **140b9eb** - fix: corrige joins do Supabase e bug crítico no TransactionForm
2. **0ea7293** - docs: atualiza auditoria com correções aplicadas

---

## 🎉 RESULTADO ESPERADO FINAL

Após todos os testes:
- ✅ Sistema 100% funcional
- ✅ Sem erros no console
- ✅ Convites funcionando perfeitamente
- ✅ Permissões respeitadas
- ✅ Formulários abrindo corretamente
- ✅ Experiência do usuário fluida
