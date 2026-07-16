# HANDOFF.md — Ponto de Continuidade

> Última atualização: 2026-07-16

## Regras permanentes de continuidade

- Atualizar este arquivo em toda entrega que altere código, banco, UX, design, infraestrutura ou decisões arquiteturais.
- Descrever objetivo, causa raiz, decisões, arquivos, migrações, testes, riscos, publicação e próximo passo.
- Tratar o PostgreSQL do Supabase como fonte única de verdade financeira.
- Tratar o produto como controle financeiro pessoal manual, sem conexão bancária.
- Revisar mudanças relevantes pelos critérios de produto, arquitetura, Supabase, segurança, frontend/PWA, UX, design, QA e operações.
- Não declarar revisão de um especialista que não tenha sido efetivamente realizada; registrar o critério técnico aplicado e suas evidências.

Contrato detalhado: `docs/PRODUCT_OPERATING_MODEL.md`.

---

## Handoff da sessão - 16/07/2026 - Roteiro de viagem linkado com o mapa

### Objetivo

Usuário reportou uso real do mapa de roteiro (feature `3cb451ba`): o mapa não refletia a viagem, pins de atração não apareciam, a busca de lugar não deixava escolher categoria, e lista/mapa pareciam duas coisas desconectadas em vez de um roteiro real.

### Diagnóstico

- O mapa centralizava geocodificando `trips.destination` (texto livre) a cada carga da tela, sem cache — qualquer falha/ambiguidade do Nominatim (grátis) fazia o mapa não bater com a viagem.
- Pin só aparecia com `latitude`/`longitude` no registro; colar um link do Google Maps só guardava o link pra abrir depois, nunca extraía coordenadas dele.
- Busca de lugares (Photon) era só texto livre, sem filtro de categoria — diferente da lógica de categorias que já existia (não reaproveitada) nas sugestões de IA (`overpassService.fetchOverpassPOIs`).
- Numeração dos pins no mapa (1, 2, 3…) não tinha correspondência visível na lista de atividades; clicar num item não focava o pin.

### Decisões e alterações

- `parseGoogleMapsUrl()`: extrai lat/lon direto do link colado (`@lat,lon`, `?q=lat,lon`, `!3dlat!4dlon`) sem geocodificação externa — 100% confiável quando o link já traz coordenadas.
- `trips.latitude`/`longitude` (coluna nova, nullable): coordenada base da viagem, geocodificada e persistida uma única vez (`TripItinerary` faz o cache silencioso no primeiro load sem coords); elimina a re-geocodificação a cada abertura da tela.
- `trip_itinerary.category` (coluna nova, nullable, CHECK constraint com 5 valores): categoria do item (Atração/Restaurante/Hotel/Praia/Transporte), escolhida via chips no formulário — filtra a busca (`osm_tag` do Photon) e define a cor do pin no mapa (`getCategoryColor`).
- Lista de atividades numerada com o mesmo índice do pin (`pinNumberByItemId`); clicar no número foca (`focusedItemId`) e o `TripRouteMap` centraliza/realça (`FocusMarker`, `map.flyTo`) o pin correspondente.

### Arquivos e banco

- `supabase/migrations/20260716000000_add_trip_base_coords_and_itinerary_category.sql` — aplicada em produção via MCP; `types.ts` regenerado.
- `src/services/overpassService.ts`, `src/components/trips/TripItinerary.tsx`, `src/components/trips/TripRouteMap.tsx`, `src/hooks/useTrips.ts`.
- Commit `f740266b`, pushado para `main`.

### Verificação

- [x] `tsc --noEmit`, `npm run lint` (0 erros), `npm run format:check`, `npm test -- --run` (239/239), `npm run build` — todos verdes.
- [ ] **Não verificado em navegador real**: sem credencial de login disponível nesta sessão para abrir uma viagem de teste e conferir visualmente (chips de categoria, numeração sincronizada, parsing do link). Recomendo QA manual no próximo acesso — abrir uma viagem com destino definido, colar um link do Google Maps num item e conferir se o pin aparece, e testar os chips de categoria na busca.

### Próximo passo

- QA visual manual do fluxo (ver item acima).
- Resolver o billing travado do GitHub Actions (ver sessão anterior) — só depois disso o CI vai validar este commit de verdade.

---

## Handoff da sessão - 15/07/2026 - Auditoria completa ao vivo + sincronização da documentação

### Objetivo

Usuário pediu auditoria do que "realmente" ainda precisa ser feito (não confiar no que os documentos afirmavam) e atualização de toda a documentação. Convocada análise multi-especialista (Supabase, Postgres Performance, Infraestrutura, Financeiro, Arquitetura pragmática) via skill `team-coordinator`.

### Lacuna de documentação encontrada

`HANDOFF.md` não tinha entrada para os últimos 5 commits antes desta sessão (`5a9a2752`, `09cf031a`, `bc0eb308` PWA/LGPD, `60b55184` baseline, `3ae672ee` idempotency+RPC v2, `3cb451ba` mapa de viagens) — violava a própria regra permanente deste arquivo. `MASTER_BLUEPRINT.md` estava parado em 25/06 com 3 afirmações desatualizadas (PIN plaintext, transação compartilhada sem atomicidade, leak no `rpcWithRetry`) que já tinham sido corrigidas em sessões posteriores sem o blueprint refletir.

### Verificação ao vivo (banco de produção `vrrcagukyfnlhxuvnssp`, via Supabase MCP)

- `list_migrations`: `20260713213214_reintroduce_delete_user_account_rpc` e `20260713212130_fix_idempotency_key_type_text` **confirmadas aplicadas** — o commit `3ae672ee` já tinha resolvido o bloqueador LGPD-DELETE que o CHECKLIST ainda marcava como pendente.
- `get_advisors(security)`: `delete_user_account` presente com grants corretos; 50 funções com o WARN esperado de "SECURITY DEFINER executável por authenticated" (mesmas já revisadas nas etapas 1-13, nada novo); `auth_leaked_password_protection` continua WARN (Free plan, já documentado).
- `get_advisors(performance)`: só itens INFO de índice não usado — mesmos já avaliados e decididos "não mexer" em 01/07. Nada novo.
- Código: `grep` confirma que `FamilyBalancePanel.tsx` e `useTrips.ts` chamam as versões `_v2` das RPCs de saldo (não as legadas) — fix do `3ae672ee` real. `rpcWithRetry.ts` já usa `AbortController` real com `clearTimeout` em `finally` — o leak documentado no blueprint não existe mais.

### Achado crítico: CI 100% vermelho desde 12/07 (não estava documentado)

Via API pública do GitHub (repo é público, sem precisar de token): **todas as execuções do workflow `CI` em `main` desde a run #120 (12/07) até a #149 (16/07) falharam**, nos 6 jobs, incluindo nos commits que sessões anteriores relataram como "typecheck zerado"/"CI verde".

Diagnóstico rodando localmente cada step do `ci.yml`:
- `npx tsc --noEmit` ✅, `npm run lint` ✅ (0 erros), `npm test -- --coverage` ✅ (239/239), `npm run build` ✅, `npm run test:secrets` ✅, `npm audit --omit=dev` ✅ (0 vulnerabilidades).
- `npm run format:check` ❌ — 6 arquivos não formatados; 3 deles (`TripItinerary.tsx`, `TripRouteMap.tsx`, `overpassService.ts`) são da feature de mapa de viagens (`3cb451ba`), que nunca passou pelo Prettier. Corrigido nesta sessão com `prettier --write` e commitado/pushado (`b6abecb7`).

**Causa raiz real, confirmada após o push do fix**: o run #150 (do próprio fix) falhou nos 6 jobs em ~5s, 0 steps executados. O usuário abriu a página do run no GitHub e confirmou o texto exato exibido: *"The job was not started because your account is locked due to a billing issue."* — bloqueio de nível de **conta pessoal** do GitHub (não é config do repositório: "Actions permissions" já estava em "Allow all actions and reusable workflows", a opção mais permissiva). Isso explica todo o histórico de falhas desde 12/07, independente de qualquer coisa no código. O fix de Prettier continua correto e necessário, só não vai aparecer verde em CI até o billing ser resolvido.

Investigado até o fim do self-service e descartado como causa aparente: `github.com/settings/billing` não mostra cobrança recusada, cartão pendente ou banner de aviso — uso do mês é $0,07, totalmente coberto pelo free tier, nada devendo. Ou seja, é um **flag interno do GitHub sem causa visível na UI**. Ação exclusiva do usuário (fora do escopo do assistente): abrir chamado em `support.github.com` citando o texto exato do erro e o link do run `.../actions/runs/29462019436`. Não reinvestigar billing em sessões futuras até o suporte responder — já foi esgotado o que dava pra checar pela interface.

Depois disso, ainda falta confirmar se os secrets `SUPABASE_DB_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` estão configurados em Settings → Secrets and variables → Actions — sem eles, `database-security` (faz `exit 1` explícito por design) e `e2e` vão falhar mesmo com o billing resolvido.

### Ação bloqueada por permissão

Tentei escolher um usuário real com dados ricos para rodar `scripts/verify-delete-user-account.sql` (prova transacional do LGPD-DELETE) via `execute_sql`. O classificador de permissão automática recusou por juntar `auth.users` com dados financeiros identificáveis sem essa consulta específica ter sido nomeada em escopo pelo usuário. Não tentei contornar — ver `[LGPD-VERIFY]` no CHECKLIST.

### Alterações nesta sessão

- `src/components/trips/TripItinerary.tsx`, `TripRouteMap.tsx`, `src/services/overpassService.ts`: reformatados com Prettier (sem mudança de comportamento). **Ainda não commitado** — aguardando confirmação do usuário.
- `MASTER_BLUEPRINT.md`, `CHECKLIST.md`, `docs/CHECKLIST_HIG_PWA_IOS.md`, `HANDOFF.md`: sincronizados com o estado real confirmado.

### Verificação

- [x] `tsc --noEmit`, `lint`, `format:check`, `test`, `build`, `test:secrets`, `npm audit` — todos verdes localmente após o fix de formatação.
- [x] Migrations LGPD-DELETE e idempotency_key confirmadas aplicadas em produção via MCP.
- [x] Advisors de segurança/performance revisados — nada novo além do já conhecido.
- [ ] Prova transacional do LGPD-DELETE com usuário real — bloqueada por permissão, não executada.
- [ ] Causa raiz de `test`/`build`/`audit`/`database-security`/`e2e` falhando em CI — não confirmada, falta acesso a logs/secrets.

### Próximo passo concreto

1. **Usuário resolve o billing bloqueado em `github.com/settings/billing`** — é o único bloqueador real de CI agora; nada de código resolve isso.
2. Depois disso, re-rodar o workflow e confirmar se `SUPABASE_DB_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` estão configurados em Settings → Secrets and variables → Actions (senão `database-security` e `e2e` continuam falhando, agora por secret ausente em vez de billing).
3. Se quiser a prova transacional final do LGPD-DELETE, autorizar a consulta específica ou rodar `scripts/verify-delete-user-account.sql` manualmente.

### Commit desta sessão

`b6abecb7` — fix(ci): aplica Prettier no mapa de viagens; audita e sincroniza documentacao. Pushado para `main`.

---

## Handoff da sessao - 13/07/2026 - Reintroducao do expurgo LGPD, etapa 13

### Objetivo

Recriar a exclusao definitiva de conta (`delete_user_account`), perdida no cutover de baseline, cobrindo corretamente o schema atual (~30 tabelas, FKs NO ACTION e dados compartilhados).

### Diagnostico e causa raiz

- A versao antiga (`20260604174400`) so tratava um subconjunto de tabelas e deixava intactas varias FKs `NO ACTION` que bloqueariam `DELETE FROM auth.users`.
- Grafo de FKs confirmado na baseline `20260713_public_schema.sql`: a maioria dos dados proprios apaga por CASCADE via `auth.users -> profiles`; o que bloqueia sao colunas de criador (`creator_user_id` em budgets/goals/transactions/trips), colunas de ator (`deleted_by`, `invited_by`, `removed_by`, `granted_by`, `changed_by`, `linked_user_id`) e um filho proprio sem cascade garantido (`asset_transactions.user_id`).

### Decisoes (produto/LGPD)

- **Dados compartilhados:** expurgar o que o usuario POSSUI (cascade) e apenas desvincular (SET NULL) onde ele e somente ator/criador de registro de OUTRO usuario. Nao destroi dado alheio, nao deixa orfao. (Alternativas de transferencia de posse / anonimizacao foram descartadas por complexidade nesta etapa.)
- **Identidade:** expurgo fisico (`DELETE FROM auth.users`) — direito ao esquecimento real, alinhado ao proposito da feature.

### Alteracoes

- `supabase/migrations/20260713140000_reintroduce_delete_user_account_rpc.sql`: RPC `SECURITY DEFINER`, `search_path = ''`, escopada por `auth.uid()`; SET NULL nos atores/criadores, DELETE explicito em `asset_transactions`, DELETE final em `auth.users`. Grants: `authenticated` + `service_role`; revogado de PUBLIC/anon.
- `src/integrations/supabase/types.ts`: `delete_user_account` adicionado em Functions.
- `src/hooks/useUserProfile.ts`: `useDeleteAccount` volta a chamar a RPC e faz `signOut()` apos o expurgo (removido o stopgap).
- `scripts/verify-delete-user-account.sql`: prova transacional (BEGIN/ROLLBACK) contra usuario real.

### Verificacao

- [x] `npx tsc --noEmit -p tsconfig.app.json` = 0 erros.
- [x] `prettier --check` verde nos arquivos alterados.
- [ ] **Bloqueado nesta sessao (sem credencial de banco):** aplicar migration em producao e rodar `scripts/verify-delete-user-account.sql` para provar conclusao sem erro de FK.
- [ ] Validar que o papel definidor pode `DELETE FROM auth.users` neste projeto; se retornar `42501`, mover o passo 3 para Edge Function com `service_role` (`auth.admin.deleteUser`), mantendo passos 1-2 na RPC.

### Proximo passo

- Aplicar `20260713140000` em producao, rodar a prova transacional com um usuario real e, se o expurgo de `auth.users` for permitido, marcar `[LGPD-DELETE]` como concluido. Storage objects do usuario (se houver bucket) ficam como verificacao adicional.

---

## Handoff da sessao - 13/07/2026 - Typecheck global bloqueante, etapa 12

### Objetivo

Integrar as correcoes TypeScript das quatro frentes por dominio, zerar o typecheck real do projeto e torna-lo bloqueante no CI.

### Diagnostico e causa raiz

- Restavam 124 erros reais (tsconfig.app.json) apos as frentes; o CI mascarava tudo com `continue-on-error`.
- Padrao dominante em Viagens: `SafeFinancialCalculator.add(...)` retorna `Decimal`, mas os `reduce` usavam inicial `0` (number). Isso quebrava a inferencia (acumulador inferido como `TripTransaction`) e, pior, vazava um `Decimal` em runtime onde o codigo esperava `number` (soma/format/comparacao).
- Modelos duplicados (`FamilyMember`, `Trip`) em componentes divergiam dos tipos canonicos de `useFamily`/`useTrips`.
- Varias RPCs v2 retornam `Json`; acesso a propriedades exigia narrowing/cast explicito.

### Decisoes e alteracoes

- Todos os `reduce` financeiros de Viagens encerram com `.toNumber()` (corrige tipo E o vazamento de `Decimal` em runtime).
- `useDashboard`: resultado v2 tipado via `Partial<DashboardSummary>` e type guard aplicado sobre `unknown[]`.
- `SharedRegularList`/`SharedTravelList` passam a importar `FamilyMember` de `useFamily` e `TripWithPersonalBudget` de `useTrips`; `TripSuggestion` ganhou `category?`.
- Casts de fronteira RPC->app onde os shapes divergem (useAccounts, useAssets, useGoals, useAccountStatement); nulabilidades reais tratadas.
- `CreditCards`: estado `closingDayMode` adicionado ao hook e propagado; `Reports` migrado para API `open/onOpenChange` do TransactionModal.
- CI: removido `continue-on-error`; `npx tsc --noEmit -p tsconfig.app.json` agora bloqueia.
- Backlog de formatacao do `src` normalizado com Prettier para o job `lint-and-typecheck` ficar verde (commit `style:` separado, sem mudanca de comportamento).

### BLOQUEADOR descoberto (LGPD / exclusao de conta)

- `useDeleteAccount` chamava a RPC `delete_user_account`, que **nao existe mais no banco** (project vrrcagukyfnlhxuvnssp) — perdida no cutover de baseline. A migration `20260604174400` a define, mas para um schema antigo e incompleto.
- O schema atual tem ~30 tabelas com dados do usuario e varias FKs `NO ACTION` que bloqueariam `DELETE FROM auth.users`, alem de colunas de ator (removed_by, invited_by, etc.).
- Recriar o expurgo fisico envolve **decisao de produto/LGPD** sobre dados compartilhados (viagens/transacoes/cartoes compartilhados de co-donos) e e destrutivo/irreversivel. Nao foi recriado autonomamente.
- Stopgap aplicado: `useDeleteAccount` agora lanca erro explicito ("Exclusao definitiva temporariamente indisponivel...") em vez de falhar com "function not found". Ver item `[LGPD-DELETE]` no CHECKLIST.

### Verificacao e publicacao

- [x] `npx tsc --noEmit -p tsconfig.app.json` = 0 erros.
- [x] `npm test -- --run` = 239 testes passam, 19 ignorados (integracao sem credenciais).
- [x] `npm run build` ok; `npm run format:check` verde.
- [x] ESLint 0 erros (warnings pre-existentes de `any`/unused mantidos).
- [x] Commits `fix: zero global typecheck and enforce it in CI` e `style: ...` publicados na main.

### Proximo passo

- Decisao/execucao do `[LGPD-DELETE]`.
- Itens de desempenho ainda abertos: paginacao cursor-based + remover `SELECT *`; reduzir chunk page-shared; PDF export via Web Worker. HIBP e billing do GitHub Actions dependem de acao do proprietario (plano/billing).

---

## Handoff da sessao - 13/07/2026 - Segredos legados, etapa 11

### Objetivo

Eliminar a credencial administrativa fixa remanescente no historico SQL e impedir sua reintroducao.

### Diagnostico e causa raiz

- Quatro migrations antigas ainda comparavam o parametro `admin_password` com uma senha numerica embutida.
- Migrations posteriores substituiam esse fluxo por JWT e `is_admin()`, mas o segredo continuava versionado e poderia voltar em um bootstrap legado.
- O CI nao possuia contrato estatico para bloquear esse padrao.

### Decisoes e alteracoes

- Os doze pontos de autenticacao por senha legada agora falham de forma incondicional; as rotinas modernas por sessao permanecem como unico caminho administrativo.
- Comentarios historicos deixaram de repetir a credencial.
- Criado `test:secrets`, que varre TypeScript, JavaScript e SQL por comparacoes ou atribuicoes de senha administrativa numerica.
- O job de auditoria do CI executa o contrato antes do `npm audit`.

### Arquivos e banco

- `scripts/check-no-hardcoded-secrets.mjs`, `package.json` e `.github/workflows/ci.yml`.
- Migrations historicas administrativas de 21/05, 22/05 e comentarios de hardening de 28/06.
- Nenhuma mudanca incremental de schema foi necessaria: as funcoes legadas ja estavam substituidas e restritas em producao.

### Verificacao e publicacao

- [x] `npm run test:secrets`.
- [x] Busca independente sem ocorrencias da credencial ou comparacao numerica de `admin_password`.
- [x] `git diff --check`.

### Proximo passo

- Integrar as correcoes TypeScript por dominio, tornar o typecheck bloqueante no CI e revisar cache, paginacao e consultas amplas.

---

## Handoff da sessao - 13/07/2026 - Baseline e error logs, etapa 10

### Objetivo

Criar um ponto de recuperacao reproduzivel do schema e eliminar o drift perigoso entre a migration historica de `error_logs`, producao e frontend.

### Diagnostico e causa raiz

- O primeiro arquivo historico ja altera tabelas centrais cujo CREATE original nunca entrou no repositorio.
- `supabase db dump` depende de Docker; o daemon nao esta instalado nesta maquina.
- A migration antiga de `error_logs` continha senha administrativa hardcoded, nomes de colunas obsoletos e trigger removido.
- Producao tinha trigger de `updated_at`, mas nao tinha a coluna; updates administrativos podiam falhar.
- O historico remoto depois de 02/07 possui timestamps diferentes dos nomes locais por aplicacoes via Management API.

### Decisoes e alteracoes

- Criado gerador PostgreSQL independente de Docker para extensoes, enums, sequencias, tabelas, constraints, funcoes, views, indices, triggers, RLS, policies e ACLs.
- Gerada baseline de cutover do estado atual; migrations anteriores permanecem como trilha de auditoria, nao como bootstrap vazio confiavel.
- A migration historica de `error_logs` foi sanitizada e alinhada ao contrato atual, sem RPC por senha.
- Migration incremental adicionou `updated_at`, fortaleceu `message/status`, corrigiu trigger e RPCs administrativas com `is_admin()` e SQLSTATEs.
- Tipos do frontend foram atualizados.

### Arquivos e banco

- `scripts/generate-database-baseline.mjs` e script npm `db:baseline`.
- `supabase/baseline/20260713_public_schema.sql` e `README.md`.
- `supabase/migrations/20260527135500_create_error_logs.sql`.
- `supabase/migrations/20260713133000_reconcile_error_logs_schema.sql`.
- `src/integrations/supabase/types.ts`.
- Correcao incremental aplicada em producao.

### Verificacao

- [x] Baseline gerada duas vezes com o mesmo SHA-256.
- [x] Snapshot contem 36 tabelas, 164 funcoes, 10 views e 239 grants de funcao.
- [x] Zero grant de funcao para `anon` no snapshot.
- [x] Migration de `error_logs` aprovada em dry-run com `ROLLBACK` antes da aplicacao.
- [x] 107 registros existentes validados sem `message` nula ou `status` invalido.
- [x] Senha administrativa historica removida do arquivo de migration e da baseline.

### Proximo passo

- Zerar o typecheck global, unificar modelos duplicados e revisar cache, paginacao e consultas amplas.

---

## Handoff da sessao - 13/07/2026 - Advisors Supabase e Auth, etapa 9

### Objetivo

Eliminar os advisors acionaveis de RLS e extensoes, explicitar o isolamento administrativo e habilitar MFA sem contratar servicos pagos.

### Diagnostico e causa raiz

- Cinco tabelas tinham policies permissivas sobrepostas para o mesmo comando.
- `admin_users` tinha RLS sem policy e ainda conservava grant direto de `SELECT` para `authenticated`.
- `pg_trgm` estava instalado no schema `public`, exposto pela API.
- TOTP estava desabilitado; WebAuthn avancado tentaria contratar adicional pago e retornou 422 neste projeto.
- Protecao HIBP e exclusiva do plano Pro; o projeto atual esta no plano Free.

### Decisoes e alteracoes

- Policies de `error_logs`, `shared_credit_cards`, `transaction_splits`, `transactions` e `trip_invitations` foram consolidadas preservando a uniao de atores e `WITH CHECK` existentes.
- `admin_users` perdeu grants de cliente e recebeu policy explicita de bloqueio; acesso continua somente por RPCs administrativas auditadas.
- `pg_trgm` foi movido para `extensions`.
- MFA TOTP foi habilitado e versionado em `supabase/config.toml`.
- WebAuthn e MFA por telefone nao foram habilitados por custo/provedor; HIBP foi classificado como dependencia de upgrade, nao como correcao executavel no Free.

### Arquivos e banco

- `supabase/migrations/20260713123000_consolidate_rls_and_move_pg_trgm.sql`.
- `supabase/config.toml`.
- `scripts/test-database-security.mjs`.
- `CHECKLIST.md`, `HANDOFF.md`.
- Migracao e configuracao TOTP aplicadas em producao.

### Verificacao

- [x] Migração completa aprovada em dry-run transacional antes da aplicacao.
- [x] Advisors: zero `extension_in_public`, `rls_enabled_no_policy` e `multiple_permissive_policies`.
- [x] Advisor de MFA insuficiente removido apos `config push`.
- [x] Nenhum custo de WebAuthn/Storage contratado; tentativa recusada antes de alteracao paga.
- [ ] HIBP permanece como dependencia explicita de plano Pro.

### Proximo passo

- Reconciliar baseline e drift de `error_logs`, depois zerar o typecheck e contratos de frontend.

---

## Handoff da sessao - 13/07/2026 - API autenticada v2, etapa 8

### Objetivo

Eliminar IDs de usuario controlados pelo cliente nas RPCs financeiras, fechar a criacao compartilhada em uma unica transacao atomica e tornar grants e isolamento verificaveis no CI.

### Diagnostico e causa raiz

- Dezessete RPCs aceitavam `p_user_id` ou IDs de recursos sem uma fronteira uniforme baseada em `auth.uid()`.
- A criacao de transacao compartilhada tinha fallback cliente em duas escritas, capaz de deixar transacao orfa ou splits parciais.
- As novas funcoes herdavam `EXECUTE` de `PUBLIC`; revogar apenas de `anon` nao remove esse privilegio efetivo.
- O checklist antigo afirmava incorretamente que o cache do PostgREST exigia `GRANT EXECUTE TO anon`.
- Nao havia teste vivo automatizavel para grants, assinaturas legadas e isolamento entre tenants.

### Decisoes e alteracoes

- Criadas 17 assinaturas v2 sem `p_user_id`; a identidade vem exclusivamente de `auth.uid()`.
- Conta e viagem recebem validacao adicional de ownership/membership no banco.
- Assinaturas legadas e APIs de ledger quebradas foram retiradas de `authenticated`.
- O frontend foi migrado para v2 e o fallback nao atomico de transacao compartilhada foi removido.
- `EXECUTE` foi revogado de `PUBLIC` e `anon` em todas as funcoes dos schemas `public` e `private`; default privileges impedem nova exposicao acidental.
- Criado teste de banco que valida 17 RPCs v2, 17 legadas e isolamento cross-user, sem persistir dados.
- O CI passa a exigir `SUPABASE_DB_URL` para executar o contrato vivo de seguranca.

### Arquivos e banco

- `supabase/migrations/20260713112000_create_authenticated_api_v2.sql`.
- `supabase/migrations/20260713114500_revoke_public_function_execution.sql`.
- `scripts/test-database-security.mjs`.
- `.github/workflows/ci.yml`, `package.json`.
- Hooks de dashboard, compartilhados, orcamentos, patrimonio, extrato e criacao de transacao.
- `src/integrations/supabase/types.ts`.
- Duas migracoes aplicadas no projeto de producao `vrrcagukyfnlhxuvnssp`.

### Verificacao

- [x] Sete RPCs de leitura v2 executadas com sessao real em producao.
- [x] Assinatura legada de dashboard recusada com SQLSTATE `42501`.
- [x] Teste vivo aprovou 17 RPCs v2, 17 legadas e isolamento de conta entre dois usuarios.
- [x] `anon` sem execucao efetiva via heranca de `PUBLIC` nas assinaturas verificadas.
- [x] ESLint focado sem erros; 14 avisos preexistentes registrados.
- [x] Tipos v2 completos e `git diff --check` aprovado.
- [x] 32 testes focados aprovados; 7 cenarios dependentes de ambiente ignorados.
- [x] Build Vite de producao e service worker PWA aprovados.
- [ ] Typecheck global bloqueado por divida preexistente agora explicitada; sera zerado em bloco proprio.

### Proximo passo

- Resolver advisors de RLS, mover `pg_trgm`, revisar administracao e configurar protecao de senha/MFA.
- Depois corrigir drift de migrations, tipos globais, cache/paginacao, bundle/PDF, UX, viagens e operacoes.

---

## Handoff da sessão - 13/07/2026 - RPCs privilegiadas, etapa 7

### Objetivo

Proteger operacoes de conta baseadas apenas em ID e tornar a exclusao de conta consistente, autorizada e resistente a falhas concorrentes.

### Diagnostico e causa raiz

- `check_account_dependencies` era `SECURITY DEFINER` e revelava contagens de qualquer conta sem validar ownership.
- A funcao ignorava transferencias de destino, registros removidos e despesas compartilhadas em aberto.
- O frontend ignorava falhas da checagem e continuava a exclusao.
- O frontend tentava atualizar a coluna removida `accounts.deleted`.
- `soft_delete_account` apagava transacoes ativas em cascata, criando risco de perda caso uma transacao surgisse entre a checagem e a exclusao.
- `calculate_single_account_balance` validava o dono, mas tinha `search_path=public` e estava exposta diretamente apesar de ser apenas auxiliar interna de `recalculate_all_balances`.

### Decisoes e alteracoes

- `check_account_dependencies` agora exige sessao, conta ativa do usuario e usa `search_path = ''`.
- As contagens incluem origem e destino de transferencias, ignoram soft delete e calculam despesas compartilhadas abertas.
- A exclusao no frontend agora falha fechada quando a verificacao nao retorna resultado.
- O frontend chama `soft_delete_account` em vez de escrever uma coluna inexistente.
- `soft_delete_account` repete ownership e invariantes sob lock, recusa contas com transacoes ou metas e nao apaga historico em cascata.
- Contas com historico devem usar o fluxo separado de arquivamento.
- A chamada direta de `calculate_single_account_balance` foi retirada de `authenticated`; o uso interno pelo recálculo em lote foi preservado.

### Arquivos e banco

- `supabase/migrations/20260713102500_harden_account_dependency_rpcs.sql`.
- `supabase/migrations/20260713103500_harden_soft_delete_account.sql`.
- `src/hooks/useAccounts.ts`.
- `CHECKLIST.md`.
- `HANDOFF.md`.
- Duas migracoes aplicadas no projeto de producao `vrrcagukyfnlhxuvnssp`.

### Verificacao

- [x] Dono consultou dependencias reais da propria conta.
- [x] Usuario A consultando conta de B recebeu SQLSTATE `42501`.
- [x] Chamada direta ao recalculo unitario recebeu SQLSTATE `42501`.
- [x] `recalculate_all_balances` continuou funcional dentro de transacao com `ROLLBACK`.
- [x] Conta com historico foi recusada por `soft_delete_account` com SQLSTATE `23503`.
- [x] Exclusao de conta vazia foi validada com `ROLLBACK` e o estado original foi confirmado.
- [x] Usuario A tentando excluir conta de B recebeu SQLSTATE `42501`.
- [x] Grants e `search_path = ''` conferidos nas tres RPCs.
- [x] Advisors de seguranca executados apos as migracoes.
- [x] ESLint e `tsc --noEmit` aprovados.
- [x] Testes focados: 3 arquivos e 38 testes aprovados.

### Checklist pendente do P0 Supabase

- [ ] Corrigir RPCs de leitura e relatorios que ainda aceitam `p_user_id`.
- [ ] Auditar `calculate_balance_between_users`, `calculate_member_balance` e `settle_balance_between_users`.
- [ ] Auditar `recalculate_account_balance`, `get_account_balance_at_date` e `create_account_with_balance`.
- [ ] Criar API v2 sem `p_user_id` para Web/PWA e futuro cliente Swift.
- [ ] Criar testes automatizados de isolamento, grants e compensacao no banco para CI.
- [ ] Substituir os `any` de `useSharedExpensesActions` por tipos do cache e das mutacoes.
- [ ] Resolver `admin_users`, `pg_trgm`, protecao contra senhas vazadas e MFA.

---

## Handoff da sessão - 13/07/2026 - RPCs privilegiadas, etapa 6

### Objetivo

Retirar da API autenticada quatro endpoints legados de confirmacao e liquidacao parcial sem contrato de autorizacao seguro.

### Diagnostico e causa raiz

- Nenhuma das quatro RPCs possui consumidor no frontend, Edge Functions ou em outras funcoes do banco.
- `reject_settlement_request` zerava os dois lados e apagava transacoes associadas sem validar participante ou ownership.
- `settle_partial_balance` aceitava dois usuarios arbitrarios, alterava valores historicos de splits e confirmava ambos os lados.
- `mark_as_paid_by_debtor` e `mark_as_received_by_creditor` aceitavam um ID de transacao de liquidacao sem validar ownership.
- O checklist anterior preservava `settle_partial_balance` pelo conceito, sem evidencia de consumidor ou revisao de autorizacao.

### Decisoes e alteracoes

- Execucao por `PUBLIC`, `anon` e `authenticated` foi revogada das quatro RPCs.
- `service_role` foi preservado explicitamente para recuperacao administrativa controlada.
- As funcoes nao foram removidas nesta etapa para manter reversibilidade e permitir analise de dados historicos.
- O checklist historico foi corrigido para registrar a nova evidencia e evitar que a decisao antiga seja reutilizada.

### Arquivos e banco

- `supabase/migrations/20260713100500_restrict_legacy_settlement_confirmation_rpcs.sql`.
- `CHECKLIST.md`.
- `HANDOFF.md`.
- Migracao aplicada no projeto de producao `vrrcagukyfnlhxuvnssp`.

### Verificacao

- [x] Busca no codigo executavel encontrou zero consumidores das quatro RPCs.
- [x] Busca nas funcoes do banco encontrou zero chamadas indiretas.
- [x] Chamadas reais como `authenticated` retornaram SQLSTATE `42501` nas quatro RPCs.
- [x] Grants conferidos: somente `service_role` pode executar.
- [x] Advisors de seguranca executados; as quatro funcoes sairam da lista autenticada.

### Checklist pendente do P0 Supabase

- [ ] Corrigir RPCs de leitura e relatorios que ainda aceitam `p_user_id`.
- [ ] Auditar `calculate_single_account_balance` e `check_account_dependencies` por ID de conta.
- [ ] Auditar `calculate_balance_between_users`, `calculate_member_balance` e `settle_balance_between_users`.
- [ ] Criar API v2 sem `p_user_id` para Web/PWA e futuro cliente Swift.
- [ ] Criar testes automatizados de isolamento, grants e compensacao no banco para CI.
- [ ] Substituir os `any` de `useSharedExpensesActions` por tipos do cache e das mutacoes.
- [ ] Resolver `admin_users`, `pg_trgm`, protecao contra senhas vazadas e MFA.

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
