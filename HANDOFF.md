# HANDOFF.md — Ponto de Continuidade

> Última atualização: 2026-07-13

## Regras permanentes de continuidade

- Atualizar este arquivo em toda entrega que altere código, banco, UX, design, infraestrutura ou decisões arquiteturais.
- Descrever objetivo, causa raiz, decisões, arquivos, migrações, testes, riscos, publicação e próximo passo.
- Tratar o PostgreSQL do Supabase como fonte única de verdade financeira.
- Tratar o produto como controle financeiro pessoal manual, sem conexão bancária.
- Revisar mudanças relevantes pelos critérios de produto, arquitetura, Supabase, segurança, frontend/PWA, UX, design, QA e operações.
- Não declarar revisão de um especialista que não tenha sido efetivamente realizada; registrar o critério técnico aplicado e suas evidências.

Contrato detalhado: `docs/PRODUCT_OPERATING_MODEL.md`.

---

## Handoff da sessão - 13/07/2026 - RPCs privilegiadas, etapa 5

### Objetivo

Eliminar a atualizacao direta e unilateral de splits na compensacao de despesas mutuas com saldo liquido zero.

### Diagnostico e causa raiz

- O frontend atualizava `transaction_splits` diretamente quando creditos e debitos se anulavam.
- O cliente decidia sozinho que o saldo era zero, sem recalculo no PostgreSQL.
- A operacao marcava devedor e credor como confirmados, permitindo que um usuario confirmasse em nome da contraparte.
- O estado otimista tambem definia `is_settled = true` antes da confirmacao independente do outro lado.
- O dialogo exigia uma conta mesmo quando a compensacao nao cria transacao financeira.

### Decisoes e alteracoes

- Criada a RPC `settle_compensated_splits(uuid[])`, atomica e derivada de `auth.uid()`.
- O banco bloqueia os splits em ordem deterministica e recalcula o saldo com precisao de centavos.
- A RPC exige splits existentes, ativos, nao duplicados, da mesma contraparte, moeda, dominio e viagem.
- A compensacao exige valores nos dois sentidos e saldo final exatamente zero em centavos.
- Cada usuario confirma somente o proprio lado; `is_settled` so fica verdadeiro quando ambos os lados confirmam.
- O frontend deixou de escrever diretamente em `transaction_splits` e passou a usar a RPC.
- O cache otimista agora respeita a confirmacao independente e a conta deixou de ser obrigatoria no saldo zero.
- Mensagens funcionais retornadas pela RPC sao preservadas no feedback de erro.
- Grants: `authenticated` e `service_role` podem executar; `anon` nao pode; `search_path = ''`.

### Arquivos e banco

- `supabase/migrations/20260713094500_settle_compensated_splits_atomically.sql`.
- `src/hooks/useSharedExpensesActions.ts`.
- `src/integrations/supabase/types.ts`.
- `HANDOFF.md`.
- Migracao aplicada no projeto de producao `vrrcagukyfnlhxuvnssp`.

### Verificacao

- [x] Compensacao real de dois splits reciprocos e iguais validada dentro de transacao com `ROLLBACK`.
- [x] Somente o lado do usuario autenticado foi confirmado em cada split; a contraparte permaneceu inalterada.
- [x] Usuario terceiro recebeu SQLSTATE `42501` ao tentar compensar os mesmos splits.
- [x] Arrays vazio e duplicado foram recusados.
- [x] Selecao com valores em apenas um sentido foi recusada.
- [x] Estado original dos splits foi confirmado apos o `ROLLBACK`.
- [x] Grants, `SECURITY DEFINER` e `search_path = ''` conferidos em producao.
- [x] Advisors de seguranca executados apos a migracao.
- [x] `tsc --noEmit` aprovado.
- [x] ESLint sem erros; permanecem 8 avisos de `any` preexistentes no hook.
- [x] Testes focados: 2 arquivos e 35 testes aprovados.
- [x] Build Vite de producao e service worker PWA aprovados.

### Checklist pendente do P0 Supabase

- [ ] Auditar `settle_partial_balance`, `reject_settlement_request`, `mark_as_paid_by_debtor` e `mark_as_received_by_creditor`.
- [ ] Corrigir RPCs de leitura e relatorios que ainda aceitam `p_user_id`.
- [ ] Auditar `calculate_single_account_balance` e `check_account_dependencies` por ID de conta.
- [ ] Criar API v2 sem `p_user_id` para Web/PWA e futuro cliente Swift.
- [ ] Criar testes automatizados de isolamento, grants e compensacao no banco para CI.
- [ ] Substituir os `any` de `useSharedExpensesActions` por tipos do cache e das mutacoes.
- [ ] Resolver `admin_users`, `pg_trgm`, protecao contra senhas vazadas e MFA.

---

## Handoff da sessão - 13/07/2026 - RPCs privilegiadas, etapa 4

### Objetivo

Impedir falsificacao de identidade, acesso cruzado e estados financeiros orfaos na liquidacao ativa de despesas compartilhadas.

### Diagnostico e causa raiz

- O frontend atual usa `request_settlement` e `undo_settlement`; ambas confiavam em `p_user_id` mesmo sendo `SECURITY DEFINER`.
- `request_settlement` nao validava ownership da conta, participacao do chamador nos splits nem IDs duplicados.
- `undo_settlement` desfazia apenas um split, mas apagava a transacao de liquidacao compartilhada por todo o lote, deixando outros splits pagos sem referencia financeira.
- Sete RPCs legadas de liquidacao continuavam executaveis por `authenticated`, embora nao fossem usadas pelo frontend de producao.

### Decisoes e alteracoes

- As assinaturas ativas foram preservadas para compatibilidade com Web/PWA.
- `p_user_id` agora deve coincidir com `auth.uid()` e toda identidade efetiva vem do JWT.
- A conta de liquidacao deve pertencer ao usuario autenticado.
- Todos os splits sao bloqueados em ordem deterministica, devem existir e exigir participacao do chamador como devedor ou credor.
- Arrays vazios, IDs duplicados e valores nao positivos sao rejeitados.
- O desfazimento agora reverte atomicamente todos os splits vinculados a mesma transacao de liquidacao e retorna `reverted_count`.
- `search_path` foi fixado como vazio e os objetos foram qualificados.
- Execucao por `authenticated` foi removida de sete endpoints legados; `service_role` foi preservado.

### Arquivos e banco

- `supabase/migrations/20260713092327_harden_active_settlement_rpcs.sql`.
- `HANDOFF.md`.
- Migracao aplicada no projeto de producao `vrrcagukyfnlhxuvnssp`.

### Verificacao

- [x] Falsificacao de `p_user_id` bloqueada com SQLSTATE `42501`.
- [x] Conta pertencente a outro usuario bloqueada com SQLSTATE `42501`.
- [x] Split sem participacao do chamador bloqueado com SQLSTATE `42501`.
- [x] Endpoint legado `settle_split` bloqueado para `authenticated`.
- [x] Ciclo real `request_settlement` + `undo_settlement` validado em transacao com `ROLLBACK`, sem persistir dados de teste.
- [x] Desfazimento retornou `reverted_count = 1` no teste positivo.
- [x] Grants conferidos: endpoints ativos somente para `authenticated` e `service_role`; legados somente para `service_role`.
- [x] Testes focados: 2 arquivos e 35 testes aprovados.
- [x] Advisors de seguranca executados apos a migracao.

### Checklist pendente do P0 Supabase

- [ ] Substituir o `update` direto de compensacao com saldo liquido zero por RPC atomica e autorizada.
- [ ] Auditar `settle_partial_balance`, `reject_settlement_request`, `mark_as_paid_by_debtor` e `mark_as_received_by_creditor`.
- [ ] Corrigir RPCs de leitura e relatorios que ainda aceitam `p_user_id`.
- [ ] Auditar `calculate_single_account_balance` e `check_account_dependencies` por ID de conta.
- [ ] Criar API v2 sem `p_user_id` para Web/PWA e futuro cliente Swift.
- [ ] Criar testes automatizados de isolamento e grants no banco para CI.
- [ ] Resolver `admin_users`, `pg_trgm`, protecao contra senhas vazadas e MFA.

---

## Handoff da sessão - 13/07/2026 - RPCs privilegiadas, etapa 3

### Objetivo

Impedir falsificacao de identidade em RPCs auxiliares de contas, transacoes e verificacao de acesso.

### Diagnostico e causa raiz

- Foram encontradas 28 RPCs autenticadas com IDs de usuario, devedor ou credor nos parametros.
- `assign_default_account_to_orphans`, `migrate_transactions_to_account` e `check_split_access` confiavam diretamente em `p_user_id` sob `SECURITY DEFINER`.
- `recalculate_all_balances` ja comparava com `auth.uid()`, mas sem tratamento explicito de sessao ausente e com `search_path=public`.
- As assinaturas sao usadas pelo frontend atual; remove-las agora quebraria compatibilidade.

### Decisoes e alteracoes

- As quatro assinaturas foram preservadas para Web/PWA.
- `p_user_id` agora e apenas um campo de compatibilidade e deve coincidir com `auth.uid()`.
- Consultas e mutacoes usam a identidade derivada do JWT, nunca o parametro do cliente.
- `search_path` foi fixado como vazio e todos os objetos foram qualificados.
- Grants continuam somente para `authenticated` e `service_role`; `anon` permanece bloqueado.

### Arquivos e banco

- `supabase/migrations/20260713091922_bind_account_rpcs_to_auth_uid.sql`.
- `HANDOFF.md`.
- Migracao aplicada no projeto de producao `vrrcagukyfnlhxuvnssp`.

### Verificacao

- [x] Usuario A tentando atribuir conta para usuario B recebeu `42501`.
- [x] Usuario A tentando migrar transacoes do usuario B recebeu `42501`.
- [x] Usuario A tentando recalcular saldos do usuario B recebeu `42501`.
- [x] Usuario A consultando acesso de split como usuario B recebeu `false`.
- [x] As quatro funcoes foram confirmadas com `search_path = ''`.
- [x] As quatro funcoes permanecem inacessiveis a `anon`.
- [x] Advisors de seguranca executados apos a migracao.

### Checklist pendente do P0 Supabase

- [ ] Corrigir as RPCs de leitura e relatorios que ainda aceitam `p_user_id`.
- [ ] Auditar ownership nas RPCs de liquidacao e compartilhamento.
- [ ] Corrigir `confirm_settlement`, `settle_split`, `settle_multiple_splits` e `undo_settlement`.
- [ ] Corrigir funcoes com papeis `debtor` e `creditor` fornecidos pelo cliente.
- [ ] Auditar `calculate_single_account_balance` e `check_account_dependencies` por ID de conta.
- [ ] Criar API v2 sem `p_user_id` para Web/PWA e futuro cliente Swift.
- [ ] Criar teste automatizado de isolamento e grants para CI.
- [ ] Resolver `admin_users`, `pg_trgm`, senhas vazadas e MFA.

---

## Handoff da sessão - 13/07/2026 - RPCs privilegiadas, etapa 2

### Objetivo

Separar endpoints administrativos legítimos de funções internas e impedir que usuários autenticados executem jobs globais ou criem notificações arbitrárias.

### Diagnóstico e causa raiz

- `clear_error_logs()` era `SECURITY DEFINER` e apagava todos os logs sem validar `auth.uid()` ou administrador.
- Jobs de recorrência, rendimentos, expiração e limpeza permanente estavam expostos ao papel `authenticated`.
- As duas sobrecargas de `fn_create_notification` aceitavam um `p_user_id` arbitrário e podiam ser chamadas diretamente por qualquer usuário logado.
- `seed_default_categories(p_user_id)` permitia escrever categorias para um usuário indicado pelo cliente.

### Decisões e alterações

- `clear_error_logs()` agora exige sessão autenticada e `public.is_admin()`, usa `search_path = ''` e tabela qualificada.
- Sete grants de `authenticated` foram removidos de rotinas internas; `service_role` foi preservado explicitamente.
- RPCs administrativas que já verificam `public.is_admin()` continuam acessíveis ao painel administrativo.
- Nenhuma RPC financeira de usuário foi alterada nesta etapa.

### Arquivos e banco

- `supabase/migrations/20260713091506_restrict_internal_and_admin_rpcs.sql`.
- `HANDOFF.md`.
- Migração aplicada no projeto de produção `vrrcagukyfnlhxuvnssp`.

### Verificação

- [x] Grants conferidos diretamente em `pg_proc` após a migração.
- [x] Funções internas ficaram com `authenticated = false` e `service_role = true`.
- [x] `clear_error_logs()` permaneceu disponível ao painel, com autorização interna obrigatória.
- [x] Usuário autenticado comum chamando o job de recorrências recebeu `42501 permission denied`.
- [x] Usuário autenticado comum chamando `clear_error_logs()` recebeu `42501 Acesso negado`.
- [x] Advisors de segurança executados novamente.
- [x] Funções privilegiadas expostas a `authenticated`: 71 para 64.
- [x] Funções privilegiadas expostas a `anon`: permanecem em 0.

### Checklist pendente do P0 Supabase

- [ ] Classificar as 64 funções privilegiadas ainda acessíveis a `authenticated`.
- [ ] Auditar primeiro RPCs com `p_user_id`, IDs de contas, splits e famílias.
- [ ] Derivar identidade exclusivamente de `auth.uid()` nas operações do usuário.
- [ ] Testar usuário A contra recursos do usuário B.
- [ ] Fixar `search_path = ''` e qualificar objetos nas funções de cliente.
- [ ] Corrigir ou retirar RPCs administrativas legadas com colunas obsoletas.
- [ ] Criar teste automatizado de grants para CI.
- [ ] Resolver `admin_users` com RLS sem policy de forma intencional.
- [ ] Mover `pg_trgm` para schema de extensões em migração dedicada.
- [ ] Ativar proteção contra senhas vazadas e ampliar MFA no painel Supabase.

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
