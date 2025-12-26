# 🎯 PLANO DE REFATORAÇÃO COMPLETA - IGUALAR AO PE COPY

## 📋 ESCOPO COMPLETO

### 1. 🔄 FORMULÁRIOS EM MODAL (não em página separada)
- [ ] TransactionForm → Modal (não página)
- [ ] TripForm → Modal (não página)
- [ ] AccountForm → Modal (não página)
- [ ] FamilyMemberForm → Modal (não página)
- [ ] CategoryForm → Modal (não página)

### 2. 📱 ABAS E NAVEGAÇÃO
- [ ] Página de Viagem deve ter abas: Resumo | Despesas | Itinerário | Checklist
- [ ] Página de Compartilhados deve ter abas: Família | Viagens
- [ ] Página de Transações deve ter filtros e abas

### 3. 🔐 PERMISSÕES E ROLES (NOVA FUNCIONALIDADE)
**Banco de Dados**:
- [ ] Adicionar campo `role` na tabela `family_members`
  - Valores: `admin`, `editor`, `viewer`
- [ ] Adicionar campo `avatar_url` na tabela `family_members`
- [ ] Criar RLS policies baseadas em roles

**Sistema**:
- [ ] Implementar lógica de permissões:
  - **Admin**: Acesso total, pode gerenciar membros
  - **Editor**: Pode criar e editar transações
  - **Viewer**: Apenas visualização
- [ ] UI para alterar role do membro (dropdown)
- [ ] UI para alterar avatar do membro (upload de imagem)

### 4. ✏️ EDIÇÃO E EXCLUSÃO DE TRANSAÇÕES
**Regras**:
- [ ] Usuário pode editar/excluir APENAS transações que ELE criou
- [ ] Campo `created_by` ou `creator_user_id` deve ser verificado
- [ ] Transações espelhadas (mirrors) são READ-ONLY
- [ ] Mostrar badge "Criado por [Nome]" se não for o criador

**UI**:
- [ ] Botões de editar/excluir condicionais
- [ ] Mensagem clara quando não pode editar
- [ ] Confirmação antes de excluir

### 5. 🎨 TODAS AS REGRAS DO PE COPY

#### Transações
- [ ] Validação de duplicatas (alerta piscando)
- [ ] Parcelamento em QUALQUER despesa (não só cartão)
- [ ] Recorrência (diária, semanal, mensal, anual)
- [ ] Lembrete (com antecedência configurável)
- [ ] Conversão de moeda (transferências internacionais)
- [ ] Estorno (refund)
- [ ] Antecipação de parcelas

#### Contas
- [ ] Contas internacionais (flag `isInternational`)
- [ ] Múltiplas moedas (USD, EUR, BRL, etc)
- [ ] Cartão de crédito com dia de fechamento e vencimento
- [ ] Transferências com conversão de câmbio
- [ ] Regras de filtro de contas por moeda

#### Viagens
- [ ] Validação de data dentro do período
- [ ] Moeda da viagem obrigatória
- [ ] Apenas contas da mesma moeda podem ser usadas
- [ ] Abas: Resumo | Despesas | Itinerário | Checklist
- [ ] Participantes da viagem
- [ ] Orçamento e gastos

#### Compartilhados
- [ ] Espelhamento automático de transações
- [ ] Sincronização bidirecional
- [ ] Status de sincronização (SYNCED, PENDING, ERROR)
- [ ] Liquidação de dívidas (settle)
- [ ] Histórico de pagamentos

### 6. 🗄️ MIGRAÇÕES DE BANCO NECESSÁRIAS

```sql
-- 1. Adicionar role e avatar em family_members
ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Adicionar creator_user_id em transactions (se não existir)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS creator_user_id UUID REFERENCES profiles(id);

-- 3. Adicionar isInternational em accounts
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT false;

-- 4. Adicionar campos de recorrência
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS frequency TEXT CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
ADD COLUMN IF NOT EXISTS recurrence_day INTEGER;

-- 5. Adicionar campos de lembrete
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS enable_notification BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_date DATE,
ADD COLUMN IF NOT EXISTS reminder_option TEXT;

-- 6. Adicionar campos de conversão de moeda
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS destination_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS destination_currency TEXT;

-- 7. RLS Policies baseadas em role
CREATE POLICY "family_members_can_view_based_on_role"
ON transactions FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM family_members fm
    WHERE fm.user_id = auth.uid()
    AND fm.family_id = (SELECT family_id FROM family_members WHERE user_id = transactions.user_id LIMIT 1)
    AND fm.role IN ('admin', 'editor', 'viewer')
  )
);

CREATE POLICY "family_members_can_edit_based_on_role"
ON transactions FOR UPDATE
USING (
  creator_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM family_members fm
    WHERE fm.user_id = auth.uid()
    AND fm.family_id = (SELECT family_id FROM family_members WHERE user_id = transactions.user_id LIMIT 1)
    AND fm.role IN ('admin', 'editor')
  )
);

CREATE POLICY "family_members_can_delete_based_on_role"
ON transactions FOR DELETE
USING (
  creator_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM family_members fm
    WHERE fm.user_id = auth.uid()
    AND fm.family_id = (SELECT family_id FROM family_members WHERE user_id = transactions.user_id LIMIT 1)
    AND fm.role = 'admin'
  )
);
```

---

## 🚀 ORDEM DE IMPLEMENTAÇÃO

### FASE 1: Banco de Dados e Permissões (PRIORIDADE MÁXIMA)
1. ✅ Criar migração com todos os campos novos
2. ✅ Aplicar migração no Supabase
3. ✅ Atualizar types TypeScript
4. ✅ Implementar RLS policies

### FASE 2: Sistema de Permissões
1. ✅ Hook `usePermissions` para verificar role
2. ✅ Componente `RoleSelector` (dropdown)
3. ✅ Componente `AvatarUpload` (upload de imagem)
4. ✅ Lógica de edição/exclusão condicional

### FASE 3: Formulários em Modal
1. ✅ Converter TransactionForm para Modal
2. ✅ Converter TripForm para Modal
3. ✅ Converter AccountForm para Modal
4. ✅ Converter FamilyMemberForm para Modal

### FASE 4: Abas e Navegação
1. ✅ Adicionar abas na página de Viagem
2. ✅ Adicionar abas na página de Compartilhados
3. ✅ Ajustar navegação e rotas

### FASE 5: Regras de Negócio
1. ✅ Validação de duplicatas
2. ✅ Parcelamento universal
3. ✅ Recorrência
4. ✅ Lembrete
5. ✅ Conversão de moeda
6. ✅ Estorno
7. ✅ Antecipação de parcelas

### FASE 6: Testes e Ajustes Finais
1. ✅ Testar todos os fluxos
2. ✅ Ajustar UI/UX
3. ✅ Documentação completa

---

## 📝 PRÓXIMOS PASSOS IMEDIATOS

1. **AGORA**: Criar migração com campos de permissões
2. **AGORA**: Aplicar no banco
3. **AGORA**: Implementar sistema de roles
4. **DEPOIS**: Converter formulários para modal
5. **DEPOIS**: Adicionar abas nas páginas
6. **DEPOIS**: Implementar regras de negócio restantes

---

**Estimativa**: 8-12 horas de trabalho
**Prioridade**: CRÍTICA
**Status**: 🔴 INICIANDO AGORA

