# 🐛 Debug: Convites de Viagem Não Aparecem

## ✅ Verificações no Banco de Dados

### 1. Convite Existe
```sql
SELECT * FROM trip_invitations 
WHERE invitee_id = '56ccd60b-641f-4265-bc17-7b8705a2f8c9' 
AND status = 'pending';
```
**Resultado**: ✅ 1 convite encontrado
- ID: `f98db2c6-0add-4347-983c-e6514697f457`
- Viagem: "Viagem para Paris"
- De: Fran (francy.von@gmail.com)
- Para: Wesley (wesley.diaslima@gmail.com)
- Status: pending

### 2. Notificação Criada
```sql
SELECT * FROM notifications 
WHERE user_id = '56ccd60b-641f-4265-bc17-7b8705a2f8c9' 
AND type = 'TRIP_INVITE';
```
**Resultado**: ✅ 2 notificações encontradas
- Notificação mais recente criada automaticamente pelo trigger

### 3. Políticas RLS
```sql
SELECT * FROM pg_policies WHERE tablename = 'trip_invitations';
```
**Resultado**: ✅ Políticas corretas
- `Users can view their invitations`: permite SELECT para invitee_id ou inviter_id
- `trip_invitations_select_policy`: permite SELECT para invitee_id ou inviter_id

### 4. Query com RLS Simulado
```sql
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "56ccd60b-641f-4265-bc17-7b8705a2f8c9"}';
SELECT * FROM trip_invitations WHERE invitee_id = '56ccd60b-641f-4265-bc17-7b8705a2f8c9' AND status = 'pending';
```
**Resultado**: ✅ Retorna o convite corretamente

## ❌ Problema Identificado

O banco de dados está correto, mas o frontend não está recebendo os dados.

## 🔍 Possíveis Causas

### 1. Cache do React Query
O React Query pode estar usando dados em cache antigos.

**Solução**: Recarregar a página com cache limpo
- Windows/Linux: `Ctrl + Shift + R` ou `Ctrl + F5`
- Mac: `Cmd + Shift + R`

### 2. Sessão do Supabase Expirada
O token JWT pode estar expirado ou inválido.

**Solução**: Fazer logout e login novamente

### 3. Configuração do Supabase Client
O client pode não estar usando as credenciais corretas.

**Verificar**:
```typescript
// No console do navegador (F12)
const { data: { session } } = await supabase.auth.getSession();
console.log('User ID:', session?.user?.id);
console.log('Expected:', '56ccd60b-641f-4265-bc17-7b8705a2f8c9');
```

### 4. Problema de CORS ou Network
Requisições podem estar sendo bloqueadas.

**Verificar**: Aba Network do DevTools (F12)
- Procurar por requisições para `trip_invitations`
- Verificar status code (deve ser 200)
- Verificar response body

## 🧪 Testes de Debug

### Teste 1: Verificar Autenticação
Abra o console do navegador (F12) e execute:
```javascript
const { data: { session } } = await supabase.auth.getSession();
console.log('Usuário logado:', session?.user?.id);
console.log('Email:', session?.user?.email);
```

**Esperado**: 
- ID: `56ccd60b-641f-4265-bc17-7b8705a2f8c9`
- Email: `wesley.diaslima@gmail.com`

### Teste 2: Query Manual
No console do navegador:
```javascript
const { data, error } = await supabase
  .from('trip_invitations')
  .select('*')
  .eq('invitee_id', '56ccd60b-641f-4265-bc17-7b8705a2f8c9')
  .eq('status', 'pending');

console.log('Convites:', data);
console.log('Erro:', error);
```

**Esperado**: Array com 1 convite

### Teste 3: Invalidar Cache do React Query
No console do navegador:
```javascript
// Forçar refetch
window.location.reload(true);
```

### Teste 4: Verificar Logs do Hook
Os logs já estão no código:
```
🟣 [usePendingTripInvitations] Buscando convites para user: 56ccd60b-641f-4265-bc17-7b8705a2f8c9
🟣 [usePendingTripInvitations] Convites encontrados: 0
```

**Problema**: A query está retornando 0 convites no frontend, mas 1 no banco.

## 🎯 Solução Recomendada

### Passo 1: Limpar Cache Completo
1. Abra DevTools (F12)
2. Vá em Application > Storage
3. Clique em "Clear site data"
4. Recarregue a página

### Passo 2: Fazer Logout e Login
1. Faça logout da aplicação
2. Limpe o cache do navegador
3. Faça login novamente
4. Vá para a página de Viagens

### Passo 3: Verificar Network
1. Abra DevTools (F12) > Network
2. Filtre por "trip_invitations"
3. Recarregue a página
4. Verifique a resposta da API

### Passo 4: Debug Manual
Execute no console:
```javascript
// 1. Verificar sessão
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);

// 2. Testar query
const { data, error } = await supabase
  .from('trip_invitations')
  .select('*')
  .eq('invitee_id', session.user.id)
  .eq('status', 'pending');

console.log('Data:', data);
console.log('Error:', error);

// 3. Verificar RLS
const { data: test } = await supabase
  .from('trip_invitations')
  .select('*');

console.log('All invitations (should be filtered by RLS):', test);
```

## 📝 Próximos Passos

1. ✅ Recarregar página com cache limpo
2. ✅ Verificar logs no console
3. ✅ Testar query manual
4. ✅ Verificar Network tab
5. ✅ Fazer logout/login se necessário

## 🆘 Se Nada Funcionar

Pode ser um problema de sincronização entre o banco e o frontend. Tente:

1. **Recriar o convite**:
```sql
DELETE FROM trip_invitations WHERE id = 'f98db2c6-0add-4347-983c-e6514697f457';

INSERT INTO trip_invitations (trip_id, inviter_id, invitee_id, status, message)
VALUES (
  'aa9ea15e-0ba7-4354-96eb-85f0c1869e8d',
  '9545d0c1-94be-4b69-b110-f939bce072ee',
  '56ccd60b-641f-4265-bc17-7b8705a2f8c9',
  'pending',
  'Vamos juntos para Paris! Vai ser incrível!'
);
```

2. **Verificar se o problema é específico do Wesley**:
   - Criar outro usuário de teste
   - Criar convite para esse usuário
   - Ver se aparece

3. **Verificar configuração do Supabase**:
   - Arquivo `.env` tem as variáveis corretas?
   - `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão corretos?

---

**Status**: 🔍 Investigando
**Última atualização**: 31/12/2024 08:30
