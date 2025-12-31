# Instruções para Teste e Debug - 30/12/2024

## 🎯 OBJETIVO

Identificar por que:
1. **Splits não são criados** quando você marca transação como compartilhada
2. **Convites de viagens não aparecem** mesmo existindo no banco

---

## 📋 TESTES A REALIZAR

### TESTE 1: Criar Transação Compartilhada

**Passos:**
1. Abra o console do navegador (F12)
2. Vá para "Nova Transação"
3. Preencha:
   - Valor: R$ 100,00
   - Descrição: "Teste debug splits"
   - Data: hoje
   - Categoria: qualquer
   - Conta: qualquer
4. Clique em "Dividir despesa"
5. **OBSERVE OS LOGS NO CONSOLE** (começam com 🔵)
6. Selecione Fran como membro
7. **OBSERVE OS LOGS NO CONSOLE**
8. Clique em "Confirmar"
9. **OBSERVE OS LOGS NO CONSOLE**
10. Clique em "Salvar"
11. **OBSERVE OS LOGS NO CONSOLE** (começam com 🟢)

**O que procurar nos logs:**
- `🔵 [SplitModal] toggleSplitMember chamado` - deve aparecer quando você clica em Fran
- `🔵 [SplitModal] Adicionando membro` - deve mostrar que Fran foi adicionado
- `🔵 [SplitModal] Splits redistribuídos` - deve mostrar os splits calculados
- `🔵 [SplitModal] Chamando setSplits com` - deve mostrar o array de splits
- `🟢 [TransactionForm] Estado atual dos splits` - deve mostrar os splits ANTES de submeter
- `🟢 [TransactionForm] Splits processados` - deve mostrar os splits formatados para o banco

**COPIE E COLE TODOS OS LOGS AQUI:**
```
[Cole os logs do console aqui]
```

---

### TESTE 2: Verificar Convites de Viagens

**Passos:**
1. Abra o console do navegador (F12)
2. Faça login como **Wesley**
3. Vá para a página "Viagens"
4. **OBSERVE OS LOGS NO CONSOLE** (começam com 🟣)

**O que procurar nos logs:**
- `🟣 [usePendingTripInvitations] Buscando convites para user` - deve mostrar seu user_id
- `🟣 [usePendingTripInvitations] Convites encontrados` - deve mostrar quantos convites foram encontrados
- `🟣 [usePendingTripInvitations] Dados enriquecidos` - deve mostrar os dados completos dos convites
- `🟣 [PendingTripInvitationsAlert] Renderizado` - deve mostrar se o componente foi renderizado
- `🟣 [PendingTripInvitationsAlert] Renderizando X convite(s)` - deve aparecer se há convites

**COPIE E COLE TODOS OS LOGS AQUI:**
```
[Cole os logs do console aqui]
```

---

## 🔍 ANÁLISE DOS DADOS

### Dados no Banco (Confirmados)

**Convite Pendente:**
- ID: `d25fd387-cef4-4287-aa10-4da55bacf246`
- Viagem: "Viagem ferias"
- De: Fran → Para: Wesley
- Status: pending
- ✅ Existe no banco

**Transações Compartilhadas:**
1. "uber" (Fran) - ❌ 0 splits
2. "Jantar compartilhado (TESTE)" (Fran) - ✅ 1 split (funciona!)
3. "teste compartilhado - wesley" (Wesley) - ❌ 0 splits

**Políticas RLS de trip_invitations:**
- ✅ SELECT: permite inviter_id OU invitee_id ver
- ✅ UPDATE: permite invitee_id atualizar
- ✅ DELETE: permite inviter_id OU invitee_id deletar
- ✅ INSERT: permite inviter_id criar

**Conclusão:** Políticas RLS estão corretas!

---

## 🐛 HIPÓTESES

### Problema 1: Splits Não São Criados

**Hipótese A:** Estado `splits` não está sendo atualizado no `SplitModal`
- Os logs vão mostrar se `setSplits` está sendo chamado
- Os logs vão mostrar se o estado está sendo propagado para o `TransactionForm`

**Hipótese B:** Estado `splits` é limpo antes de submeter
- Os logs vão mostrar o valor de `splits` no momento do submit
- Se estiver vazio, algo está limpando o estado

**Hipótese C:** Problema de nomenclatura (`memberId` vs `member_id`)
- Os logs vão mostrar o formato exato dos splits
- Vamos verificar se o campo está correto

### Problema 2: Convites Não Aparecem

**Hipótese A:** Hook não está retornando dados
- Os logs vão mostrar se a query está retornando convites
- Os logs vão mostrar se os dados estão sendo enriquecidos

**Hipótese B:** Componente não está renderizando
- Os logs vão mostrar se o componente está sendo renderizado
- Os logs vão mostrar se há alguma condição bloqueando a renderização

**Hipótese C:** Erro silencioso
- Os logs vão mostrar qualquer erro que ocorrer
- Os logs vão mostrar o estado completo do hook

---

## 📝 PRÓXIMOS PASSOS

Após coletar os logs:

1. **Analisar os logs** para identificar onde o problema está
2. **Corrigir o código** baseado nos logs
3. **Testar novamente** para confirmar a correção
4. **Remover os logs** após confirmar que tudo funciona

---

## ⚠️ IMPORTANTE

- **NÃO FECHE O CONSOLE** durante os testes
- **COPIE TODOS OS LOGS** que aparecerem
- **TIRE SCREENSHOTS** se necessário
- Os logs são essenciais para identificar o problema!

---

## 🎯 RESULTADO ESPERADO

Após a correção:

1. ✅ Transações compartilhadas devem criar splits automaticamente
2. ✅ Convites de viagens devem aparecer na página de viagens
3. ✅ Transações compartilhadas devem aparecer na página "Compartilhados"
4. ✅ Valores devem ser calculados corretamente

---

**Data:** 30/12/2024  
**Status:** Aguardando testes do usuário
