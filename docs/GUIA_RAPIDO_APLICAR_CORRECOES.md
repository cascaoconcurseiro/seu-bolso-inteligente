# 🚀 GUIA RÁPIDO: APLICAR CORREÇÕES

**Tempo estimado:** 5 minutos  
**Dificuldade:** Fácil

---

## ✅ PASSO 1: Aplicar Correções no Banco de Dados

### Opção A: Arquivo Único (RECOMENDADO)

1. Abra o Supabase Dashboard
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Copie TODO o conteúdo do arquivo `APLICAR_TODAS_CORRECOES_AGORA.sql`
5. Cole no editor
6. Clique em **Run** (ou pressione Ctrl+Enter)
7. Aguarde a execução (30 segundos)
8. Verifique os logs no painel inferior

**Resultado esperado:**
```
✅ Criadas X transações espelhadas retroativamente
✅ ESPELHAMENTO: OK
✅ CONVITES: Políticas RLS atualizadas
🎉 TODAS AS CORREÇÕES APLICADAS COM SUCESSO!
```

### Opção B: Arquivos Separados

Se preferir aplicar um por vez:

1. `supabase/migrations/20241230_create_mirror_transactions.sql`
2. `supabase/migrations/20241230_fix_trip_invitations_display.sql`

---

## ✅ PASSO 2: Deploy do Frontend

### Se estiver usando Vercel/Netlify

1. Faça commit das mudanças:
   ```bash
   git add .
   git commit -m "fix: corrigir splits, espelhamento e convites"
   git push
   ```

2. Aguarde deploy automático (2-3 minutos)

### Se estiver rodando localmente

1. Reinicie o servidor:
   ```bash
   npm run dev
   ```

---

## ✅ PASSO 3: Testar

### Teste 1: Transação Compartilhada

1. Faça login
2. Crie nova transação
3. Marque "Compartilhar"
4. Selecione um membro
5. Defina divisão (50/50)
6. Confirmar
7. **Verificar:**
   - ✅ Toast de sucesso aparece
   - ✅ Transação criada
   - ✅ Vai para página Compartilhados
   - ✅ Vê a transação listada

### Teste 2: Espelhamento

1. Faça login com o outro usuário (membro)
2. Vá para página Compartilhados
3. **Verificar:**
   - ✅ Vê débito da transação
   - ✅ Valor correto
   - ✅ Pode marcar como acertado

### Teste 3: Convites de Viagem

1. Usuário A cria viagem
2. Usuário A convida Usuário B
3. Usuário B faz login
4. Usuário B vai para página Viagens
5. **Verificar:**
   - ✅ Alerta de convite aparece
   - ✅ Dados da viagem corretos
   - ✅ Botões funcionam
6. Usuário B aceita convite
7. **Verificar:**
   - ✅ Viagem aparece na lista
   - ✅ Toast de sucesso

---

## 🐛 TROUBLESHOOTING

### Problema: Splits ainda não são criados

**Solução:**
1. Limpe cache do navegador (Ctrl+Shift+R)
2. Faça logout e login novamente
3. Abra console do navegador (F12)
4. Procure por logs 🔵 e 🟢
5. Verifique se há erros em vermelho

### Problema: Convites não aparecem

**Solução:**
1. Verifique se migração foi aplicada:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'trip_invitations';
   ```
2. Verifique se convite existe:
   ```sql
   SELECT * FROM trip_invitations WHERE status = 'pending';
   ```
3. Verifique console do navegador (logs 🟣)

### Problema: Espelhamento não funciona

**Solução:**
1. Verifique se trigger existe:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trg_create_mirror_transaction';
   ```
2. Crie transação de teste
3. Verifique no banco:
   ```sql
   SELECT * FROM transactions WHERE source_transaction_id IS NOT NULL;
   ```

---

## 📊 VALIDAÇÃO COMPLETA

Execute no Supabase SQL Editor:

```sql
-- Verificar splits
SELECT COUNT(*) as splits_count 
FROM transaction_splits 
WHERE user_id IS NOT NULL;

-- Verificar espelhamentos
SELECT COUNT(*) as mirrors_count 
FROM transactions 
WHERE source_transaction_id IS NOT NULL;

-- Verificar convites
SELECT COUNT(*) as pending_invitations 
FROM trip_invitations 
WHERE status = 'pending';

-- Verificar políticas
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'trip_invitations';

-- Verificar triggers
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'transaction_splits'::regclass;
```

**Resultado esperado:**
- `splits_count` = número de splits criados
- `mirrors_count` >= `splits_count`
- `pending_invitations` = número de convites pendentes
- 3 políticas para `trip_invitations`
- 2 triggers para `transaction_splits`

---

## ✅ CHECKLIST FINAL

- [ ] Migrações aplicadas no Supabase
- [ ] Frontend com deploy
- [ ] Cache limpo
- [ ] Teste 1: Transação compartilhada ✅
- [ ] Teste 2: Espelhamento ✅
- [ ] Teste 3: Convites ✅
- [ ] Validação SQL executada
- [ ] Sem erros no console

---

## 🎉 SUCESSO!

Se todos os testes passaram, o sistema está funcionando corretamente!

**Próximos passos:**
1. Remover logs de debug (🔵, 🟢, 🟣)
2. Adicionar testes automatizados
3. Documentar para usuários finais

---

**Dúvidas?** Verifique `CORRECOES_APLICADAS_IMEDIATAS_30_12_2024.md` para detalhes técnicos.
