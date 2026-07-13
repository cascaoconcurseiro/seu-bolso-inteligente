# HANDOFF.md — Ponto de Continuidade

> Última atualização: 2026-07-12

## Regras permanentes de continuidade

- Atualizar este arquivo em toda entrega que altere código, banco, UX, design, infraestrutura ou decisões arquiteturais.
- Descrever objetivo, causa raiz, decisões, arquivos, migrações, testes, riscos, publicação e próximo passo.
- Tratar o PostgreSQL do Supabase como fonte única de verdade financeira.
- Tratar o produto como controle financeiro pessoal manual, sem conexão bancária.
- Revisar mudanças relevantes pelos critérios de produto, arquitetura, Supabase, segurança, frontend/PWA, UX, design, QA e operações.
- Não declarar revisão de um especialista que não tenha sido efetivamente realizada; registrar o critério técnico aplicado e suas evidências.

Contrato detalhado: `docs/PRODUCT_OPERATING_MODEL.md`.

---

## Handoff da sessão - 13/07/2026 - RPCs privilegiadas, etapa 1

### Objetivo

Eliminar a execução não autenticada das funções `SECURITY DEFINER` sem interromper os fluxos autenticados do app.

### Diagnóstico e causa raiz

- O inventário ao vivo encontrou funções administrativas e financeiras privilegiadas executáveis por `anon`.
- A migração de 03/07 concedeu `anon` a dezenas de funções para exposição no cache do PostgREST, confundindo descoberta da API com autorização.
- Funções PostgreSQL também nascem executáveis por `PUBLIC` se o privilégio padrão não for alterado.

### Decisão

- Revogar `EXECUTE` de `PUBLIC` e `anon` em todas as funções `SECURITY DEFINER` do schema `public`.
- Preservar grants explícitos de `authenticated` nesta etapa para não quebrar jornadas existentes.
- Revogar o privilégio padrão de `PUBLIC` e `anon` para futuras funções criadas por `postgres`.
- A próxima etapa revisará autorização, `auth.uid()`, ownership e `search_path` função por função.

### Arquivos e banco

- `supabase/migrations/20260713012529_revoke_anon_from_privileged_functions.sql`.
- `HANDOFF.md`.

### Checklist concluído

- [x] Consultar documentação e changelog atuais do Supabase.
- [x] Inventariar funções `SECURITY DEFINER` diretamente na produção.
- [x] Confirmar grants efetivos de `anon`, `authenticated` e `PUBLIC`.
- [x] Criar migração pelo Supabase CLI.
- [x] Preservar acesso autenticado existente.
- [x] Aplicar a migração principal na produção.
- [x] Rodar advisors de segurança após a alteração.
- [x] Confirmar zero funções privilegiadas executáveis por `anon` ou `PUBLIC` (0 de 106).
- [x] Confirmar que os 71 grants de `authenticated` foram preservados para revisão individual.
- [x] Executar prova negativa como `anon`; `public.is_admin()` retornou `42501 permission denied`.

### Limite encontrado

- O papel da migração não pode alterar privilégios padrão pertencentes a `supabase_admin` (`42501 permission denied`).
- A migração complementar foi descartada para não deixar SQL inaplicável no histórico local.
- O default de `postgres` está protegido. Funções criadas por ferramentas internas do Supabase ainda devem ser verificadas pelo teste de grants após cada mudança de schema.

### Checklist pendente do P0 Supabase

- [ ] Classificar cada RPC como cliente autenticado, administrativa, interna ou trigger.
- [ ] Derivar identidade exclusivamente de `auth.uid()` nas operações do usuário.
- [ ] Remover confiança em parâmetros `p_user_id` fornecidos pelo cliente.
- [ ] Testar usuário A contra recursos do usuário B.
- [ ] Fixar `search_path` seguro e qualificar objetos em todas as privilegiadas.
- [ ] Restringir RPCs administrativas a administradores reais.
- [ ] Remover funções obsoletas e grants autenticados desnecessários.
- [ ] Criar teste automatizado que falhe se uma nova privilegiada receber `anon`.

---

## Handoff da sessão - 12/07/2026

### Objetivo

Formalizar o posicionamento do produto, a fonte única de dados e o protocolo obrigatório de handoff e coordenação técnica.

### Decisões

- O app é um sistema de controle financeiro pessoal sem conexão bancária.
- O Supabase/PostgreSQL é a fonte canônica; caches e estados locais são derivados e descartáveis.
- Escritas críticas devem ser atômicas, idempotentes e autorizadas no banco.
- Integridade financeira e segurança prevalecem sobre velocidade de entrega e acabamento visual.
- A direção visual passa a ser operacional e sóbria; efeitos decorativos deixam de ser padrão arquitetural.

### Arquivos alterados

- `docs/PRODUCT_OPERATING_MODEL.md`: contrato de produto, dados, especialidades e handoff.
- `ARCHITECTURE.md`: fonte única de verdade, limite sem conexão bancária e direção visual coerente com a auditoria.
- `HANDOFF.md`: regras permanentes e registro desta sessão.

### Banco e compatibilidade

- Nenhuma migração ou alteração de schema nesta sessão.
- Nenhuma mudança de comportamento em produção.

### Verificação

- Revisão documental cruzada com a auditoria de produto e engenharia de 12/07/2026.
- Não foram executados testes de código porque a entrega altera somente documentação.

### Próximo passo concreto

Auditar e classificar todas as RPCs `SECURITY DEFINER`, revogando acesso anônimo indevido e adicionando testes negativos de isolamento entre usuários.

---

## O que foi feito nesta sessão (03/07)

### Correções de produção (3 commits)

1. **PostgREST RPC routing** — 52 SECURITY DEFINER functions receberam `GRANT EXECUTE ON ... TO anon` para aparecerem no schema cache do PostgREST. `clear_error_logs()` excluída (sem auth check).
   - `20260703010000_fix_postgrest_rpc_routing_grant_anon_execute.sql`

2. **Trigger órfã `trg_create_ledger_on_split`** — causa raiz do 404 em `create_installment_series`. A trigger referenciava `financial_ledger` (tabela dropada na Fase 1). Dropada junto com 3 funções órfãs.
   - `20260703020000_drop_financial_ledger_orphans_trigger_and_functions.sql`

3. **6 bugs silenciosos encontrados pelo smoke test de integração (38 cenários)**:
   - `create_account_with_balance`: variáveis TEXT usadas em colunas DATE (falha com `search_path=''`)
   - `search_transactions`: return type `text` vs enum `transaction_type`
   - `recalculate_all_balances`: referenciava coluna `deleted` (não existe, é `deleted_at`)
   - `submit_error_report`: inseria em `error_reports` (não existe, é `error_logs`)
   - `set_pin` / `verify_pin`: `gen_salt()` / `crypt()` sem prefix `extensions.`
   - `soft_delete_account`: trigger `prevent_delete_if_has_transactions` bloqueava porque transações eram deletadas DEPOIS da conta (invertida a ordem)
   - `20260703030000_fix_smoke_test_bugs_6_functions.sql`

### Correções de frontend

- **SplitModal em viagens**: `handleDividirClick` agora abre SplitModal (não QuickSplit) quando há trip selecionada. Criado `tripFilteredMembers` para filtrar apenas participantes da viagem.
  - `AdvancedOptions.tsx`, `useTransactionForm.ts`, `TransactionForm.tsx`

- **competence_date**: 1 transação corrigida manualmente (Cabelo 19/jun → competence jun, não jul). Trigger verificada correta para todos os 3 cartões.

### Smoke test de integração (database-level)

Simulou 38 operações que o frontend faz, com usuário teste:
- Contas: criar (CHECKING/SAVINGS/CREDIT_CARD), saldo inicial, soft delete, check dependencies
- Transações: criar, editar, soft delete (NONE/ALL cascade), restore
- Parcelas: `create_installment_series` (simples e compartilhada)
- Compartilhadas: `create_transaction_with_splits`, família, membros
- Transferências: `transfer_between_accounts`, `withdraw_from_account`
- Cartão crédito: competence_date antes/depois do closing day
- RPCs de dashboard: 8 relatórios testados (summary, projection, evolution, etc.)
- Viagens, metas, contribuições, PIN, error report, search
- **Resultado final: 38/38 PASS** (após corrigir os 6 bugs)

## Próximo passo concreto

- O sistema backend está estável. Todas as funções que o frontend usa foram testadas.
- Possíveis próximos passos:
  1. Testar o app no browser para verificar todos os fluxos do usuário (golden path)
  2. Retomar o projeto iOS (Fase 0 — Descoberta & Auditoria)
  3. Qualquer nova feature/bugfix que o usuário solicitar

## Bloqueios

- Nenhum bloqueio técnico. Sistema operacional.
