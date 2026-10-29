# CHECKLIST.md — Sprint Kanban: Seu Bolso Inteligente

> Kanban de tarefas em markdown. Atualizar a cada sessão.

## Painel de acompanhamento — atualizado em 27/10/2026

| Estado | Item | Evidência / próximo passo |
|---|---|---|
| Feito localmente | Ajuste e responsividade do topbar | Centraliza os links quando cabem e inicia pela esquerda quando precisam rolar; E2E de navegação Chromium passou 4/4 e o build passou. |
| Feito | Revisão semântica das 55 RPCs `SECURITY DEFINER` autenticadas | Catálogo: 131 funções `SECURITY DEFINER`, 55 executáveis por `authenticated`, zero por `anon` e zero sem `search_path`. Achados corrigidos nas quatro migrations aplicadas em 24/10 e cobertos com fixtures sintéticas revertidas; ledger remoto e dry-run confirmados. |
| Feito nesta sessão | Cálculo de divisão, exportação e backend legado | Divisão usa percentuais com centavos/resíduo controlados e bloqueia confirmação com total inválido ou vínculo familiar ausente. Export JSON testa 14 tabelas, arquivo baixado e URL temporária revogada; avisa que pode incluir dados compartilhados. Quatro migrations foram aplicadas e verificadas, incluindo remoção das seis assinaturas RPC obsoletas. |
| **Foco atual** | Continuar cobertura ampla pós-release | Commit `9ed0fc73` publicado em `main`; deployment Vercel `dpl_J6j6jKC3zEXRY4hqRx5w8gAsmXvx` `READY`; produção serve `version.json=1793115952360`. A correção de Configurações móvel/nome do dashboard passou 5 testes focados, typecheck, ESLint focal, Prettier e build. Suíte completa mais recente: 357 aprovados/19 ignorados; E2E cross-browser: 114/115, 1 skip esperado. 326 migrations locais/remotas; `db lint` sem erros reais, com falso positivo `_sdt_targets` e warnings; `npm audit` mantém três findings moderados em Tailwind 3/PostCSS. |
| Próximo foco | Fixtures e matriz de fluxos | Preparar DSN/CA TLS e fixtures sintéticas não-admin para o harness DB (estimativa 35–75 min se já disponíveis); em paralelo, matriz CRUD/cálculos e contrato de backup v2. Aceite OFX live segue pendente; o restore continua desativado até implementação transacional e revisão. |
| Depois | Backup e restauração | Implementar snapshot consistente e restore transacional conforme contrato v2 e escolha do usuário de substituir também dados compartilhados; hoje restore fica corretamente desativado. |
| Aguardando | OFX em produção | Parser corrigido publicado; suíte local passou 13/13. Permissão foi confirmada pelo usuário, mas o aceite live está pendente porque a automação não identificou a URL da janela. Nenhum upload ou registro criado. |

**Progresso registrado:** 365/400 itens concluídos (35 abertos; 8,8%). No grupo `AUDIT`, 189/213 concluídos (24 abertos; 11,3%). Contagem de caixas, não porcentagem de cobertura/tempo; há sobreposição e itens históricos. Quatro migrations deste ciclo foram aplicadas e as correções do frontend estão publicadas; permanecem fluxos live, backup seguro, CRUDs/cálculos autenticados e findings técnicos residuais.

**Regra de continuidade:** ao concluir o foco atual, marcar sua caixa no checklist e mover o próximo item para “Foco atual”; atualizar este painel e o `HANDOFF.md` na mesma sessão.

- [x] **[UI-MOBILE-SETTINGS-USERNAME-1027]** Configurações adicionada como destino direto na faixa horizontal móvel, sem submenu “Mais”. Saudação do dashboard prioriza nomes de perfil/provedor e ignora o endereço, prefixo e metadados não textuais. Testes focados 5/5; typecheck, ESLint focal, Prettier e build de produção passaram; revisão independente aprovou. Commit `9ed0fc73` publicado; Vercel `dpl_J6j6jKC3zEXRY4hqRx5w8gAsmXvx` `READY` e versão live confirmada. Captura visual em viewport móvel ainda não foi feita.

- [x] **[AUDIT-FAMILY-PROFILES-403-1022]** Commit `725f50c` enviado a `main`, deployment de produção `Ready`. Preview confirmado pelo Wesley; no alias live, aba nova autenticada mostrou Fran em `MEMBROS (1)` e Jhonatan em `CONTATOS DE DESPESA (1)`. Navegar Início → Família também recuperou a aba que antes mostrava erro. Supabase somente leitura sob role/claims autenticados confirmou 1 família, 2 membros, 1 contato e 3 perfis de enriquecimento; sem escrita. O fix remove joins a `profiles` no carregamento principal e tolera falha secundária de avatar. CI #39761847259: build, Vitest, lint, typecheck e formato alterado passaram; Playwright Chromium teve 14 falhas/4 passagens com URL e anon key de teste vazias; Database Security Contract falhou por falta de `SUPABASE_DB_URL`; Security Audit falhou por findings de dependências de produção. Não foi necessária alteração de migration ou dados financeiros.

- [x] **[UI-TOPBAR-RESPONSIVE-1024]** E2E Chromium `e2e/navigation.spec.ts` passou 4/4 e build passou. Corrigido defeito de 785 px: “Início” ficava fora da área clicável quando os links excediam a faixa. Produção confirmou os links horizontais no deploy autenticado; viewport amplo centraliza e largura intermediária mantém o primeiro destino alcançável.

- [x] **[AUDIT-BACKUP-RESTORE-REVIEW-1024]** Revisões independentes somente leitura confirmaram riscos P1 no restore legado não atômico, cascatas de viagem para transações de terceiros e falhas/cascatas ao excluir contas; apontaram também membership/PII de terceiros no export por trip. `BackupManager.test.tsx` + `backupUtils.test.ts`: 4/4 passaram; restore continua desativado. O contrato v2 citado nos registros históricos está ausente deste checkout e precisa ser reconstruído antes de reativar a restauração. Nenhum dado remoto foi alterado.

- [x] **[AUDIT-MOBILE-ROUTE-PRELOAD-1020]** Corrigido atraso evitável do menu móvel: `MobileNav` inicia preload do chunk ao pointerdown/toque e foco, em paralelo à navegação. E2E prova que a requisição de Contas começa antes do clique em Chromium e Mobile Chrome; typecheck e formato passaram. Deploy `dpl_FxfLGATcoJSs7HpLqSqZxkD3dBzK` ficou READY e smoke autenticado percorreu 12 rotas sem ErrorBoundary. O benchmark controlado de `/configuracoes` está registrado em `[AUDIT-COLD-ROUTE-BENCHMARK-1020]` logo abaixo.

- [x] **[AUDIT-TRIP-RPC-INVITATION-BALANCES-1020]** Migration remota `20261020223745_harden_trip_invitation_responses_and_balances.sql` limita saldos da viagem a owner/membro ativo em viagem não excluída e endurece resposta de convite com whitelist, estado pendente, locks e proteção contra aceite após exclusão. `npm run test:trip-rpc-security`: 12/12 checks aprovados com `testDataRestored=true`; revisor independente aprovou; pós-condições live passaram e `db push --dry-run` está up-to-date.

- [x] **[AUDIT-VITE7-SECURITY-DEPLOY-1020]** Atualizado Vite para 7.3.7; testes locais: Vitest 356/19 ignorados, Playwright 114/1 skip esperado em cinco projetos, typecheck, format, ESLint, secret scan e build aprovados. `npm audit`: 7 avisos de dev (2 moderados, 5 altos), contra 9; `npm audit --omit=dev`: zero. Deploy `dpl_6roGaj73yoWxtbDsuL69d4Sj5D4i` READY e produção verificada; `version.json=1792495643687`. Migração Tailwind 4 e teste live OFX permanecem pendentes; aba do navegador restaurada na seção Backup.

- [x] **[AUDIT-RELEASE-CROSS-BROWSER-1020]** Suíte Vitest: 356 passaram, 19 ignorados; Playwright em Chromium, Firefox, WebKit, Chrome móvel e Safari móvel: 104/105 passaram, 1 skip esperado do viewport desktop no Safari móvel. Typecheck, Prettier, `git diff --check` e build passaram. Ajustados esperas da navegação e Investments no teste E2E; 12 testes focalizados passaram em Chromium/Firefox/Chrome móvel. Publicado `dpl_FoD6GHLhDovW5zoaMPLToKNXVugP`, READY; versão live `1792493711478`. Rotas `/configuracoes`, `/transacoes` e `/familia` responderam 200. Em sessão autenticada: 16 transações, saldos no baseline, Fran membro e Jhonatan contato; formulário Dividir mostrou ambos e foi cancelado sem salvar.
- [ ] **[AUDIT-OFX-LIVE-UPLOAD-1020]** Upload OFX sintético ainda não concluído. Wesley confirmou que “Permitir acesso a URLs de arquivo” está habilitado na extensão Codex do Brave. O parser corrigido foi publicado e a suíte local passou 13/13; em 25/10 a janela do Brave visível estava em MyClaw.ai e Computer Use encerrou porque não conseguiu determinar a URL com confiança suficiente. Nenhum arquivo foi enviado; retomar quando a URL de produção puder ser validada pela ferramenta.
- [x] **[AUDIT-DB-TLS-HARNESS-1025]** Removida a configuração `rejectUnauthorized: false` de `test-database-security.mjs` e `generate-database-baseline.mjs`; ambos reutilizam `getVerifiedDbConnectionConfig`, que exige TLS validado, aceita CA oficial configurada e remove parâmetros de URL que poderiam substituir a política. Os seis testes do helper passaram; ESLint, Prettier, `node --check`, typecheck, Vitest completo (332 passaram/19 ignorados) e build passaram. O gate live continua pendente de secret/CA apropriados e cenário de isolamento não deve ser considerado aprovado.
- [x] **[AUDIT-DB-ISOLATION-GATE-FIXTURES-1025]** `test-database-security.mjs` não silencia mais cenários cross-user/admin quando faltam fixtures: exige conta ativa com usuário não administrador diferente do dono e ao menos um usuário comum; cada tentativa de RPC negativa usa `BEGIN` e `ROLLBACK` em `finally`. O CI segue pendente de `SUPABASE_DB_URL` e de ambiente com essas fixtures pré-provisionadas; não inserir secret nem rodar contra produção sem setup aprovado.
- [x] **[AUDIT-REPORTS-QUERY-ERROR-1025]** Relatórios agora distingue o estado de falha da consulta de uma lista vazia, mostra estado de erro e botão de retry. Teste `src/pages/Reports.test.tsx` comprova erro visível, ausência do estado vazio e chamada de `refetch`; suíte Vitest completa: 346 passaram/19 ignorados (52 arquivos passaram/2 ignorados); build de produção local passou.
- [x] **[AUDIT-DB-LINT-LEGACY-RPCS-1020]** As seis assinaturas que causavam referências a `audit_logs`, `financial_ledger` e schema de viagem foram removidas pela migration `20261025143000_drop_broken_legacy_rpc_signatures.sql`, sem `CASCADE`. Confirmado sem callers no frontend, nos oito Edge Functions baixados do projeto ou em `cron.job`; as quatro assinaturas com EXECUTE prévio de `service_role` deixam de existir (consumidor externo desconhecido permanece risco). Entradas retiradas de `types.ts` e harness DB exige `to_regprocedure(...) IS NULL`. Preflight BEGIN/ROLLBACK e pós-query confirmaram 6/6 ausentes; lint subsequente eliminou os seis erros reais. Fica no item de lint geral apenas o falso positivo `_sdt_targets` e warnings de variáveis. 326 migrations locais/remotas, dry-run up-to-date.
- [ ] **[AUDIT-DEV-DEPENDENCY-ADVISORIES-1020]** DOMPurify, Zod, Vite e Vitest atualizados; React Router passou de 6 para 7.18.4 e os testes/build locais passaram. `npm audit` mantém três findings moderados no encadeamento Tailwind 3/PostCSS. A auditoria de migração Tailwind 4 recomenda validar primeiro o piso suportado de Safari/iOS; há mudanças em diretivas, configuração, plugin e utilitários.
- [x] **[AUDIT-A11Y-TRANSACTION-FILTERS-1024]** `TransactionFilters` tinha botões de seleção sem nome acessível no mobile. Acrescentados nomes ARIA para os quatro filtros e o botão “Filtros”; axe passou no formulário de transações em Mobile Chrome e Mobile Safari.
- [ ] **[AUDIT-BACKUP-CONSISTENT-SNAPSHOT-1020]** Export agora tem teste que confirma 14 consultas, JSON baixado, `userId`, conteúdo e revogação da URL temporária; o aviso informa que pode conter dados compartilhados e identificadores de terceiros. Ainda não garante snapshot consistente e exportação live não teve o arquivo observado. Restore permanece desativado até implementação atômica com rollback e cobertura integral, respeitando a escolha do usuário de substituir dados compartilhados também.
- [x] **[AUDIT-COLD-ROUTE-BENCHMARK-1020]** Rebenchmark live em `/configuracoes`, mediana de 3 navegações no Brave com cache/service worker desativados: load 363 ms, TTFB 43 ms, DOMContentLoaded 331 ms, FCP 324 ms e 397.079 bytes transferidos. Comparado ao baseline histórico de load 535,6 ms, reduziu 32,2%; as condições não são idênticas à primeira visita. A grade iniciou com 2 imagens (35.199 bytes), contra 30 (586.928 bytes) no baseline, 94% menos tráfego inicial; as demais carregaram sob demanda ao rolar.
- [x] **[AUDIT-LIVE-CRUD-DUPLICATE-1020]** Create/edit/delete live de registros sintéticos, limpos um a um; Nubank e saldo consolidado voltaram exatamente ao baseline e `/transacoes` mostrou 16 registros sem os testes. Ajustado alerta de duplicidade para sumir no mesmo render durante submit; teste focal 1/1, typecheck, Prettier e diff check passaram. Deploy READY `dpl_6x9jQj1q6sRYrXkD2BPVDr3Sg6Eh`, `version.json` `1792491997247`. Aceite pós-deploy concluiu: PWA atualizada; novo registro apareceu como 17º sem alerta de duplicidade; exclusão retornou a lista a 16 e os saldos ao baseline. Medição formal do carregamento frio permanece pendente.

> Histórico abaixo; estado atual e próximos passos ficam no HANDOFF.md, atualizado em 25/10/2026.

- [x] **[AUDIT-DB-SECURITY-DEFINER-INVENTORY-1020]** Catálogo remoto: 131 funções `SECURITY DEFINER`; zero executáveis por `anon`, zero sem `search_path`, 55 executáveis por `authenticated`. Corpos e callers das 55 reconciliados por domínio. Além dos grupos financeiros previamente revisados, família/viagem, PIN/perfil, funções admin, logs, convites e helpers foram examinados. Achados confirmados/candidatos em projeção, resumo de despesas por pessoa, payload de perfil administrativo e helpers de conta inativa; risco RLS em `is_family_member_v2` depende de existirem memberships inativas/soft-deleted persistentes. As 6 funções legadas com lint de relação/coluna são `service_role`-only, sem triggers/callers diretos no frontend/Edge. Esta conclusão documenta cobertura semântica; os achados precisam de correção e validação próprios.
- [x] **[AUDIT-TRIP-RPC-INVITATION-BALANCE-REGRESSION-1024]** Migration `20261024212001` aplicada em produção; corrige filtro de splits soft-deleted no saldo de viagem e limpeza de notificações de convite, preservando metadata divergente/de outro usuário. Harness sintético em transação revertida: 15/15, `testDataRestored=true`; serviço de notificação 4/4; estado remoto em `schema_migrations` e dry-run confirmados.
- [x] **[AUDIT-FINANCIAL-RPC-SPLITS-SERIES-1024]** Migration `20261024212531` aplicada em produção; valida soma/percentuais, rejeita subcentavos e quitação indevida, protege a série e troca hard-delete por soft-delete com advisory lock compartilhado. Harnesses live anteriores passaram com rollback; os casos finais de subcentavos/`settled_at` foram exercitados por SQL CLI em transação revertida antes da aplicação; registro remoto confirmado.
- [x] **[AUDIT-FAMILY-ADMIN-SHARED-RPC-1024]** Migration `20261024222000_harden_family_membership_admin_and_shared_summary.sql` aplicada em produção; limita membership ativa/família válida, remove `app_pin_hash` do dossier admin, filtra splits removidos/receitas e exige destino ativo. Testes sintéticos com rollback cobriram cada caso; versão no ledger remoto confirmada.
- [x] **[AUDIT-MONTHLY-PROJECTION-INACTIVE-SPLITS-1024]** Migration `20261024223500_fix_monthly_projection_inactive_accounts_and_deleted_splits.sql` aplicada em produção; exclui contas inativas e splits removidos da projeção e reconstrói saldo histórico usando movimentos postados e somente lados ativos de transferências. Testes `BEGIN/ROLLBACK` cobriram contas ativas/inativas, movimentos postados/agendados e transferências nos dois sentidos; versão remota confirmada.

- [x] **[AUDIT-LIVE-FAMILY-SPLIT-1020]** Após atualizar a PWA disponível, smoke autenticado em produção confirmou Fran em “Membros (1)” e Jhonatan em “Contatos de despesa (1)”. O formulário novo abriu “Divisão e Pagamento” e listou Fran e Jhonatan como participantes; não confirmei a divisão nem salvei transação. OFX mostra as contas reais e habilita o envio depois de selecionar Itaú; modal fechado sem escolher arquivo. Nenhum dado do banco foi alterado.

- [x] **[AUDIT-REMOTE-MIGRATION-CATALOG-1020]** CLI confirmou 309 migrations locais/remotas coincidentes e `db push --linked --dry-run` up-to-date. Catálogo confirma hardening de profiles/transactions; os dois harnesses foram executados via URL temporária do `.env.local`: segurança 19 RPCs passou, smoke 29 checks passou e `testDataRestored=true`.

- [x] **[AUDIT-OFX-DEDUP-PERFORMANCE-1020]** Importação consulta todo o intervalo de datas (com paginação) e compara duplicatas por índices em memória. Falha na consulta bloqueia a gravação. 13 testes focados e suíte Vitest completa (355 passaram, 19 ignorados; 61 arquivos passaram, 2 ignorados), typecheck, Prettier e `git diff --check` passaram. Deploy `dpl_8odYgGvYM1QfvDy3rtbvddKG4riR` ficou READY; `version.json` live confirma build `1792490716440`. Aceite live de upload/duplicata/exclusão com OFX sintético pendente: política do navegador bloqueou a interface oficial de permissões; não houve contorno, upload nem gravação.

- [x] **[AUDIT-FAMILY-BALANCE-FRAN-JHONATAN-1019]** Após autorização do usuário, os itens residuais de Fran foram quitados e os registros de teste citados não foram usados para nova reconciliação. Aceite live posterior: Fran não aparece mais no painel; Jhonatan mostra R$ 910,38, correspondente à parcela de novembro informada pelo usuário.

- [x] **[AUDIT-NAV-REMOVE-DORMANT-MORE-1019]** Removidos o dropdown condicional “Mais” e a lista vazia de secundários. Playwright Chromium `e2e/navigation.spec.ts` passou 2/2, ESLint focal, diff check e revisão independente aprovados; produção já mostrava todos os 11 links diretos, então não houve novo deploy.

> Nota: valores e lançamentos familiares citados em itens históricos foram identificados pelo usuário como dados de teste; não usar para reconciliação financeira.

- [x] **[AUDIT-LIVE-FAMILY-SHARING-1019]** Em produção, reproduzido que `/familia` mostra zero apesar dos vínculos existentes e “Dividir” cai em “Divisão Rápida”. Causa: bundle publicado pede `profiles.email`, coluna bloqueada pelo hardening; o hook publicado ignora o erro do dono e retorna família vazia. Com role `authenticated` e RLS, confirmado Fran como membro ativo e Jhonatan como contato. A consulta publicada continua no build de 09/10.
- [x] **[AUDIT-CONTACT-TRANSACTION-FORM-1019]** A pedido do usuário, habilitado `active_in_form=true` apenas para o contato ativo Jhonatan na família própria; pós-condição remota confirmou 1 linha. Fran aparece pela lista de membros. Helper do formulário testado: mantém membros, inclui contatos habilitados e exclui contatos desabilitados; SplitModal renderiza ambos os tipos. Sem criar transação.
- [x] **[AUDIT-NO-QUICK-SPLIT-1019]** Removido “Divisão Rápida” do formulário; o botão “Dividir” sempre abre o seletor normal de pessoas, mesmo sem membros carregados. Teste comportamental passou; sem salvar lançamento.
- [x] **[AUDIT-FAMILY-INVITE-REGISTERED-EMAIL-1019]** Produção mostra incorretamente “Usuário não cadastrado. Os dados ficarão salvos localmente.” A migration de convite por email já está live e o hook local registra sem procurar perfil; causa do sintoma é frontend live desatualizado. Nenhum convite real enviado.
- [x] **[AUDIT-POSTGRES-ROLLBACK-TLS-1019]** CA oficial configurado; `test:db-security` passou com TLS validado e probes revertidos. `test:db-smoke` passou 29 verificações com `testDataRestored=true`. Corrigido harness `withRollback` após identificar `BEGIN` aninhado que encerrava contexto de autenticação. Uma sonda defeituosa alterou temporariamente o nome de Fran para marcador de auditoria; valor restaurado para `Fran`, marcador residual confirmado zero.
- [x] **[AUDIT-PRODUCTION-DEPLOY-FAMILY-REALTIME-1019]** Vercel produção `dpl_5Kv6fPHHyvjUWgRwMkBJAg67sTAX` `READY`; versão `1792449872801`. Após limpeza do cache PWA, teste autenticado confirmou Fran/família, Jhonatan/contato habilitado, convite sem alerta de perfil, `/compartilhados` e modal Dividir com ambos; fluxos cancelados sem gravação. Smoke inicial revelou callback Realtime adicionado após subscribe; corrigido usando escopo único por efeito, suíte 347/19, typecheck, lint focal, formato e build passaram, redeploy concluído. Aba nova pós-deploy não mostrou erros de console; erros da aba anterior são logs históricos anteriores ao deploy. E2E móvel amplo permanece pendente.
- [x] **[AUDIT-NAV-ALL-LINKS-1019]** A pedido do usuário, os 11 destinos voltaram a ficar visíveis lado a lado no cabeçalho; removido o botão “Mais”. Rolagem horizontal preserva linha única em viewport intermediário. Playwright Chromium a 785 px passou para todos os destinos; typecheck, formato e build passaram. Deploy `dpl_7JwrUEERAsk788c4WuwAaHctJEtU` `READY`; conferido no site após limpeza do cache PWA.
- [x] **[AUDIT-MOBILE-NAV-NO-MORE-1019]** Removido “Mais” da barra móvel; os 11 destinos permanecem como botões próprios numa faixa horizontal rolável e “Nova” continua disponível. Adicionados degradê quando há mais destinos e descrição acessível. Produção `dpl_A5wmniz4WavJ6MquauhDdXjKFTEp` `READY`; no browser autenticado a 390×844 foram vistos 12 botões, overflow 1037/375 px, degradê e navegação funcional até Simuladores, sem mutação de dados. Playwright completo 99 passou/1 ignorado nos 5 projetos; Vitest 347/19 ignorados, typecheck, build, ESLint focal, Prettier focal e diff check passaram.
- [x] **[AUDIT-LOCAL-RELEASE-CANDIDATE-1019]** Vitest 347 passou/19 ignorados; typecheck, build, ESLint focal e `git diff --check` passaram após a correção do formulário.
- [x] **[AUDIT-REVIEW-CURRENT-FIXES-1019]** Revisão independente somente de código não achou bloqueadores nos fluxos de convite, composição do seletor e rollback dos harnesses. Revisão não substitui validação live pós-publicação.
- [x] **[AUDIT-LIVE-PRIVATE-PROFILE-CONSUMERS-1019]** Removida dependência das colunas privadas nas leituras locais de família, cartões compartilhados e convites; erros de família/membros não são convertidos em tela vazia; erros de convites/contactos ficam observáveis. Teste cobre query segura do dono e propagação do erro.
- [x] **[AUDIT-BACKUP-ACCOUNT-SCOPE-1019]** Exportação de `accounts` agora filtra `user_id` do usuário, para não exportar contas de terceiros tornadas visíveis por compartilhamento/RLS. Restauração segue desativada por risco de operação parcial e cobertura incompleta.
- [x] **[AUDIT-LOCAL-FINAL-1019]** Vitest 346 passou/19 ignorados; typecheck, build de produção, secret scan e `git diff --check` passaram; ESLint focal passou com cinco warnings existentes em `Family.tsx`.
- [x] **[AUDIT-LIVE-FRONTEND-RELEASE-1019]** Frontend publicado, com `version.json` atual em `1792452116907`; aceite autenticado anterior confirmou `/familia` com Fran membro e Jhonatan contato, `/compartilhados`, modal normal de convite sem verificar existência da conta e Nova transação > Dividir com ambos, sem enviar convite ou salvar lançamento. Navegação desktop e móvel sem “Mais” verificada em produção; a suíte Playwright atual passou 99/100 (1 skip esperado).

- [x] **[AUDIT-SOFT-DELETE-ACCOUNT-DRIFT-1019]** Corrigida a função live insegura `soft_delete_account(uuid)` por migration forward `20261019161707`: exige ownership, bloqueia exclusão com transações/metas vinculadas e nunca apaga transações. Confirmado que 9 vínculos ativos entre contas e transações de donos diferentes permaneceram intactos; anon sem EXECUTE, migration registrada, dry-run sincronizado, typecheck e diff check aprovados. Não executada operação destrutiva live.
- [x] **[AUDIT-SUPABASE-DASHBOARD-OBSERVABILITY-1019]** Dashboard autenticado revisado: projeto Healthy, `harden_soft_delete_account_live` como última migration, 18/60 conexões, CPU 4%, disco 4%, RAM 51%; 128 requisições/89,8% sucesso e 5 avisos API 4xx. Logs: dois erros `42P01` atribuídos às minhas próprias consultas de auditoria; cinco `42501 permission denied for table profiles` sem query/command e ainda sem causa; `08P01` standby EOF sem atribuição. Auth Attack Protection reporta senha vazada Disabled sem controle de configuração nesta tela; Overview informa nenhum backup. Ver pendências no HANDOFF.
- [x] **[AUDIT-ANON-ACL-DEFAULTS-1019]** Migration revisada independente e aplicada: `20261019233500_restrict_anon_default_privileges_public.sql`. Defaults de `anon` removidos para tabelas/sequences futuras de `postgres` em `public`; grants atuais de `error_logs` continuam funcionais. POST Data API anônimo com `return=minimal` retornou 201 e o marcador foi removido (consulta posterior confirmou zero). Teste transacional confirmou que tabela/sequence futura não herda privilégios de `anon`, mantém os grants de `authenticated` e rollback não deixou objeto; `db push --dry-run` confirmou banco sincronizado.

- [x] **[AUDIT-PROFILE-UPDATE-COLUMNS-1018]** Revisão independente da migration de perfil contra `src/hooks/useUserProfile.ts` e o restante de `src`: `shared_closing_day`, `shared_due_day` e `shared_credit_card_behavior` não são usados pelo app; manter essas colunas fora do GRANT UPDATE preserva menor privilégio. Campos editados atualmente estão incluídos. Não houve escrita remota; consumidor SQL/RPC externo ao checkout ainda não foi descartado.
- [x] **[AUDIT-LOCAL-CROSSBROWSER-1019]** Vitest atual: 340 passaram e 19 ignorados; typecheck passou; `test:db-connection` passou 6/6; Playwright passou 90/90 em cinco perfis de navegador. Playwright intercepta as chamadas Supabase, portanto não comprova o backend.
- [x] **[AUDIT-MIGRATION-STATUS-1019]** Reconsulta `supabase migration list --linked`: 303 registros locais/remotos sem divergência de timestamp (0 apenas local, 0 apenas remoto); `supabase db push --linked --dry-run` retornou `upToDate=true` e nenhuma migration/seed/role pendente.
- [x] **[AUDIT-LIVE-SETTINGS-RELOAD-1019]** Em sessão autenticada, reload de Perfil mostrou estado inicial da aplicação e depois conteúdo completo; a produção ainda exibe “Sem nome”. Categorias carregou 181 no badge e itens presentes; console sem erros/avisos. Observação manual, sem benchmark de latência preciso; melhoria local de Perfil ainda não está publicada.
- [x] **[AUDIT-REMOTE-LEGACY-FUNCTIONS-1019]** Catálogo remoto consultado sem escrita: funções de saldo referem tabela removida e funções de liquidação referem `audit_logs` ausente; não há consumidores no frontend/Edge/crons e grants são apenas postgres/service_role. Classificadas como legado quebrado, sem caminho ativo ao usuário.
- [x] **[AUDIT-ADMIN-RESET-FLOW-1019]** Confirmado que o painel desabilita explicitamente o reset e avisa que está temporariamente indisponível; o handler lança erro, mas não é alcançável pela interface. RPCs remotas antigas filtram `trip_checklist.user_id`, coluna inexistente, e não há Edge Function/cron consumidor. Classificado como recurso suspenso, sem falha ativa no fluxo visível; não reativar sem rota server-side autorizada e teste isolado com rollback.
- [x] **[AUDIT-LOCAL-CROSSBROWSER-1018]** Revalidação da suíte atual: Vitest 336 passaram/19 ignorados; typecheck e secret scan passaram; Deno 9/9 e `deno fmt --check` passaram; Playwright 90/90 em Chromium, Firefox, WebKit, Mobile Chrome e Mobile Safari. São evidências de código/local, não CRUD contra o banco publicado.
- [x] **[AUDIT-LIVE-READONLY-SMOKE-1018]** No site publicado, Dashboard, Transações, Contas, Família e as duas abas de Simuladores carregaram em sessão autenticada, sem submeter formulários. Divergência do Dashboard versus lista de Transações permanece; botão “Puxar do BCB” aparece desabilitado no simulador IPCA. Sem alterações de dados.
- [x] **[AUDIT-DATABASE-HARNESSES-CURRENT-1018]** CA oficial baixado de Supabase Dashboard e DSN não-poolado ligado aos harnesses sem expor credenciais. `test:db-security` passou com TLS estrito (19 RPCs v2, owner probe bloqueado com `42501`, rollback garantido); `test:db-smoke` passou 29 verificações sem falhas/skips, `testDataRestored=true`.
- [x] **[AUDIT-DB-TLS-STRICT-1018]** Revisão independente encontrou `rejectUnauthorized:false` nos harnesses DB e no gerador de baseline, além de parâmetros de URL capazes de sobrescrever TLS estrito. Centralizei a configuração `node-postgres` com CA/hostname verificados, rejeição de `sslcert`/`sslkey` na URL e bloqueio de `NODE_TLS_REJECT_UNAUTHORIZED=0`; os três scripts usam o helper. Seis regressões verificam o objeto SSL efetivo do `pg.Client`. Para funcionar contra este Supabase, ainda falta o certificado raiz oficial do projeto; conexão estrita atual abortou em `SELF_SIGNED_CERT_IN_CHAIN` antes de SQL. Execuções anteriores desses scripts usaram validação TLS desabilitada e precisam ser repetidas com o certificado.

- [x] **[AUDIT-PROFILE-ACL-LIVE-1018]** Consulta somente leitura a information_schema, pg_policies, pg_proc e has_*_privilege confirmou em produção ACLs de anon/authenticated sobre 24/24 colunas de profiles, SELECT na app_pin_hash, UPDATE em id/hash, TRUNCATE permitido e policy que libera SELECT de toda linha a qualquer autenticado. get_my_profile_v2/find_profile_for_family_link_v2 ausentes. Migration local de hardening não aplicada; nenhuma escrita executada.
- [x] **[AUDIT-LIVE-ROUTE-SMOKE-1018]** Brave autenticado: 12/12 rotas principais renderizaram; Dashboard confirmou divergência de saídas (R$ 11,00 publicados vs. R$ 3.937,38 esperados em base de caixa). Família: Fran é membro ativo, Jhonatan é contato de despesas; painel familiar ausente no Dashboard ao vivo. Isso é smoke visual, não aceitação CRUD.
- [x] **[AUDIT-FAMILY-DASHBOARD-LOCAL-FIX-1018]** Produção (build de 09/10) usa saldo RPC limitado ao mês; local (build de 18/10) soma pendências de todos os meses. Revisão detectou risco local de ignorar sharing_scope. Corrigido com helper puro para all/trips_only/date_range/specific_trip, usado por getFilteredInvoice e pelo dashboard via getScopedInvoices. Revisor independente sem blockers; testes focados 10/10, suíte 336/19, typecheck, ESLint, Prettier, build Vite e git diff --check passaram. Fix local não publicado; nenhum dado financeiro foi alterado.
- [x] **[AUDIT-BCB-EDGE-FALLBACK-1018]** CDI/IPCA falharam com Failed to fetch na produção. Implementada rota via Edge Function existente com validação e fallback visível; Edge agora limita CORS, aplica timeout e valida taxa. Testes Vitest 331 aprovados/19 ignorados, Deno 9/9, typecheck/build/secret scan e revisão independente passaram. Ainda não publicado, então produção segue com falha.
- [ ] **[AUDIT-FAMILY-DASHBOARD-RELEASE-1018]** Depois da reconciliação e release autorizada, validar o painel na versão publicada para todos os meses/moedas e scopes; produção continua no build de 09/10.
- [x] **[AUDIT-PRODUCTION-RELEASE-AND-ACCEPTANCE]** Deploy compatível publicado e aceite autenticado parcial feito em `/familia`, convite sem envio, `/compartilhados` e Dividir; Realtime corrigido e aba nova sem erro de console. Falta aceite live dos demais CRUDs e fluxos de alto impacto, listados em `HANDOFF.md`.
- [x] **[AUDIT-E2E-ASSERTIONS-1018]** Removidos falsos positivos condicionais nos fluxos de cadastro, contas, transações e relatórios; Chromium/Firefox/WebKit/Mobile Chrome/Mobile Safari passaram 85/85.
- [x] **[AUDIT-TRANSACTION-CREATE-LOCK-1018]** Reproduzido race em que um envio rejeitado liberava o lock de outra criação ainda pendente; lock adquirido em `onMutate` e liberado somente pelo contexto proprietário. Regressão confirma duas chamadas concorrentes recusadas, nenhuma inserção duplicada e novo envio aceito após conclusão. Suíte completa: 324 passaram/19 ignorados; typecheck, ESLint, Prettier, `git diff --check` e build de produção passaram.
- [ ] **[AUDIT-COVERAGE-GAPS-1018]** Cobertura atual após V8: 39,30% statements, 34,15% branches, 37,85% funções, 41,33% linhas. `TransactionForm` 20,75% linhas e `Transactions.tsx` 5,37%; ampliar testes dos fluxos financeiros prioritários e das gravações de alto impacto.
- [x] **[AUDIT-MIGRATION-DEPLOY-DECISION-1018]** Decisão anterior de não aplicar em lote foi reavaliada após reconciliação semântica e autorização do usuário. Trinta pares de timestamps equivalentes foram reparados no histórico; 13 migrations pendentes foram aplicadas, uma migration de diário foi registrada após confirmar que seu esquema já existia. `db push --dry-run` confirmou banco atualizado.
- [x] **[AUDIT-MIGRATION-DRIFT-MAP-1018]** Fetch e `db pull --declarative` feitos em diretório temporário sem atualizar histórico remoto. Dos 259 timestamps coincidentes, 51 SQLs são idênticos byte a byte; normalizando CRLF/espaços externos, 75 são iguais e 155 divergem (29 cópias remotas têm 2 bytes). Os 30 remote-only correspondem em descrição a 30 local-only, mas timestamp e SQL diferem; 13 local-only não têm contraparte remota por nome. Registrar exatamente quais mudanças refletem o esquema ao vivo antes de qualquer `repair` ou push.
- [x] **[AUDIT-MAINTAIN-GRANTS-1018]** Exportação real do esquema/Postgres 17 revelou que `anon` e `authenticated` também têm `MAINTAIN` em tabelas públicas e nos defaults. A migration de grants foi ampliada para revogar `MAINTAIN`, `TRUNCATE`, `TRIGGER` e `REFERENCES` em relações atuais e futuras; teste de segurança cobre o conjunto inteiro. Preflight remoto em transação aprovou; após rollback, 55 relações públicas seguem com ao menos um desses grants e defaults permanecem expostos.
- [x] **[AUDIT-DB-HARNESSES-LIVE-1018]** DSN do `.env.local` carregada somente em variável temporária do processo, sem exibir segredo; ambos os harnesses Node foram executados ao vivo.
- [x] **[AUDIT-DB-CANDIDATE-PREFLIGHT-1018]** Repetido smoke no Supabase com quatro migrations candidatas em transação revertida: 29 verificações passaram; cálculos do Dashboard e saldos bateram; câmbio em ambos sentidos validou campos completos; rotina privada corrigiu divergência sintética; job e permissões da rotina passaram; nenhum dado `[TEST]` ficou fora do rollback.
- [x] **[AUDIT-DB-SECURITY-CANDIDATE-1018]** Seis migrations candidatas aplicadas dentro de transação externa e revertidas: 20 contratos de RPC/ACL/RLS passaram; owner update bloqueado com `42501`; restore cross-user com fixture soft-deleted e restore ativo foram bloqueados nos códigos esperados. Consulta independente confirmou rollback; migrations não foram publicadas.
- [x] **[AUDIT-PROFILE-INSERT-RLS-BEHAVIOR-1018]** Após revisão independente, harness testa insert próprio (RLS permite chegar ao conflito de ID e gravação fica revertida) e insert com ID de outro usuário (`42501`); falha se fixtures de dois usuários estiverem ausentes. Reexecução do preflight candidate passou.
- [x] **[AUDIT-FAMILY-EMAIL-INVITE-1018]** Convites não enumeram `profiles`: gravam e-mail normalizado com `to_user_id = null`, e recipients leem/aceitam via fluxo por e-mail. Revisão final também removeu busca por e-mail/nome no cadastro de contato, que passa a ser externo até vínculo explícito. Migration `20261018200350_family_email_invites_without_profile_enumeration.sql` passou preflight e fluxo transacional com rollback. E2E família/contato: 15/15 nos cinco projetos; nenhuma consulta a perfis por e-mail/nome.
- [x] **[AUDIT-DB-SMOKE-FIXTURES-1018]** Smoke completo no Supabase passou 29 checks com quatro migrations candidatas em rollback, sem fixtures persistentes. Transferências de câmbio passaram em duas direções. Corrigido o harness para usar nomes únicos, evitando colisão com dados de teste anteriores.
- [x] **[AUDIT-PARTIAL-INVOICE-BEHAVIOR-1018]** Pagamento parcial da fatura verificado no banco conectado com fixture isolada: total R$ 100, rejeição de total desatualizado, 3 linhas esperadas, retry idempotente sem duplicata, conta de origem R$ 460 e cartão −R$ 60; `testDataRestored:true`. Fixture corrigida para respeitar o fechamento do cartão e entrar na competência do teste.
- [x] **[AUDIT-LOCAL-GATES-1018]** Suíte unitária 324 passou/19 ignorados; E2E Chromium 17/17 antes da regressão e família 2/2 depois; typecheck, lint focal, build e `git diff --check` passaram.
- [ ] **[AUDIT-DB-SECURITY-RELEASE-1018]** Migrations de perfil, RLS de transações/restauração, probe de membership, grants públicos e ACLs padrão constam no histórico remoto. A validação atual confirma email/PIN privados, zero privilégios perigosos efetivos para anon/authenticated e banco sincronizado. Ainda falta rerodar a bateria completa dos 39 casos históricos e fechar a RPC atômica de backup/restauração; não declarar todo o hardening concluído.
- [x] **[AUDIT-FAMILY-PROFILE-ENUMERATION-1018]** Busca de conta removida do fluxo de convite e contato; RPC revogada para clientes no candidato de migration. Preflight e E2E comprovaram convite sem ID, aceite pelo e-mail e ausência de sinal visual de conta existente. Ainda requer publicação e validação com sessão real.
- [x] **[AUDIT-PARTIAL-INVOICE-TEST-GAP-1018]** Fixture passou a definir fechamento do cartão compatível com o período; `pay_credit_card_invoice_atomic` foi testada funcionalmente dentro do smoke em rollback, inclusive total desatualizado, idempotência e saldos. Nenhuma escrita persistiu.
- [x] **[AUDIT-LIVE-UI-ROUTES-1018]** Na sessão autenticada já aberta, conferi Dashboard, Transações, Contas, Cartões, Relatórios, Orçamentos e Viagens. As telas carregaram sem criar/editar registros. Alterei o mês selecionado temporariamente para validar a troca de dados e restaurei dezembro; a atualização assíncrona do Dashboard concluiu corretamente.
- [x] **[AUDIT-DB-SMOKE-FAILURES-1018]** As divergências de saldo, Dashboard caixa, câmbio e job foram reproduzidas e corrigidas em migrations candidatas. Smoke atual com as quatro migrations passou 29 checks e restauração de dados foi confirmada. Produção continua sem as correções até release.
- [ ] **[AUDIT-DB-SECURITY-LIVE-1018]** O baseline histórico reportou 39 achados; após hardening live, `test:db-security` passou (19 RPCs v2, ownership protegido, rollback garantido), `test:db-smoke` passou 29/29 com dados restaurados, email/PIN ficaram privados e privilégios perigosos efetivos chegaram a zero. Esses gates não repetem necessariamente os 39 cenários originais; falta reconstruir e rodar a matriz completa, inclusive restore/escopo compartilhado.
- [x] **[AUDIT-FORMFIELD-LABEL-1018]** E2E reproduziu label de cadastro não associada ao input por ID duplicado no wrapper; correção em `FormField`, regressão adicionada e 5 contratos de acessibilidade passaram.
- [x] **[AUDIT-DB-SMOKE-STRICT-1018]** Smoke Supabase vinculado com contexto autenticado, avisos `[FAIL]` elevados a exceção e rollback: todos os asserts SQL passaram; contagens `[TEST]` ativas voltaram a zero.
- [x] **[AUDIT-PROFILE-ACL-PREFLIGHT-1018]** Produção confirma leitura de `profiles` por `anon` e de `email`/`app_pin_hash` por `authenticated`; migration local passou preflight de grants/colunas/RPC dentro de rollback.
- [x] **[AUDIT-PUBLIC-GRANTS-PREFLIGHT-1018]** Entre 56 relations públicos, 54 tabelas concedem `TRUNCATE` a `authenticated`; 47 liberam SELECT e 37 INSERT a `anon`, todas com RLS. Migration de revogação de privilégios não filtrados passou preflight para contas/transações, triggers e references dentro de rollback.
- [x] **[AUDIT-PROFILE-ACL-PRODUCTION]** Migration `20261016154008` aplicada; consulta live confirmou `anon` e `authenticated` sem SELECT em `email`/`app_pin_hash`, e `authenticated` mantém UPDATE em `full_name`.
- [x] **[AUDIT-PUBLIC-GRANTS-PRODUCTION]** Migration `20261018151952` aplicada e defaults futuros para anon endurecidos por `20261019233500`; consulta live confirmou zero privilégios efetivos `TRUNCATE`, `TRIGGER`, `REFERENCES` e `MAINTAIN` para anon/authenticated e dry-run sem pendências.

- [x] **[AUDIT-PROFILE-ALL-ACL]** Produção concede a `anon` e `authenticated` privilégios de tabela em `profiles`, inclusive `TRUNCATE`, `DELETE` e `TRIGGER`, além de leitura/escrita de todas as colunas. Migration preparada revoga tudo e reabre somente SELECT/INSERT/UPDATE necessários por coluna; `app_pin_hash`, email e ID não podem ser lidos ou alterados diretamente.
- [x] **[AUDIT-PROFILE-FALLBACK-FIX]** Migration local adiciona INSERT apenas para `id`, `email`, `full_name`, com RLS em `auth.uid()`; harness verifica grants mínimos e política própria.
- [x] **[AUDIT-PROFILE-MIGRATION-PREFLIGHT]** Migration e assertions executadas em produção dentro de `BEGIN`/`ROLLBACK`: grants permitidos passaram; SELECT privado e privilégios `DELETE`/`TRUNCATE`/`TRIGGER` foram negados no estado transacional. Query posterior confirmou rollback e estado inseguro original restaurado. Não aplicada permanentemente.
- [x] **[AUDIT-RESTORE-IDOR]** Advisor e leitura da função publicada revelaram que `restore_transaction` restaurava splits/espelhos sem validar o dono. Migration `20261018150622_prevent_cross_user_transaction_restore.sql` valida dono, exige pai excluído, limita updates a filhos apagados e bloqueia concorrência com `FOR UPDATE`; preflight remoto negou acesso cruzado (`42501`) e transação ativa (`55000`), com rollback verificado.
- [x] **[AUDIT-RESTORE-REGRESSION]** Harness de segurança tenta restaurar transação alheia e transação ainda ativa em transações revertidas; sintaxe Node e ESLint passaram.
- [x] **[AUDIT-FAMILY-MEMBERSHIP-IDOR]** Reprodução remota como `authenticated` confirmou que `is_family_member_v2(family_id, user_id)` retornava `true` para o vínculo de outro usuário. Migration `20261018150906_restrict_family_member_probe.sql` limita a consulta ao próprio `auth.uid()`; preflight com rollback passou e query posterior confirmou que a correção não ficou aplicada.
- [x] **[AUDIT-FAMILY-MEMBERSHIP-REGRESSION]** Harness testa tentativa de enumerar vínculo familiar de outro usuário sob role `authenticated`; inclui a RPC no contrato de grants.
- [x] **[AUDIT-FAMILY-LIVE-RECHECK-1018]** Site publicado em agosto mostra Fran R$ 1.578,79 (31 itens) e Jhonatan R$ 910,38 (Airbnb 2/5). Banco read-only: Jhonatan 2/5 segue sem confirmação nem transação vinculada; 5/5 novembro também aberto. Fran all-time: R$ 1.556,29 líquidos (R$ 1.591,29 a receber menos R$ 35,00 a pagar), diferente do valor antigo R$ 1.575,54. Sete `ZZ_TESTE` autorizados excluídos pelo app: 0 ativos, 14 no histórico com `deleted_at`. Build publicado 09/10 vs. local 18/10.
- [ ] **[AUDIT-FORMAT-GLOBAL-DRIFT]** `npm run format:check` falha em 130 arquivos. Os quatro arquivos do cartão/cálculo familiar passam após formatar o teste focado; não foram formatados arquivos fora do escopo.
- [ ] **[AUDIT-DASHBOARD-CASH-BASIS-PAYMENT]** Out/2026: compras no cartão (R$ 117,32) são excluídas por design; porém a RPC também omite transferências de pagamento da fatura. Três pagamentos reais de conta corrente para cartão em 09/10 somam R$ 3.926,38 (competências jul/ago/set). Resumo publicado R$ 11,00; cash-basis esperado R$ 3.937,38. Migration local `20261018160328_fix_dashboard_cash_basis_credit_card_payments.sql` agora conta só transferências de conta não-cartão para cartão pela data efetiva; assertion cash-basis adicionada ao DB smoke. Preflight com R$ 1 sintético passou (R$ 3.938,38); rollback confirmado, zero fixture persistente. Pendente execução do smoke via DSN, reconciliação do histórico de migrations e deploy/QA autenticado.
- [x] **[AUDIT-ACCOUNT-OPENING-CURRENCY]** RPC ativa testada em produção com `BEGIN/ROLLBACK`: conta internacional USD com saldo inicial de 100 na moeda da conta cria saldo e linha de abertura em USD; combinação inválida `currency=USD` com `is_international=false` é normalizada para BRL no preflight da migration. Fluxo BRL também cria 1 linha de R$ 123,45. RPC legado `create_account_with_initial_deposit` reproduzido ao vivo e falha com `column "category" of relation "transactions" does not exist`; não é chamado pelo frontend atual. Migration local `20261018164511_repair_legacy_account_creation_rpc_and_remove_orphan_cleanup.sql` faz o legacy delegar à RPC atômica e remove `cleanup_old_pending_operations` (tabela inexistente, sem caller ou cron). Preflight dos três cenários passou, rollback confirmou zero contas de teste. Produção ainda mantém os RPCs com defeito até release.
- [x] **[AUDIT-CROSS-CURRENCY-TRANSFER]** Fluxo ativo reproduzido ao vivo com contas temporárias BRL/USD dentro de rollback: RPC publicada gravava duas linhas `EXPENSE`/`INCOME`, sem `exchange_rate` ou campos de moeda de destino, embora o parâmetro existisse. Migration local `20261018165341_fix_cross_currency_account_transfers.sql` grava um `TRANSFER` completo e valida taxa, direção, saldo e valor convertido. Preflight com cartão/cálculo de saldo corrigidos passou nas duas direções (R$ 100 → US$ 80 a 1,25 e US$ 40 → R$ 50), saldos finais R$ 950/US$ 40, taxa persistida, rejeição de valor incompatível e 0 linhas de renda/despesa. Rollback deixou 0 transações/contas sintéticas; produção ainda tem comportamento antigo até release. Smoke automatizado atualizado para cobrir o fluxo quando houver DSN.
- [ ] **[AUDIT-LIVE-DB-LINT-REMAINDER]** `npx supabase db lint --linked --schema public` encontrou erros em RPCs com referências a tabelas/colunas removidas, além de warnings. Corrigidos localmente no preflight o RPC legacy de abertura e o cleanup órfão; o RPC ativo `transfer_between_accounts` também tinha parâmetro de câmbio ignorado e foi corrigido localmente. O erro em `soft_delete_transaction` é falso positivo confirmado: a função cria `_sdt_targets` em runtime e o teste live sob `authenticated` soft-deletou 1 linha sintética dentro de rollback. Pendente classificar erros restantes (`confirm/reject_settlement`, antigas funções `financial_ledger`, reset admin/trips) entre legado sem caller, Edge Function e fluxo ainda ativo.
- [ ] **[AUDIT-OLD-TEST-ACCOUNTS]** Consulta live encontrou 3 contas ativas com nome `ZZ_TESTE`, criadas em 03/10, saldo zero, sem transações ativas e com 11 transações soft-deleted no total. Não foram criadas nesta sessão e nenhuma conta foi alterada; confirmar a intenção antes de arquivar/excluir essas contas de teste antigas.
- [x] **[AUDIT-ADMIN-RESET-FLOWS]** Decisão do usuário: não usa o painel admin e quer mantê-lo desativado. A migration `20261025133000_disable_legacy_admin_reset_rpcs.sql` revogou EXECUTE para todos os papéis de API; `20261025143000_drop_broken_legacy_rpc_signatures.sql` removeu depois as duas definições obsoletas. Preflight e pós-checagem live confirmaram ausência sem mutação de dados.
- [x] **[AUDIT-CARD-PARTIAL-PAYMENT-ATOMICITY]** Defeito reproduzido em produção em `BEGIN/ROLLBACK`: saldo do cartão caía em dobro no self-transfer, carryover ficava na competência errada, e a RPC limitava a fatura a 200 linhas. Migration local `20261018162737_fix_atomic_credit_card_partial_payment.sql` substitui as chamadas separadas por uma RPC transacional/idempotente; preflight comportamental passou, incluindo retry sem duplicata, falha injetada no terceiro insert com rollback integral e zero fixture persistente. 7 testes focados, suíte completa (321 aprovados/19 ignorados), typecheck, ESLint focal, Prettier e build passaram. Migration e frontend ainda não publicados; em produção o defeito persiste até release.
- [x] **[AUDIT-SHARED-INVOICE-DELETED-SPLIT]** Preflight remoto marcou um split soft-deleted dentro de transação e chamou `get_shared_invoice_data_v2` como dono; o split não apareceu no JSON. `ROLLBACK` e query posterior confirmaram zero splits soft-deleted persistentes. Caso incluído no harness.
- [x] **[AUDIT-SUPABASE-ADVISORS]** Advisors remotos: 54 funções SECURITY DEFINER acessíveis a authenticated, 3 alertas de policies permissivas sobrepostas e proteção contra senha vazada desativada. Varredura de guardas localizou `is_family_member_v2` como única função sem referência direta a auth/admin e confirmou o IDOR corrigido localmente. As 3 policies foram verificadas como leitura de membros + escrita de editores; revisão semântica dos 53 RPCs restantes pendente.
- [x] **[AUDIT-MIGRATION-DRIFT]** CLI remoto recontado em 18/10: 259 correspondentes, 43 só locais e 30 só remotas; as 30 remotas têm contraparte local de mesmo nome mas timestamps diferentes. As duas migrations remotas sem arquivo local foram recuperadas do histórico no checkout. As migrations locais incluem fixes ainda não publicados; não aplicar o lote local indiscriminadamente.
- [x] **[AUDIT-LIVE-AUTH-ROUTE]** Site publicado `/auth` abriu com título e campos de login esperados, sem warning/error no console; navegação autenticada não testada e nenhum dado de conta foi enviado.
- [x] **[AUDIT-FAMILY-PANEL-FOCUSED]** Reexecutados os testes de `FamilyBalancePanel`, cálculos compartilhados e perfil: 3 arquivos, 7 testes passaram. Isso cobre mocks e cálculo local, não reconciliação do saldo real.
- [x] **[AUDIT-LOCAL-DB-UNAVAILABLE]** Docker/Postgres local indisponível; `supabase migration list --local` não conectou a `127.0.0.1:54322`. A migration de perfil foi validada em transação remota com rollback.
- [ ] **[AUDIT-AIRBNB-2-5-RECEIPT]** Usuário confirmou que Airbnb 2/5 (R$ 910,38) foi recebida, mas não informou data/conta. Produção segue sem settlement nem transação vinculada; foram encontradas duas entradas de R$ 910,38 em outubro, e não é seguro atribuí-las à parcela sem conferir para não duplicar. O diálogo de acerto exige data e conta; nenhum dado financeiro foi alterado. Pedir se foi uma dessas entradas ou a data/conta correta.
- [x] **[AUDIT-FAMILY-BALANCE-LIFETIME]** Reconstrução read-only com as regras atuais do gerador: Fran tem créditos de R$ 1.591,29 e débitos de R$ 35,00 (líquido R$ 1.556,29); Jhonatan tem Airbnb 2/5 e 5/5 em aberto no banco, R$ 1.820,76. Pela confirmação do usuário de que 2/5 foi recebida, o saldo esperado é R$ 910,38, mas a RPC padrão cria uma nova entrada e exige conta, então não executei acerto duplicável sem data/conta. Valores exibidos antes (Fran R$ 1.575,54/Jhonatan R$ 2.731,14) não foram reproduzidos na consulta atual. Corrigido localmente o tratamento de estornos para reduzir o líquido em ambos os lados; testes focados cobrem credor/devedor. Ainda não publicado.
- [x] **[AUDIT-PUBLIC-ACL-DEFAULTS]** Migration local remove `TRUNCATE`/`TRIGGER`/`REFERENCES` de tabelas públicas e dos defaults de `postgres`; preflight transacional passou para tabelas existentes, mas defaults de `supabase_admin` continuam amplos e não podem ser alterados pelo papel atual.
- [x] **[AUDIT-BALANCE-RECALC-CRON]** Produção: job ativo falhou 106/106 vezes (05/07–18/10) chamando overload removido `recalculate_all_balances()`; rechecagem live em 18/10 confirmou a última falha às 04:00 UTC e a RPC sem argumentos continua ausente. RPC de usuário também delegava a cálculo que soma transações futuras e ignora `initial_balance`; migration local agora reutiliza `get_account_balance_at_date`, repara o job com worker privado e evita recálculos sem drift. Preflight autenticado + worker executado em transação e revertido passou; 13/13 saldos continuam batendo com a regra de hoje. Não publicado.
- [x] **[AUDIT-RECALC-TOAST]** RPC retorna `void`, mas hooks exibiam contagem `undefined`/`0`; feedback de recálculo agora confirma conclusão sem inventar contagem.
- [x] **[AUDIT-VERIFY-1018-CURRENT]** Suíte completa atualizada: 49 arquivos passaram, 2 ignorados; 321 testes passaram, 19 ignorados. Typecheck, ESLint focal, Prettier focal e build passaram.
- [ ] **[AUDIT-DB-SMOKE-RECALC]** O `test:db-smoke` atualizado inclui recálculo autenticado e conferência com transações futuras, mas não conectou: URL temporária do pooler não contém senha para o driver `pg`. Repetir com DSN com senha; a tentativa falhou antes de abrir conexão, sem mutação.
- [x] **[AUDIT-BALANCE-CRON-RELEASE]** O cron `daily-balance-reconciliation` está ativo (`0 4 * * *`) no Supabase; consulta live confirmou execução em `2026-10-24 04:00:00.235376+00`. A migration de reconciliação foi aplicada no histórico remoto junto aos fixes, sem alterar dados manualmente.

## Em andamento - 16/10/2026 - Auditoria ao vivo do site e banco

- [x] **[AUDIT-PRIVACY-COPY-SECURITY-CLAIM]** A página pública `/privacidade` publicada afirmava que a RLS garante que cada usuário só acessa os próprios dados; a auditoria do banco já havia reproduzido permissões amplas em `profiles` e transferência de proprietário de transação. A redação foi corrigida localmente para descrever HTTPS, permissões de conta e compartilhamentos por recurso, sem prometer isolamento total. A página publicada ainda contém o texto antigo até deploy.
- [x] **[AUDIT-LIVE-ROUTE-SMOKE]** Site publicado ao vivo: `/auth` renderiza login; `/privacidade` renderiza o conteúdo; `/reset-password` sem token retorna para `/auth` com mensagem de sessão expirada; as rotas protegidas visitadas sem sessão redirecionam para `/auth`. `/dashboard` retorna 404 mas não é rota declarada; o Dashboard usa `/`. Nenhum login, envio de recuperação ou lançamento foi executado.

- [x] **[AUDIT-CARD-PARTIAL-PAYMENT]** Defeito reproduzido em produção via transação revertida: pagamento parcial R$ 60/R$ 100 deixava o saldo do cartão em −R$ 120 em vez de −R$ 40, e carryover entrava na competência errada; RPC limitava a fatura a 200 linhas. Migration local substitui o fluxo por RPC atômica/idempotente e corrige competência, cálculo e conversão para moeda de destino. Preflight comportamental em produção passou em `BEGIN/ROLLBACK`, inclusive retry sem duplicata e falha forçada no último insert com zero linhas/saldos inalterados; pós-rollback confirmou zero fixtures e migration não persistida. 7 testes focados, typecheck, ESLint focal, Prettier e build passaram. Pendente revisar drift e publicar; produção permanece com o bug até release.

- [x] **[AUDIT-FAMILY-MONTH]** Na produção, o Dashboard em nov/26 mostra Jhonatan com R$ 910,38 e não mostra Fran; em out/26 o cartão fica oculto. O filtro mensal foi confirmado ao vivo.
- [x] **[AUDIT-FAMILY-DATA]** Rechecagem do RPC contra splits no banco: novembro mostra Jhonatan R$ 910,38 (5/5); no all-time 2/5 e 5/5 seguem abertos, R$ 1.820,76, embora o usuário tenha informado que só 5/5 não foi paga. Fran: R$ 1.556,29 líquidos; 30 créditos de julho (R$ 1.591,29) e dois débitos (R$ 35,00) seguem abertos. Junho e agosto/setembro estão marcados confirmados. Cálculo do RPC bate com as linhas-base; estados financeiros não alterados.
- [x] **[AUDIT-FAMILY-RECHECK]** Reaberto o Dashboard publicado e `/compartilhados?month=2026-08`: o Dashboard continua omitindo Fran; a tela de Compartilhados mostra Fran R$ 1.578,79 (31 itens) e Jhonatan R$ 910,38 (1 item). SQL read-only atual confirma R$ 1.591,29 em créditos abertos menos R$ 12,50 em débitos abertos de Fran em agosto. Os valores exatos R$ 1.575,54/R$ 2.731,14 não foram reproduzidos. Splits Airbnb atuais: 2/5 e 5/5 abertos; 1/5, 3/5 e 4/5 confirmados pelo credor; nenhum dado financeiro alterado.
- [x] **[AUDIT-FAMILY-CALC-REGRESSION]** Testes reais de `generateInvoices` adicionados para a passagem da competência de cartão julho → fatura agosto e estados de confirmação dos cinco splits Airbnb; 4 testes focados, ESLint e Prettier passaram.
- [x] **[AUDIT-WITHDRAWAL-REFRESH]** Saque passa a invalidar saldo de contas, extrato, transações e dashboard; teste de regressão adicionado.
- [x] **[AUDIT-PROFILE-PRIVACY-PREP]** Migration local preparada para restringir SELECT em `profiles` e trocar email/hash do PIN por RPCs mínimas; caminhos de Família, convites, cartões e viagens atualizados.
- [x] **[AUDIT-PIN-FAIL-CLOSED]** Carregamento/erro do perfil não expõe o conteúdo do app; o PIN exigido pelo perfil prevalece sobre valor local conflitante.
- [x] **[AUDIT-VERIFY-LOCAL]** Suíte completa passou (303 aprovados, 19 ignorados); após o último ajuste de PIN, 7 testes focados, typecheck, lint e build passaram; teste transacional da migration no banco remoto foi revertido.
- [x] **[AUDIT-FUTURE-TRANSACTION]** Reproduzido em produção: a parcela confirmada “Hotel - rodoviaria (7/12)” de 06/12/2026 aparecia na contagem mas sumia das duas abas. Correção local e teste de regressão passaram; validação visual pós-publicação pendente.
- [x] **[AUDIT-VERIFY-CURRENT]** Suíte completa atual: 305 passaram, 19 ignorados; typecheck, lint, build e scanner de segredos passaram. Contrato vivo de segurança falha porque email/hash do PIN ainda são legíveis; preflight da migration passou dentro de transação revertida.
- [x] **[AUDIT-TRANSACTION-OWNER]** Reprodução ao vivo confirmou que `authenticated` consegue transferir `transactions.user_id`; atualização bloqueada após migration corretiva em preflight, erro `42501`, e `ROLLBACK` confirmou produção inalterada. Teste regressivo adicionado ao script de segurança. Banco tem zero parcelas vinculadas ativas, então edição de parcela compartilhada segue sem fixture ao vivo.
- [x] **[AUDIT-TRANSACTION-OWNER-RECHECK]** O teste direto em produção agora confere linhas afetadas em vez de exigir exceção para um RLS que pudesse filtrar silenciosamente. Resultado: a role `authenticated` alterou 1 linha para transferir o `user_id`; `ROLLBACK` restaurou o proprietário original. As 8 falhas do contrato de segurança seguem presentes em produção.
- [x] **[AUDIT-SECURITY-MIGRATION-PREFLIGHT-RECHECK]** As duas migrations de privacidade e imutabilidade aplicaram em transação de preflight no schema remoto atual; probes confirmaram colunas privadas bloqueadas, grants corretos às RPCs e troca do proprietário negada com `42501`. O `ROLLBACK` foi confirmado por leitura posterior; nenhuma correção permaneceu aplicada.
- [x] **[AUDIT-DB-SMOKE-RECHECK]** `npm run test:db-smoke` executado novamente: 29 operações, zero falhas e zero skips; 16 pós-condições comportamentais passaram e as contagens de dados `[TEST]` foram idênticas antes/depois do rollback.
- [x] **[AUDIT-DB-HARNESS]** Harness DB agora executa as verificações independentes apesar das falhas iniciais, protege probes de escrita em `ROLLBACK` e confirma o dono original pós-rollback. Ao vivo: 8 falhas identificadas (perfil/RPCs ausentes e troca de dono); controles restantes da suíte passaram.
- [x] **[AUDIT-DB-SMOKE]** Novo comando `npm run test:db-smoke` executa a suíte de integração legada com claims JWT, testa Dashboard v2 e 16 pós-condições (inclusive saldos recalculados excluindo lançamentos futuros) e reverte a transação inteira. Produção: 29 operações sem erro, zero invariantes falhas e zero skips; contagens `[TEST]` iguais antes/depois.
- [x] **[AUDIT-OFX-PARSER]** Reproduzido que OFX SGML padrão aninhava tags e perdia transações. Parser corrigido para SGML/XML, rejeita valores/datas inválidas, preserva FITID longo como texto, ajusta duplicidade sem FITID e dentro do lote. 7 testes do parser + 3 de integração do modal passaram. Em produção, fixture sintética inválida foi rejeitada; SGML sintético válido também falhou com “Erro ao ler arquivo”. Nenhuma transação foi gravada; há zero registros `ZZ_AUDIT_OFX_PREVIEW` no banco. Corrigir/publicar e revalidar a prévia segue pendente.
- [x] **[AUDIT-LIVE-FAMILY-BALANCE]** Em produção: Dashboard jul/26 mostrava Fran R$ 1.556,29, mas `/compartilhados` no mesmo mês mostra R$ 22,50 a pagar; a diferença vem de competência vs. data da fatura de cartão. Ago/26 lista Fran R$ 1.578,79 e Jhonatan R$ 910,38; nov/26 lista só Jhonatan R$ 910,38. Banco confirma Fran R$ 1.556,29 líquido all-time e duas parcelas abertas do Jhonatan (2/5 e 5/5). Receita líquida de R$ 19,25 em 16/10 corresponde a settlement de R$ 25,00 da Fran menos R$ 5,75 de outro membro e explica a mudança de R$ 1.575,54 para R$ 1.556,29. Receitas de R$ 910,38 em 09/10 e 16/10 estão vinculadas a 4/5 e 3/5. Nenhum settlement foi alterado.
- [x] **[AUDIT-FAMILY-DISPLAY-MONTH]** Dashboard agora usa o mesmo `getFilteredInvoice/getTotals` da tela Compartilhados para alinhar competência e fatura; moedas são exibidas separadamente. Regressão verifica saldos de Fran/Jhonatan em ago/26. Publicação/validação de produção pendente.
- [x] **[AUDIT-SHARED-SPLIT-SOFTDELETE]** RPC vivo `get_shared_invoice_data` não filtrava `transaction_splits.deleted_at`; migration local adicionada e `generateInvoices` filtra splits apagados. Preflight remoto com transação e rollback passou; zero registros de teste permaneceram. No banco auditado não havia splits apagados de Fran/Jhonatan.
- [x] **[AUDIT-VERIFY-LATEST]** 49 arquivos/318 testes passaram (2 arquivos/19 testes ignorados); typecheck, lint, scanner de segredos, Prettier, `git diff --check` e build passaram. Build sem o aviso de CSS disparado pelo fixture OFX.
- [x] **[AUDIT-E2E-FIXTURE]** Fixture de autenticação E2E agora intercepta o REST do Supabase, evitando que o JWT fictício alcance produção; estado inicial vazio e onboarding dispensado de forma determinística. Testes E2E ainda são smoke de UI, sem mutação nem validação de dados carregados.
- [x] **[AUDIT-E2E-CROSSBROWSER]** 85/85 testes E2E passaram em Chromium, Firefox, WebKit, Mobile Chrome e Mobile Safari (17 por projeto; executados em duas rodadas por instalação inicial dos browsers). 17 testes cobrem rotas, interações selecionadas e acessibilidade.
- [x] **[AUDIT-LIVE-SMOKE-1018]** Smoke SQL no Supabase vinculado executou em transação revertida e apresentou 3 contas, 14 transações, 1 viagem, 1 orçamento e 1 meta `[TEST]` dentro da transação; consulta posterior confirmou zero registros `[TEST]` ativos. O CLI não expõe os `NOTICE` dos asserts internos; DSN ausente impediu rodar os harnesses Node completos de DB smoke/segurança.
- [x] **[AUDIT-TRANSACTIONS-A11Y]** Axe reproduziu botão “Filtros” sem nome acessível em Mobile Safari. Adicionados `aria-label` e `aria-expanded`; teste de acessibilidade Mobile Safari passou, além das rodadas cross-browser.
- [x] **[AUDIT-DB-SMOKE-1018]** Resultado histórico de 29 operações sem falhas substituído pela execução atual detalhada em `AUDIT-DB-SMOKE-FAILURES-1018`.
- [x] **[AUDIT-DB-SECURITY-1018]** Resultado histórico de 8 falhas substituído pela execução atual detalhada em `AUDIT-DB-SECURITY-LIVE-1018`.
- [x] **[AUDIT-VERIFY-1018]** Vitest: 49 arquivos passaram, 2 ignorados; 318 testes passaram, 19 ignorados. Typecheck, lint e build passaram após os ajustes E2E e de acessibilidade.
- [x] **[AUDIT-PROFILE-RELEASE]** Migration consta na lista remota e `db push --linked --dry-run` informa up-to-date. Consulta de catálogo em produção confirma email/PIN sem SELECT para authenticated, 5 colunas públicas legíveis e `get_my_profile_v2` executável. A migration posterior `20261018200350` revoga intencionalmente o RPC de busca de perfil para authenticated; essa revogação também foi confirmada e protege contra enumeração.
- [x] **[AUDIT-TRANSACTION-RLS-RELEASE]** Migration consta na lista remota e `db push --linked --dry-run` informa up-to-date. Catálogo live confirma o trigger `prevent_transaction_owner_change` e a regra `WITH CHECK` de propriedade/criador/editores. Continua pendente teste comportamental live da edição autorizada de uma transação vinculada com fixture apropriada; acompanhar em `AUDIT-FUNCTIONAL-COVERAGE`.
- [x] **[AUDIT-FAMILY-SETTLEMENT]** Encerrado por direcionamento do usuário: lançamentos citados eram dados de teste; ignorar reconciliação dos saldos Fran/Jhonatan e manter a auditoria focada nas funcionalidades. Nenhum ajuste financeiro foi feito com base nesses registros.
- [x] **[AUDIT-DB-HARNESSES]** Ambos os harnesses rodaram contra o PostgreSQL Supabase via URL não-pooling carregada temporariamente do `.env.local` e CA TLS validado. `test:db-security` passou (19 RPCs; troca de proprietário negada com `42501` e rollback); `test:db-smoke` passou 29 asserts, zero falhas/skips e `testDataRestored=true`. Fluxos live adicionais por módulo permanecem em `AUDIT-FUNCTIONAL-COVERAGE`.
- [x] **[AUDIT-TEST-CLEANUP]** Sete lançamentos antigos `ZZ_TESTE` removidos da lista ativa após autorização; pós-condição ao vivo: 0 ativos e 14 históricos soft-deleted. O saque temporário `ZZ_TESTE saque auditoria 09-10` também consta excluído. A exclusão do app é lógica; nenhuma linha foi apagada fisicamente.
- [ ] **[AUDIT-FUNCTIONAL-COVERAGE]** Concluir fluxos ao vivo ainda não validados: convite real, OFX, backup/restore e demais gravações de alto impacto.
- [x] **[AUDIT-PRODUCTION-TEST-ROWS]** Após autorização específica, os sete registros ativos de teste antigos (R$ 2,00–R$ 20,00) foram soft-deletados pelo RPC da aplicação e confirmados fora do papel sujeito a RLS.
- [ ] **[AUDIT-DASHBOARD-DEPLOY-MISMATCH]** Site publicado responde versão `1.0.0`, buildTimestamp `1791564459008` (09/10/2026 16:47:39 UTC); o build local com o cálculo consolidado de todos os meses é de 18/10/2026 (`1792339153547`). Testes locais: Vitest 318 passaram/19 ignorados, typecheck, lint focado e build passaram; falta publicação coordenada e validação autenticada no site ao vivo.
- [x] **[AUDIT-LIVE-ROUTE-LOAD]** Smoke de leitura pós-carregamento em `/familia` confirma Fran como membro e Jhonatan como contato; chamadas relacionadas retornaram HTTP 200. `/relatorios` carregou e mostrou valores de outubro; não tratar snapshots prematuros de loading como falha final.
- [x] **[AUDIT-SECURITY-PREFLIGHT-ROLLBACK]** Preflight das migrations de privacidade e imutabilidade passou dentro de uma transação e foi revertido; após rollback, leitura direta de email/hash continua permitida e trigger de imutabilidade continua ausente em produção.
- [ ] **[AUDIT-MIGRATION-HISTORY-DRIFT]** Estado atual `supabase migration list --linked`: 309/309 versões iguais, zero locais somente e zero remotas somente; `db push --linked --dry-run` informa up-to-date. Isso corrige a contagem histórica de 18/10, mas não compara o conteúdo de cada migration histórica com o estado aplicado. Resolver a possível divergência de SQL por catálogo/efeito continua pendente antes de chamar a auditoria de banco completa.

---

## Concluído - 28/07/2026 - Restauração visual e checklist pré-viagem

- [x] **[DESIGN-ROLLBACK]** Redesign global revertido e árvore conferida contra o backup anterior antes da publicação na `main`.
- [x] **[TRIP-DATE-TZ]** Datas PostgreSQL `date` tratadas como calendário local via `parseISO`, sem deslocamento UTC de `01/08` para `31/07`.
- [x] **[TRIP-DURATION]** Duração unificada como contagem inclusiva de partida e chegada; `01/08 → 29/08` agora resulta em 29 dias.
- [x] **[TRIP-DATE-SSOT]** `trips.start_date/end_date` do Supabase documentados como fonte única; dashboard, resumo, convites e IA usam o helper compartilhado.
- [x] **[TRIP-DATE-TEST]** Regressão reproduzida em `America/Sao_Paulo` antes do fix e protegida por testes de data e duração.
- [x] **[TRIP-CHECKLIST-DATA]** 83 itens do arquivo portátil inseridos na viagem `Liverpol`, distribuídos em nove categorias e atribuídos ao Wesley, sem duplicatas exatas.
- [x] **[TRIP-CHECKLIST-UX]** Checklist reorganizado em cartões responsivos com progresso total e por categoria, responsável visível e seletor de responsável no novo item.
- [x] **[TRIP-CHECKLIST-A11Y]** Checkboxes e exclusões receberam nomes acessíveis, progresso usa semântica `progressbar`, labels foram associados e animações respeitam redução de movimento.
- [x] **[TRIP-CHECKLIST-VERIFY]** TypeScript, ESLint, build PWA e `git diff --check` aprovados; leitura no Supabase confirmou 90 itens totais e 83 atribuídos ao Wesley.
- [ ] **[TRIP-CHECKLIST-QA-AUTH]** Validar visualmente a viagem `Liverpol` em 390 px e 1440 px após o deploy.

---

## Concluído - 26/07/2026 - Identidade visual do produto

- [x] **[BRAND-COLOR]** Roxo genérico substituído nos tokens globais `primary`, `accent` e `ring` por verde-petróleo alinhado ao ícone do Pé de Meia.
- [x] **[BRAND-CONTRAST]** Foregrounds adaptativos aplicados: branco no tema claro e verde quase preto no escuro; contrastes entre `5,47:1` e `10,14:1`.
- [x] **[BRAND-CONSISTENCY]** Componentes que forçavam `text-white` sobre a cor de marca migrados para `text-accent-foreground`/`text-primary-foreground`; manifesto interno de design atualizado.
- [x] **[BRAND-VERIFY]** Tailwind compilado isoladamente, ESLint sem erros nos arquivos alterados, `git diff --check` aprovado e 3 testes/snapshots do dashboard aprovados.
- [ ] **[BRAND-QA-AUTH]** Validar visualmente a nova paleta com sessão autenticada em 390 px e 1440 px.

---

## Concluído - 26/07/2026 - Planejador de viagens

- [x] **[TRIP-PLAN-UX]** Viagem reorganizada em quatro áreas: `Resumo`, `Planejar`, `Gastos` e `Preparar`; cards financeiros aparecem somente no Resumo e o seletor de mês foi removido do contexto de Viagens.
- [x] **[TRIP-PLAN-MAP]** Planejar ganhou dia ativo, mapa central, pins numerados por dia, alternância `Dia atual | Todos os dias`, seleção lista↔pin, rota diária e métricas de distância/duração com fallback aproximado/offline.
- [x] **[TRIP-PLAN-ORDER]** Drag-and-drop com `dnd-kit`, teclado, mover para cima/baixo/outro dia, feedback `aria-live`, atualização otimista e rollback em erro ou conflito colaborativo.
- [x] **[TRIP-PLAN-DB]** `reorder_trip_itinerary_v1` aplicada em produção com lock pai+filhos, snapshot completo, versão otimista, posições únicas/contíguas, RLS por status/papel e guards contra update estrutural direto.
- [x] **[TRIP-PLAN-CATEGORY]** Migration pendente de categorias aplicada; produção aceita os 11 tipos usados pela busca e pelos pins.
- [x] **[TRIP-PLAN-A11Y]** Alvos mínimos de 44 px, labels associados, combobox/listbox semânticos, nomes acessíveis, alternativa ao arrastar, skip link e redução de movimento no foco do mapa.
- [x] **[TRIP-PLAN-VERIFY]** 249 testes aprovados, TypeScript sem erros, lint sem erros, build PWA verde; prova transacional da RPC com rollback confirmou stale version e invariantes financeiros.
- [ ] **[TRIP-PLAN-QA-AUTH]** Fazer QA visual autenticado em desktop e celular com dados reais; a inspeção automatizada local confirmou boot/login sem erro, mas não possuía sessão para entrar na viagem.
- [x] **[TRIP-PLAN-P1]** Biblioteca persistente de `Ideias/Lugares` (`trip_places`) aplicada e integrada: salvar para decidir depois, listar e agendar no dia sem duplicar o lugar.
- [x] **[TRIP-RESERVATIONS]** Reservas persistentes para voo, hospedagem, transportes, restaurante, evento e atividade, com confirmação e período; gastos continuam em `transactions`.
- [x] **[TRIP-FORM]** Formulário unificado de criação/edição com título separado do destino, notas, capa HTTPS, moeda, orçamento opcional, participantes, validação e preservação da digitação.
- [x] **[TRIP-RLS-HARDEN]** Policies de viagens, membros, checklist, lugares e reservas restritas a `authenticated`, permissões por papel/status, vínculos compostos por `trip_id` e campos de identidade protegidos.
- [x] **[VERCEL-REACT-PEER]** PR Dependabot incompatível React 19/React DOM 18 fechado; majors coordenados de React ignorados no Dependabot; `npm install --dry-run` e build de produção aprovados.
- [x] **[TRIP-ACTIVITY-FORM]** `Adicionar parada` ganhou formulário próprio, responsivo e acessível, com data, horários, categorias, local, Maps, descrição, rodapé fixo e validação do intervalo.
- [x] **[TRIP-PLACE-DISCOVERY]** `Buscar lugares` foi separado do agendamento: descoberta por categoria/nome/endereço, resultado com endereço completo, pin confirmado, guardar como ideia ou encaminhar ao dia.
- [x] **[TRIP-PLACE-AUTOFILL]** Seleção de lugar preenche título quando vazio, endereço, coordenadas e URL canônica; link longo do Maps identifica nome/endereço sem sobrescrever título personalizado.

---

## Concluído - 16/07/2026 - Faxina de código morto (auditoria + limpeza)

- [x] **[CLEAN-SCRIPTS]** 25 scripts de debug de sessões passadas removidos de `scripts/` (81% da pasta) — nunca referenciados em `package.json`/CI.
- [x] **[CLEAN-TOAST-BUG]** Bug real corrigido: 8 telas (metas, orçamentos, ativos, câmbio de viagem, checklist/itinerário de viagem) chamavam `useToast()` do sistema antigo do shadcn, cujo `<Toaster/>` nunca foi montado em `App.tsx` desde a migração pro `sonner` — notificações de sucesso/erro nunca apareciam pro usuário. Todos os call-sites migrados pro `toast` do `sonner`; sistema antigo (`toast.tsx`, `toaster.tsx`, `use-toast.ts`) apagado.
- [x] **[CLEAN-EXPORTS]** Revisão manual, um por um, dos ~202 exports/tipos flagados como não usados (`knip`) — cada um cross-checado contra uso interno antes de apagar (vários eram falso-positivo: usados internamente no próprio arquivo, ex. `dateUtils.formatDateUTC`, `getBankLogo`→`BANK_LOGOS`). Achados reais de duplicação removidos: `supabaseHelpers.ts` (10 funções de um CRUD genérico nunca adotado), `errorHandling.ts` (10 funções de um error-handler nunca adotado), `notificationService.ts` (14 funções — o centro de notificações real usa `useNotifications.ts`, não este service), `queryConfig.ts` (6 configs de query nunca adotadas), `currencyFormatter.ts` (9 funções duplicadas — `getCurrencySymbol` real é a de `exchangeCalculations.ts`), 3 hooks de "adicionar/remover membro de viagem" duplicados (`useTrips.ts`/`useTripMembers.ts` vs. o fluxo real em `InviteMemberDialog.tsx`), 2 implementações duplicadas de "antecipar parcelas" (a de `useTransactionMutations.ts` morta, a real é `useAnticipateInstallments.ts`).
- [x] **[CLEAN-DEPS]** 3 dependências não usadas removidas do `package.json`: `@radix-ui/react-separator`, `@radix-ui/react-toast`, `sharp` (dev).
- [x] **[CLEAN-GIT]** `eslint-report.json`/`eslint-report-utf8.json` (8,1 MB commitados por engano) e `playwright-report/`/`test-results/` (já gitignorados mas ainda rastreados) removidos do git; padrão de lint-report adicionado ao `.gitignore`.
- [x] **[CLEAN-DOCS]** `CLAUDE_HANDOFF.md` (handoff paralelo parado em 02/07) e os 6 relatórios de auditoria pontual de 30/06 arquivados em `docs/archive/` — raiz do repo com só os 3 documentos vivos (`HANDOFF.md`, `MASTER_BLUEPRINT.md`, `CHECKLIST.md`).
- [x] **Resultado:** ~350 arquivos / ~81.500 linhas em `src/`+`scripts/` (era 390 arquivos / ~89.500 linhas) — redução de ~7.950 linhas de código morto confirmado, zero mudança de comportamento fora do fix do toast.
- [x] Verificação completa: `tsc --noEmit` (0 erros), `npm run lint` (0 erros), `format:check` (verde), `npm test -- --run` (239/239, igual ao baseline), `npm run build` + service worker PWA (verde), `test:secrets` (verde).

---

## Concluido - 16/07/2026 - Roteiro de viagem linkado com o mapa

- [x] **[TRIP-MAP-LINK]** Link do Google Maps colado agora extrai lat/lon automaticamente (`parseGoogleMapsUrl`), sem depender de geocodificação externa.
- [x] **[TRIP-MAP-CACHE]** `trips.latitude`/`longitude` (coluna nova) cacheiam a coordenada base da viagem — elimina re-geocodificação de `trip.destination` a cada carga.
- [x] **[TRIP-MAP-CATEGORY]** `trip_itinerary.category` (coluna nova) + chips de categoria no formulário filtram a busca de lugares e coloram o pin por tipo.
- [x] **[TRIP-MAP-SYNC]** Lista de atividades numerada igual aos pins do mapa; clicar num item foca/centraliza o pin correspondente.
- [ ] **[TRIP-MAP-QA]** QA visual manual pendente — não verificado em navegador real nesta sessão (sem credencial de login). Testar: pin aparece ao colar link do Maps, chips de categoria filtram busca, numeração lista↔mapa bate, clique foca o pin certo.

---

## 🔴 CRÍTICO — Achado nesta auditoria (15/07/2026)

- [x] **[CI-FORMAT]** `npm run format:check` falhava (3 arquivos da feature de mapa de viagens `3cb451ba` nunca passaram pelo Prettier: `TripItinerary.tsx`, `TripRouteMap.tsx`, `overpassService.ts`). Confirmado como causa raiz do job "Lint & Type Check" falhando 100% desde 12/07. **Corrigido nesta sessão** (`prettier --write`); `tsc`/`lint`/`format:check` verdes localmente. **Pendente:** commit + push (aguardando autorização).
- [ ] **[CI-ROOT-CAUSE]** Causa raiz **confirmada** (16/07, texto literal do GitHub na página do run #150): **"The job was not started because your account is locked due to a billing issue."** — bloqueio de nível de conta pessoal do GitHub. Investigado e descartado: Actions permissions já em "Allow all actions" (não é config do repo); página de billing (`github.com/settings/billing`) não mostra cobrança recusada, cartão pendente ou banner de aviso — uso é $0,07 totalmente coberto pelo free tier, sem nada devendo. Ou seja, é um **flag interno do GitHub sem causa self-service visível**. **Ação exclusiva do usuário:** abrir chamado em `support.github.com` citando o erro exato e o link do run `.../actions/runs/29462019436`; não há nada configurável na UI que resolva isso. Explica os runs #120–#149 (12/07–16/07) e por que os fixes de código (Prettier, RPCs v2, etc.) nunca vão aparecer verdes em CI enquanto isso não for resolvido pelo suporte.
- [ ] **[CI-SECRETS]** Depois que o billing for resolvido e os jobs voltarem a rodar de verdade, ainda falta confirmar se os secrets `SUPABASE_DB_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` estão configurados em Settings → Secrets and variables → Actions — sem eles, `database-security` (faz `exit 1` explícito) e `e2e` falham por design, não por bug.
- [ ] **[LGPD-VERIFY]** `delete_user_account` **confirmado presente e com grants corretos em produção** (migration `20260713213214` aplicada, função `SECURITY DEFINER`, `search_path=''`, `authenticated`+`service_role`). O que falta é só a prova transacional final contra um usuário real (`scripts/verify-delete-user-account.sql`, BEGIN/ROLLBACK) — **não executada nesta sessão**: a query que eu montei para escolher um usuário de teste foi bloqueada pelo classificador de permissão automática por juntar `auth.users` com dados financeiros sem essa consulta ter sido nomeada explicitamente em escopo. Se quiser essa prova, autorize a consulta especificamente ou rode o script você mesmo via `psql`.

---

## Concluido - 13/07/2026 - API autenticada v2 e contrato de seguranca

- [x] **[API-V2]** 17 RPCs financeiras sem `p_user_id`, vinculadas a `auth.uid()`.
- [x] **[API-V2-FE]** Frontend migrado para v2; fallback compartilhado nao atomico removido.
- [x] **[RPC-GRANTS]** `EXECUTE` removido de `PUBLIC`/`anon`; grants futuros fechados por padrao.
- [x] **[RPC-LEGACY]** Assinaturas legadas e APIs quebradas retiradas de clientes autenticados.
- [x] **[DB-SEC-CI]** Teste vivo de 17 RPCs v2, 17 legadas e isolamento cross-user criado e aprovado.
- [x] **[PERF-ADV]** Policies duplicadas consolidadas sem alterar os atores permitidos; advisor zerado.
- [x] **[EXT-ADV]** `pg_trgm` movido de `public` para `extensions`.
- [x] **[ADMIN-RLS]** `admin_users` sem acesso direto e com policy de bloqueio explicita.
- [x] **[AUTH-MFA]** MFA TOTP habilitado e versionado; advisor de opcoes insuficientes zerado.
- [x] **[BASELINE]** Snapshot de cutover reproduzivel: 36 tabelas, 164 funcoes, 10 views e ACLs explicitas.
- [x] **[ERROR-LOG]** Schema reconciliado, senha historica removida e `updated_at`/RPCs corrigidos.
- [ ] **[AUTH-HIBP-PLAN]** Habilitar leaked-password protection ao migrar o Supabase para Pro; indisponivel no plano Free. Confirmado ainda pendente via advisor (`auth_leaked_password_protection`, 15/07).
- [x] **[IDEMPOTENCY-FIX]** `transactions.idempotency_key` corrigida de `uuid` para `text` (commit `3ae672ee`, migration `20260713212130`) — quebrava toda transacao compartilhada/parcelada com erro `42804`. Confirmado aplicado em producao via `list_migrations` (15/07).
- [x] **[RPC-V2-CALLSITES]** Dois call-sites do frontend ainda chamavam RPCs legadas revogadas (`get_current_shared_debts`, `get_trip_participant_balances`) e recebiam 403 silencioso — migrados para `_v2` em `FamilyBalancePanel.tsx` e `useTrips.ts` (commit `3ae672ee`). Confirmado: grep no codigo so encontra as versoes `_v2` chamadas hoje.
- [x] **[TYPECHECK]** Zerados os 124 erros globais (tsconfig.app.json) e removido `continue-on-error`: typecheck agora e bloqueante no CI.
- [x] **[LGPD-DELETE]** RPC `delete_user_account` reescrita para o schema atual e **aplicada em producao** (migration `20260713213214_reintroduce_delete_user_account_rpc`, confirmada ao vivo em 15/07 — funcao existe, `SECURITY DEFINER`, grants `authenticated`+`service_role`). Decisao adotada: expurgo fisico + SET NULL onde o usuario e so ator/criador de registro alheio. Ver `[LGPD-VERIFY]` acima para a prova transacional final pendente.

---

## ✅ CONCLUÍDO — Sessão 03/07/2026 (3 migrations)

### 🔴 Bugs de produção corrigidos

- [x] **[RPC-01]** PostgREST 404 resolvido por recarga/correcao do schema; `anon` nao precisa e nao deve receber `EXECUTE` para alimentar o cache.
- [x] **[RPC-02]** `create_installment_series` falhava com 42P01 — trigger órfã `trg_create_ledger_on_split` referenciava `financial_ledger` (dropada na Fase 1). Trigger + 3 funções órfãs removidas
- [x] **[SMOKE-01]** `create_account_with_balance` — TEXT→DATE incompatível com `search_path=''`
- [x] **[SMOKE-02]** `search_transactions` — return type `text` vs enum `transaction_type`
- [x] **[SMOKE-03]** `recalculate_all_balances` — coluna `deleted` inexistente (é `deleted_at`)
- [x] **[SMOKE-04]** `submit_error_report` — tabela `error_reports` inexistente (é `error_logs`)
- [x] **[SMOKE-05]** `set_pin` / `verify_pin` — `gen_salt()`/`crypt()` sem `extensions.` prefix
- [x] **[SMOKE-06]** `soft_delete_account` — transações deletadas após conta (trigger bloqueava)

### 🟢 Frontend

- [x] **[UI-01]** Trip split: SplitModal em vez de QuickSplit quando viagem selecionada
- [x] **[UI-02]** `tripFilteredMembers` filtra apenas participantes da viagem no SplitModal
- [x] **[DATA-01]** competence_date corrigida para transação "Cabelo" (jun, não jul)

### 🧪 Smoke test de integração (38 cenários)

- [x] Contas: criar, saldo inicial, soft delete, check dependencies, recalculate
- [x] Transações: criar, editar, soft delete (NONE/ALL), restore
- [x] Parcelas: create_installment_series (simples e compartilhada)
- [x] Compartilhadas: create_transaction_with_splits, família, splits
- [x] Transferências: transfer, withdraw
- [x] Cartão crédito: competence_date antes/depois closing day
- [x] Dashboard RPCs: 8 relatórios testados
- [x] Viagens, metas, PIN, error report, search
- [x] **Resultado: 38/38 PASS**

---

## ✅ CONCLUÍDO — Pós-merge 02/07/2026

- [x] **[MERGE-01]** Branch `claude/database-verification-checklist-en590c` mergeado na `main` e deployado — o fix de exclusão só existia no branch, e o deploy parte da main (por isso o erro 403 persistia pro usuário)
- [x] **[DEL-04]** RPC `soft_delete_transaction` tinha `DELETE FROM _sdt_targets;` sem WHERE — rejeitado pelo `pg-safeupdate` do Supabase (erro 400 "DELETE requires a WHERE clause" em runtime real). Corrigido com `TRUNCATE` (migration `20260702190451`). Testado ao vivo sob role authenticated: RPC retorna 1, transação soft-deletada.
- [x] **[OVERLOAD-02]** Versão antiga sobrecarregada `soft_delete_transaction(uuid)` (sem validação, retorno void) dropada — 1 nome, 1 conceito, sem risco de ambiguidade no PostgREST

---

## ✅ CONCLUÍDO — Sessão 02/07/2026 (5 migrations)

### 🔴 Bug de exclusão de transações — RESOLVIDO

- [x] **[DEL-01]** RPC `soft_delete_transaction` criada — validação server-side (permissão dono/criador/admin-editor, liquidação, acertos em splits, cascata NONE/NEXT/ALL, espelhos) e **erro explícito se 0 linhas** (antes: UPDATE com `.eq(user_id)` falhava em silêncio e a transação "voltava")
- [x] **[DEL-02]** 4 RPCs SECURITY DEFINER vazavam transações soft-deletadas (bypassavam RLS): `get_shared_invoice_data`, `get_monthly_financial_summary`, `get_shared_expense_summary_by_person`, `get_wealth_evolution` — filtro `deleted_at IS NULL` server-side
- [x] **[DEL-03]** Frontend `useDeleteTransaction` migrado para a RPC

### 🟠 Verificações e limpeza

- [x] **[BAL-06]** 3 contas revalidadas (Visa Platinium, Carrefour, Azul infinite): saldo armazenado = recalculado ✅ ("Nubank CC" não existe mais — eram contas de usuários diferentes, não duplicatas)
- [x] **[DUP-01]** 2 duplicatas reais soft-deletadas (Wise - Conta Global e Minha Carteira, ambas 0 transações/saldo 0)
- [x] **[PROF-01]** `profiles.app_pin` (plaintext) dropada; `set_pin`/`clear_pin` atualizadas
- [x] **[FUT-01]** 11 transações futuras auditadas: são parcelas legítimas (Hotel 12x, AirBNB 5x) — nada a corrigir
- [x] **[SEC-ADV]** Hardening por advisors: search_path fixado em todas as funções próprias, EXECUTE revogado de `anon`/`public` em todas as SECURITY DEFINER (28 expostas), triggers não-chamáveis via REST
- [x] **[TYP-02]** types.ts regenerado (soft_delete_transaction + app_pin removida)

### 📋 Advisors restantes (não-bloqueantes, decisão consciente de adiar)

- [x] **[PERF-ADV]** 5 conjuntos de policies consolidados em 13/07/2026; zero alerta `multiple_permissive_policies`.
- [x] **[AUTH-ADV]** MFA TOTP habilitado. HIBP exige plano Pro e permanece em `AUTH-HIBP-PLAN`.
- [x] **[EXT-ADV]** `pg_trgm` movido para `extensions` em 13/07/2026.

---

## ✅ CONCLUÍDO — Auditoria 01/07/2026 (7 migrations)

### 🔴 CRÍTICO — Corrigido

- [x] **[BAL-01]** `update_account_balance_on_insert()` recriada + trigger `trg_update_balance_insert`
- [x] **[BAL-02]** `update_account_balance_on_delete()` recriada + trigger `trg_update_balance_delete`
- [x] **[BAL-03]** Todos os saldos recalculados via `recalculate_account_balance()`
- [x] **[BAL-04]** `trigger_sync_account_balance` removido (double-counting com BAL-01)
- [x] **[BAL-05]** `financial_ledger` dropada com CASCADE

### 🟠 IMPORTANTE — Corrigido

- [x] **[CLEAN-01]** `calculate_account_balance()` no-param órfã dropada
- [x] **[CLEAN-02]** `is_family_member` → consolidado em `is_family_member_v2` (5 políticas RLS)
- [x] **[CLEAN-03]** `trigger_set_updated_at` → migrado para `update_updated_at_column`
- [x] **[CLEAN-04]** `reconciled_*` columns (3) dropadas + view transactions_ssot recriada
- [x] **[CLEAN-05]** `accounts.deleted` column dropada
- [x] **[CLEAN-06]** 6 funções órfãs dropadas (auditoria anterior)
- [x] **[CLEAN-07]** `cleanup_old_audit_logs()` dropada
- [x] **[CLEAN-08]** `handle_updated_at` dropada
- [x] **[IDX-01]** 4 índices novos + 4 órfãos do financial_ledger removidos + 1 duplicado
- [x] **[RLS-01]** `settlement_reversals` agora com RLS (SELECT, INSERT, ALL)
- [x] **[RLS-02]** 5 políticas RLS atualadas para `is_family_member_v2`
- [x] **[RLS-03]** 35 tabelas verificadas — todas com RLS ✅
- [x] **[TRIG-01]** `error_logs` trigger corrigido (`update_updated_at_column`)
- [x] **[TYP-01]** types.ts regenerado (x2, pós-drop de colunas)
- [x] **[CRON-01]** Cron jobs consolidados: 4 ativos, 1 redundante removido
- [x] **[OVERLOAD-01]** `get_admin_error_logs(text)` removido

---

## ✅ CONCLUÍDO — Fase 1 SSOT (2026-07-01, migration `20260702084014`)

- [x] **[SSOT-01]** Trigger `trg_update_balance_update` criado (AFTER UPDATE em `transactions`, com WHEN só nos campos que afetam saldo: amount/type/account_id/destination_account_id/deleted_at/date/payer_id). Chama `recalculate_account_balance()` para account_id e destination_account_id, antigo e novo. Editar transação agora recalcula saldo. Verificado ao vivo: trigger existe.
- [x] **[SSOT-02]** `financial_ledger` dropada de vez (tabela + trigger `trg_create_ledger_on_transaction` + função `create_ledger_entries_for_transaction`), na mesma transação de migration pra não quebrar insert de transação compartilhada no meio do caminho. Verificado ao vivo: tabela e trigger não existem mais.
- [x] **[SSOT-03 parcial]** Das 14 funções de "balance", só 3 eram realmente órfãs (sem trigger, sem RPC do frontend, sem cron job): `calculate_account_balance`, `recalculate_all_account_balances`, `sync_account_balance` — dropadas. Verificado ao vivo: as 3 não existem mais.
  - A classificacao original preservou `settle_partial_balance` apenas pelo conceito. A auditoria de 13/07/2026 confirmou que ela nao tem consumidor e aceita usuarios arbitrarios; acesso de `authenticated` foi revogado na migration `20260713100500_restrict_legacy_settlement_confirmation_rpcs.sql`.
  - `calculate_single_account_balance` foi confirmada como auxiliar interna de `recalculate_all_balances`; a execucao direta por `authenticated` foi revogada e o fluxo em lote foi preservado na migration `20260713102500_harden_account_dependency_rpcs.sql`.
  - Auditoria concluida em 13/07/2026: wrappers v2 protegem saldo de conta e viagem; APIs de balanceamento legadas/quebradas foram retiradas de `authenticated`; grants globais de `PUBLIC`/`anon` foram removidos.
  - Migration local criada em `supabase/migrations/20260702084014_fix_ssot_balance_update_trigger_and_ledger_cleanup.sql` (estava só no remoto, sem arquivo local)
  - ⚠️ Teste funcional end-to-end (criar/editar/deletar transação de teste e conferir saldo) ainda **não foi feito** — bloqueado pelo classificador de permissão do Claude Code no meio da sessão

## ✅ CONCLUÍDO — Verificação Fase 1 + achado extra (2026-07-01)

- [x] **[SSOT-04]** Teste funcional end-to-end: inseri transação de teste (R$0,01) em conta real, saldo mudou corretamente; deletei, saldo voltou certinho. Trigger de UPDATE/INSERT/DELETE confirmados funcionando em conjunto.
- [x] **[BAL-06]** Resolvido — comparação saldo armazenado vs soma real das transações rodada em TODAS as contas ativas: só "Nubank - Conta Corrente" estava divergente (armazenado -2.136,65 vs real -4.056,12, diferença de R$1.919,48 — travado desde antes da Fase 1 por causa do bug do SSOT-01). Corrigido como efeito colateral do teste funcional. Todas as outras contas batem.

## 🔴 CRÍTICO — Fazer Agora

## ✅ CONCLUÍDO — Fase 2 parcial (2026-07-01)

- [x] **[SEC-09]** `active_family_members` e `transactions_ssot` alteradas para `security_invoker=true` (migration `fix_security_definer_views_ssot_and_family`). Verificado: RLS de `transactions`/`family_members` já cobre compartilhamento familiar e de viagem — sem regressão de visibilidade.
- [x] **[SEC-10]** `admin_users` sem policy — verificado como intencional: `is_admin()` e `get_admin_users_detailed()` são `SECURITY DEFINER` de propriedade do `postgres` (dono da tabela, bypassa RLS); acesso direto via API continua corretamente bloqueado. Nenhuma mudança necessária.
- [x] **[SEC-13]** Token dos cron jobs rotacionado (gerado com `openssl rand -hex 32`), setado como `CRON_SECRET` nas Edge Functions via `supabase secrets set` (CLI), e gravado no Supabase Vault. `cron.job` de `send-bill-reminders-daily`/`send-monthly-report-monthly` agora busca do Vault em runtime — zero segredo em texto plano ou em migration versionada (aplicado via SQL direto, não `apply_migration`, de propósito).

## ✅ CONCLUÍDO — Fase 3a (2026-07-01)

- [x] **[PERF-05]** Índices criados para as 2 FKs sem cobertura: `admin_users.granted_by`, `settlement_reversals.payment_transaction_id`
- [x] **[PERF-04]** 5 índices/constraint duplicados removidos (confirmados idênticos antes): `family_members_type_idx`, `goal_milestones_goal_id_idx`, `idx_trip_exchange_trip_id`, `idx_trip_exchange_user_id`, constraint `trip_members_trip_id_user_id_key`
- [x] **[PERF-02]** 31 policies RLS reescritas de `auth.uid()` para `(select auth.uid())` (initplan) — gerado programaticamente a partir da lista exata do advisor, verificado zero duplicação de wrap. Advisor confirma: 0 `auth_rls_initplan` restante.

## ✅ CONCLUÍDO — Fase 3c (2026-07-01)

- [x] **[PERF-01]** 110 → 26 policies duplicadas resolvidas: 11 policies redundantes (duplicata exata ou subconjunto provado) removidas + `settlement_reversals` reestruturada (immutable policy dividida em UPDATE/DELETE só, sem sobrepor SELECT/INSERT). Verificado com RLS simulada (SET LOCAL request.jwt.claims): conta e transações continuam visíveis pro dono, settlement_reversals com exatamente 1 policy por comando.
  - 26 restantes são atores genuinamente diferentes (dono vs convidado, membro vs família) — **deixados de propósito**: `shared_credit_cards`, `transaction_splits` (usa função `check_split_access()` não auditada ainda), `transactions UPDATE`, `trip_invitations UPDATE`. Juntar errado vaza ou bloqueia acesso; ganho é só performance marginal.

## 🟢 Avaliado e descartado — não fazer

- **[PERF-03]** 71 índices "não usados": 24 são de PK/constraint única (nunca dropar, isso destrói integridade, não é otimização) + 47 são índices de performance com 0 scans. Numa app pessoal de baixo tráfego, 0 scans não prova "nunca necessário" (pode ser relatório mensal, cron raro). Custo de manter é desprezível; risco de dropar um índice que sustenta uma query rara é real. **Decisão: não mexer.** Revisitar só se algum dia houver telemetria de uso real de produção.

## ✅ RESOLVIDO — [BUG-01] Erro ao excluir transação (2026-07-02, por OUTRA sessão)

- [x] **[BUG-01]** Resolvido na sessão do branch `claude/database-verification-checklist-en590c` via RPC `soft_delete_transaction` (SECURITY DEFINER com validação server-side) + frontend migrado + 4 RPCs que vazavam soft-deletadas corrigidas. Verificado ao vivo por esta sessão: RPC existe em produção, sem conflito com as migrations desta sessão (policies com `deleted_at IS NULL` intactas).
  - Contexto desta sessão (histórico): as 2 policies de UPDATE foram revertidas pro `WITH CHECK` original antes do fix da outra sessão — estado consistente, a RPC bypassa RLS então a restrição `source_transaction_id IS NULL` não bloqueia mais exclusão.
  - Investigação via `session_replication_role` **cancelada** — obsoleta.
  - ⚠️ Nota: edição direta (`useUpdateTransaction`, `.update()` na linha ~126) ainda passa por RLS com `source_transaction_id IS NULL` — transações vinculadas (parcela/espelho) seguem não-editáveis diretamente. Aparenta ser design intencional (espelhos não devem ser editados); se algum dia "editar parcela" der erro de RLS, este é o lugar.

## ✅ CONCLUÍDO — Fase 5 (2026-07-01)

- [x] **[SEC-14]** `accounts_select_v2` e `transactions_unified_select` não filtravam `deleted_at IS NULL` — contas/transações soft-deletadas ficavam visíveis via RLS pro dono e pra família/viagem. Corrigido com `AND deleted_at IS NULL` nas duas policies. Confirmado que `is_archived` (contas arquivadas) é campo separado de `deleted_at` (lixeira) — arquivadas continuam 100% visíveis. Testado com transação de teste soft-deletada: sumiu da visão do dono; contas ativas: 12 visíveis via RLS (inclui família) vs 8 próprias, nada foi escondido indevidamente.

## ✅ CONCLUÍDO — Fase 4 (2026-07-01)

- [x] **[PROC-02]** 15 scripts soltos removidos da raiz do repo (`fix_budgets_progress_table.sql`, `run_in_supabase.sql`, `db_dump.sql` vazio, `audit_complete.py`, `audit_complete_clean.py`, `audit_schema.py`, `audit_v2.py`, `check_rpc.cjs`/`check_rpc2.cjs`/`check_rpc3.cjs`/`check_rpc4.cjs`, `check_schema.cjs`, `extract_export.py`, `refactor.py`, `update_duplicate.py`, `_tmp.cjs`). Confirmado antes: nenhum referenciado em `package.json`/CI, e as 2 mudanças de schema que os `.sql` continham já estão aplicadas em produção (`get_user_budgets_progress` foi substituída por versão mais nova, `b3_tickers_cache` e `transactions.asset_id` já existem). Recuperável via git se precisar.

---

## 🟠 ALTA PRIORIDADE — Esta Semana

- [x] **[BASELINE]** Baseline de cutover gerada sem Docker por introspeccao PostgreSQL e documentada em `supabase/baseline/`.
- [x] **[ERROR_LOG]** Migration historica reconciliada e correcao incremental aplicada em producao.

---

## 🟡 BACKLOG TÉCNICO

- [ ] **[ARC-05]** PDF export via Web Worker (frontend)
- [x] **[SEC-08]** Cache IndexedDB criptografado (AES-256-GCM via `encryptedStorage` no persister do TanStack Query em `PrivateAppShell`).
- [ ] **[FEAT-01]** Relatório mensal por email (Edge Function + Resend)
- [ ] **[CONC-01]** Teste de concorrência real (pgbench em staging)
- [x] **[AUD-07]** ~~financial_ledger dropado~~ ✅ DONE
- [x] **[AUD-08]** Auditoria 20 fases concluída → `AUDIT_REPORT_COMPLETE.md` ✅ DONE (2026-06-30)

---

## ✅ CONCLUÍDO

- [x] **[TASK-1.1]** Remover todos os `console.log` (apenas `logger.ts` permanece)
- [x] **[TASK-1.2]** Fixes de timezone com date-fns
- [x] **[TASK-1.3]** Validação de `payer_id`
- [x] **[FEAT-02]** Push notifications (VAPID + pg_cron)
- [x] **[FEAT-03]** Goal milestones + alertas 7 dias antes
- [x] **[FEAT-04]** SwipeableRow para mobile
- [x] **[FEAT-05]** Global search (Ctrl+K, cmdk)
- [x] **[FEAT-06]** `member_type` em `family_members` (família vs contatos)
- [x] **[FEAT-07]** Participantes guest em trips
- [x] **[FEAT-08]** Export PDF para metas
- [x] **[DOC-01]** Criar MASTER_BLUEPRINT.md
- [x] **[DOC-02]** Criar CHECKLIST.md
- [x] **[DOC-03]** Criar HANDOFF.md
- [x] **[AUD-01]** Auditoria técnica E2E completa (Passos 1-5)

---

## 🐛 BUG HUNT 2026-06-28 — Auditoria com 9 skills

### 🔴 CRÍTICOS (5) — Corrigidos

- [x] **[B-01]** `settle_split`: double-count no saldo (trigger + UPDATE manual)
- [x] **[B-02]** `settle_split`: race condition sem FOR UPDATE
- [x] **[B-03]** `settlement_reversals`: FK ON DELETE CASCADE → RESTRICT
- [x] **[B-04]** Senha hardcoded `909496` → `is_admin()` JWT-based
- [x] **[B-05]** `settle_split`: adicionada verificação de ownership (auth.uid)

### 🟠 ALTOS (8) — Corrigidos

- [x] **[B-06]** `unsettle_split`: DELETE físico → soft delete (deleted_at)
- [x] **[B-07]** CSP: removido `unsafe-eval` do vercel.json
- [x] **[B-08]** `settle_split`: CURRENT_DATE → parâmetro p_date
- [x] **[B-09]** `isReasonableDate`: dateUtils.parseDate() em vez de new Date()
- [x] **[B-22]** `settle_multiple_splits`: removido p_user_id arbitrário
- [x] **[B-11]** `settle_split`: validação de p_amount > 0 e = split.amount
- [x] **[B-12]** `settle_multiple`: validação cross-account
- [x] **[B-24]** `settlement_reversals`: FK RESTRICT (idem B-03)

### 🟡 MÉDIOS (12) — Corrigidos

- [x] **[B-10]** AuthContext: queryClient.clear() no signOut
- [x] **[B-14]** rpcWithRetry: risco documentado (limitação HTTP, idempotência server-side mitiga)
- [x] **[B-15]** recalculate_account_balance: = ANY(ARRAY(...)) em vez de LIMIT 1
- [x] **[B-16]** useCreateTransaction: inFlightRef reset no unmount
- [x] **[B-17]** useCreateTransaction: duplicidade check 15s + account_id null
- [x] **[B-25]** PrivacySettings: .limit(500) anti N+1
- [x] **[B-26]** groq-proxy: CORS para \*.vercel.app
- [x] **[B-27]** send-bill-reminders: já remove subscriptions 404/410 ✅
- [x] **[B-28]** sw.ts: cache maxAge 7d → 1h

### 🔵 BAIXOS (4) — Corrigidos

- [x] **[B-18]** Inconsistência settle_split vs settle_multiple — resolvido via migrations
- [x] **[B-19]** isValidDate: new Date(year,month,0) — baixo risco, mantido
- [x] **[B-20]** error_logs: RLS restrito (is_admin + próprio usuário)
- [x] **[B-29]** Duplicado de B-15
- [x] **[B-30]** Duplicado de B-18
- [x] **[AUDIT-LIVE-FORMS-READONLY-1018]** Produção autenticada: transação vazia mostrou validação de valor maior que zero sem gravar; formulário Nova conta ficou desabilitado e foi fechado sem salvar. Dashboard, Transações, Contas, Cartões, Compartilhados, Família e Relatórios renderizaram. Relatórios/lista exibem saídas de R$ 128,32 e Dashboard R$ 11,00; divergência permanece. Nenhum registro criado, removido ou alterado.
- [x] **[AUDIT-DB-TLS-CA-AND-CRUD-1018]** CA oficial obtido do Dashboard. `test:db-security` e `test:db-smoke` rodaram por TLS com verificação de certificado/hostname; operações financeiras sintéticas revertidas, 29 checks sem falhas e `testDataRestored=true`.
- [x] **[AUDIT-LIVE-SECONDARY-ROUTES-1018]** Site publicado autenticado: metas/investimentos/IRPF, orçamentos, detalhes da viagem (resumo/gastos/câmbio/roteiro/checklist/diário/comunidade), simuladores e configurações carregaram. Nenhuma escrita, exclusão ou exportação foi feita. Renda fixa e IPCA mostraram resultados aritmeticamente coerentes; botão BCB continua desabilitado.
- [x] **[AUDIT-TRIP-CHECKLIST-DUPLICATE-1018]** Corrigido agrupamento de categorias legadas `eletrônicos`/`eletronicos` para uma única seção ordenada. Regressão do `TripChecklist` passou; nenhum dado existente foi alterado.
- [x] **[AUDIT-DB-TLS-CA-AND-CRUD-1018]** Pendência antiga do CA resolvida: certificado oficial baixado pela sessão autenticada; harnesses PostgreSQL executados com TLS verificado e rollback confirmado. O conjunto não substitui CRUD completo via UI para cada módulo.
- [x] **[AUDIT-MIGRATIONS-RECONCILED-1019]** Histórico local/remoto reconciliado após autorização do usuário; SQL pendente aplicado ou marcado após verificação de efeitos já existentes. `supabase db push --linked --include-all --skip-vault --dry-run` confirmou `upToDate` e nenhuma migration pendente.
- [x] **[AUDIT-LIVE-CRUD-CLEANUP-1019]** Smoke ao vivo criou uma despesa descartável de R$ 0,01, confirmou mudança de saldo/lista, excluiu-a pela interface e removeu fisicamente o registro de teste e seus dois logs de auditoria; consulta final confirmou zero correspondências.
- [x] **[AUDIT-LIVE-ROUTES-AND-REGRESSIONS-1019]** Rotas autenticadas principais e secundárias carregaram; identificados erros de produção no bundle antigo ao consultar perfis de convites/cartões compartilhados e falha de fetch do BCB nos simuladores. Correções locais existentes ainda não foram publicadas.
- [x] **[AUDIT-METRIC-LABELS-1019]** Clarificados rótulos entre saídas de caixa e despesas em Dashboard, Transações e Relatórios; snapshots atualizados. Typecheck, lint dos componentes alterados e testes do Dashboard aprovados.
- [x] **[AUDIT-PUBLISH-AND-POSTRELEASE-1019]** Publicação autorizada concluída; deployment Vercel `dpl_3Wsy1Y3kV6ezPz2Qf83God7aN4Nz` READY. Aceite autenticado confirmou o painel e saldo familiar após quitações e remoção do teste `sallario`. Aceites completos de OFX/backup e demais fluxos de escrita seguem pendentes.
- [x] **[AUDIT-BACKUP-TRIP-SCOPE-1019]** Corrigida a seleção de viagens próprias por `owner_id`, a exclusão por `owner_id`/`trip_id` conforme o esquema e o escopo RLS, e a exportação de filhos apenas de viagens próprias. O texto da interface agora informa que o backup é parcial e não criptografado.
- [ ] **[AUDIT-BACKUP-CONTRACT-1019]** Registro histórico descreve um contrato para 46 tabelas, mas `docs/BACKUP_RESTORE_V2_CONTRACT.md` não existe neste checkout e não encontrei referência equivalente no `MASTER_BLUEPRINT.md`. Reconstruir o inventário a partir do schema vigente, incluindo a decisão do usuário de substituir também dados compartilhados, e submeter a revisão antes de qualquer restauração.
- [ ] **[AUDIT-BACKUP-ATOMICITY-COVERAGE-1019]** Risco confirmado no schema remoto: exclusão de viagens pode remover por cascade transações de participantes e dados de viagem não exportados; excluir contas/categorias também apaga relações omitidas. `BackupManager` exporta 14 tabelas e não garante snapshot consistente. Ainda faltam escopo revisado, staging consistente, restore transacional, testes de rollback/escopo compartilhado e cobertura integral antes de reativar. A restauração permanece desativada.

- [x] **[AUDIT-SETTINGS-PROFILE-PERCEIVED-LOAD-1019]** Perfil em Configurações agora mostra nome/e-mail e estrutura imediatamente usando Auth como fallback; avatar sincroniza valores do perfil e fica bloqueado para edição até os dados persistidos chegarem. Testes focados 6/6 e typecheck passaram. Build/revisão pendentes; publicação não executada.

- [x] **[AUDIT-SETTINGS-PROFILE-PERCEIVED-LOAD-REVIEW-1019]** Revisor independente aprovou a correção; 6 testes focados, typecheck, build Vite isolado e git diff --check passaram. Avisos do build: API CJS do Vite, imports dinâmico/estático do notificationService, token Sentry ausente e chunks grandes.

- [x] **[AUDIT-BACKUP-TRIP-EXCHANGE-SCOPE-1019]** Corrigida a limpeza de 	rip_exchange_purchases para filtrar pelo 	rip_id das viagens próprias (em vez de usuário), evitando remover compras de viagens em que o usuário só participa. Revisão independente aprovada; restauração não executada.

- [x] **[AUDIT-LIVE-NAV-RESPONSIVE-1019]** Navegação horizontal restaurada sem botão Mais; pré-carregamento iniciado no toque/foco. E2E Chromium 4/4 (desktop, toque móvel, viewport intermediário, menu móvel); deploy `dpl_8ngT6Yvfmt4ee4VQLQFmQbqAcMN9` READY; rotas principais HTTP 200.
- [x] **[AUDIT-LIVE-CRUD-CLEANUP-1019B]** Registro sintético de R$ 0,01 removido da lista pelo app; depois da confirmação explícita, a linha e seus logs foram purgados fisicamente. Supabase confirmou zero correspondências e saldo mantido em R$ 3.078,79.
- [ ] **[AUDIT-LIVE-SUPABASE-DASHBOARD-LOGIN-1019]** CLI vinculado permite consulta remota; painel web redireciona para login e aguarda autenticação manual em aba já aberta para inspeção pelo Dashboard.

- [x] **[AUDIT-DIRECT-SUPABASE-CATALOG-1019]** Consultas read-only pelo CLI vinculado confirmaram 46/46 tabelas públicas com RLS e nenhum privilégio efetivo TRUNCATE/TRIGGER/REFERENCES/MAINTAIN para anon/authenticated; defaults de `postgres` limpos. `supabase_admin` mantém ACLs padrão, mas não possui objetos públicos atualmente; impacto futuro ainda requer investigação. Nenhuma escrita foi feita.
- [x] **[AUDIT-DB-HARNESS-CREDENTIALS-1019]** Dashboard autenticado forneceu CA oficial; DSN `POSTGRES_URL_NON_POOLING` e CA foram carregados no ambiente temporário sem exibir credenciais. Ambos os harnesses passaram com TLS estrito. `migration list --linked` pode continuar falhando com a senha da role de login, mas o histórico remoto foi confirmado via catálogo e `db push --dry-run` está sincronizado.

- [x] **[AUDIT-PURGE-TEST-TRANSACTION-1019]** Após confirmação explícita, purgada do Supabase a transação sintética `ZZ_TESTE_AUDIT_LIVE_1792405089050` e seus logs específicos. Verificação posterior: zero correspondências e saldo da conta mantido em R$ 3.078,79.

- [x] **[AUDIT-BACKUP-RESTORE-CONTAINMENT-1019]** Restore bloqueado localmente depois de confirmar cascatas para dados não exportados e risco de restore parcial. Escopo de viagem do export clarificado; revisão independente aprovada. Teste focal 1/1, typecheck, lint, Prettier, diff check e build de produção passaram. A implementação transacional real segue pendente e o build publicado não mudou.
- [x] **[AUDIT-UNIT-SUITE-AFTER-RESTORE-GUARD-1019]** Suíte Vitest completa após a contenção do restore: 341 passaram, 19 ignorados, 56 arquivos.
- [x] **[AUDIT-BACKUP-SCOPE-1019]** Usuário definiu que a restauração também deve substituir cartões compartilhados e viagens colaborativas. O formato atual não exporta esses dados de forma completa, então a restauração permanece desativada; uma RPC atômica e inventário completo de propriedade/cascatas são pré-requisitos. Teste focal BackupManager 1/1, diff --check e consulta live confirmando a purga do registro sintético (0 linhas restantes) passaram. Não houve restore nem escrita adicional no Supabase.
- [ ] **[AUDIT-BACKUP-COMPLETE-RESTORE]** Versionar export/import com escopo compartilhado explícito, cobrir relações e dependências de viagem/cartões, validar atomicidade e rollback em banco isolado e realizar aceite somente depois.
- [x] **[AUDIT-BACKUP-PAGINATION-1019]** Exportação agora pagina tabelas, viagens próprias e filhos em blocos estáveis, cobrindo mais de 1.000 linhas e limitando lotes de IDs a 100. Testes focados 4/4, Vitest 349 passaram/19 ignorados, typecheck, formato e diff check aprovados; revisão independente aprovou. Snapshot consistente e cobertura completa permanecem pendentes.
- [ ] **[AUDIT-BACKUP-SCOPE-LIVE-MATRIX-1019]** Há registro histórico de inventário somente leitura do schema e cascatas, mas o script repetível `npm run audit:backup-scope` e `scripts/audit-backup-scope.mjs` não existem neste checkout. Recriar o artefato e repetir a matriz antes de usar os resultados para desenhar a restauração.
- [x] **[AUDIT-ADMIN-RECALC-1019]** Corrigida a autorização da RPC `recalculate_all_balances(p_user_id)`: usuário pode recalcular a própria conta; admin via `is_admin()` pode recalcular alvo; anon/usuário comum continuam sem acesso cruzado. Revisor independente aprovou após confirmar ACL da função interna (`PUBLIC`/anon/authenticated sem EXECUTE; service_role apenas). Preflight com fixture admin temporária e conta-alvo existente passou em `BEGIN/ROLLBACK` nos três caminhos. Migration 20261019155823 aplicada; teste live repetido com rollback e catálogo confirmou registro aplicado.
- [x] **[AUDIT-ADMIN-ACCOUNT-1019]** Por pedido explícito, `wesley.diaslima@gmail.com` cadastrado como admin. Confirmação live: 1 vínculo em `admin_users`; sessão simulada como authenticated passou `is_admin()` e RPC `get_admin_system_stats`. Nenhuma outra conta foi adicionada.
- [x] **[AUDIT-SUPABASE-ADVISORS-1019]** Consulta live: 55 avisos de SECURITY DEFINER para revisão individual, 1 proteção a senha vazada desativada, 2 avisos auth RLS initplan, 3 grupos de policies SELECT permissivas duplicadas, 20 FKs sem índice e 61 índices não usados. Revisão inicial das RPCs com argumentos de usuário não encontrou acesso cruzado nas amostras verificadas. Resta priorizar/avaliar os demais avisos; não remover índices por alerta isolado.
- [ ] **[AUDIT-SUPABASE-ADVISORS-FOLLOWUP]** Avaliar individualmente as 55 SECURITY DEFINER e policies duplicadas, otimizar initplan sem mudar autorização e habilitar proteção a senhas vazadas após acesso ao Dashboard autenticado.
- [x] **[AUDIT-RLS-INITPLAN-1019]** `auth_rls_initplan` live reduzido de 2 para 0: policies de INSERT/SELECT em `family_invitations` agora usam `(SELECT auth.jwt()) ->> 'email'`; roles e checks mantidos. Revisor independente aprovou equivalência local; preflight em transação revertida e catálogo live confirmaram as expressões; advisor pós-aplicação confirmou 0 alertas desse tipo.
- [x] **[AUDIT-RLS-TRIP-PERF-1019]** Avaliadas e removidas as 3 sobreposições permissivas de SELECT em trip_bags, trip_journal_entries e trip_reservation_endpoints; migration live aplicada e harness transacional ampliado passou 112 verificações comportamentais e de catálogo, com rollback verificado. Benchmark de latência segue pendente em AUDIT-RLS-TRIP-LATENCY-BENCHMARK-1019.
- [x] **[AUDIT-RLS-TRIP-POLICY-SPLIT-1019]** Policies RLS de três tabelas separadas em SELECT e DML; migration aplicada ao remoto. Revisão independente da migration e do harness aprovada; harness passou 112 verificações incluindo UPDATE entre viagens negado, predicados exatos do catálogo e rowCount dos INSERTs/limpezas; rollback confirmou zero fixtures restantes.
- [ ] **[AUDIT-RLS-TRIP-LATENCY-BENCHMARK-1019]** Medir latência/planos com volume representativo após remoção da sobreposição; não há claim de ganho de desempenho até existir medição comparativa.
- [x] **[AUDIT-LOCAL-GATES-1019]** Vitest 349 passaram/19 ignorados; typecheck, secret scan, Prettier nos 75 arquivos TS alterados e `git diff --check` passaram. `AppLayout.tsx` foi formatado pontualmente para corrigir o único arquivo apontado.
- [x] **[AUDIT-NOTIFICATIONS-RLS-1019]** Migration `20261020002459_secure_notification_creation.sql` restringe criação ao usuário e relações compartilhadas autorizadas. Aplicada no Supabase; dry-run sincronizado; harness rollback-only passou 14 verificações e limpou zero linhas residuais; serviço tem testes focados 3/3.

- [x] **[AUDIT-FAMILY-BALANCE-LIVE-CLEANUP-1020]** Após confirmação, três itens pendentes de Fran foram quitados; lançamento sintético sallario criado pela auditoria removido pela UI. Produção confirmou Fran ausente e Jhonatan R$ 910,38 (parcela de novembro), saldo das contas R$ 3.078,79.
- [x] **[AUDIT-UNIT-AND-TYPECHECK-1020]** Vitest 352 passaram/19 ignorados; `npm run typecheck` passou. `npm audit fix` sem `--force` reduziu alertas de 14 (7 moderate/7 high) para 13 (7 moderate/6 high); os restantes exigem migração principal de Vite/Tailwind ou revisão de alcance.
- [x] **[AUDIT-SETTLEMENT-REFUND-RPC-1020]** Alinhados sinais de despesa/reembolso/lote misto entre UI e RPC, validação do valor integral em centavos, seleção vazia e filtro de tipo. Preflight Supabase com migration real passou despesas/reembolsos bilaterais, lote misto e parcial rejeitado dentro de rollback; revisão independente aprovada; zero fixtures residuais.
- [x] **[AUDIT-RPC-OWNERSHIP-GOAL-SETTLEMENT-MIGRATIONS-1020]** Aplicadas seletivamente e registradas no remoto as migrations 20261020224406 e 20261020230345; 20261020224936 já aplicado. Catálogo confirmou grants e search_path da RPC de acerto.
- [x] **[AUDIT-PUBLISH-SETTLEMENT-FIX-1020]** Build local/remoto passou; deployment Vercel `dpl_BKx3d5tqiECuQ6rLm8EnKYt5d7im` READY, `version.json` live `1792538156720`, `/transacoes` HTTP 200 e rota autenticada `/compartilhados` renderizou. Como não havia itens pendentes no mês, o aceite UI da ação de acerto segue pendente.
- [x] **[AUDIT-SHARED-INVOICE-RPC-STATUS-SCOPE-1020]** Corrigidas no Supabase as RPCs familiares: escopo de convite aplicado antes do retorno, resumo consolidado restrito ao dono, somente vínculo ativo aceito, atualização de permissões protegida por trigger/RLS. Revisão independente aprovada após corrigir bypass de escopo e preservar todos os splits apenas em transações autorizadas. Migration `20261020232349` aplicada e sincronizada.

- [x] **[AUDIT-FAMILY-SHARING-RPC-PREFLIGHT-1020]** Preflight Supabase em `BEGIN/ROLLBACK`: owner, active/inactive, date range inclusivo, vencimento do cartão, trips_only, specific_trip, vínculo legado, transação própria, splits correlatos e bloqueio de alterações/deleções por membro; zero dados sintéticos persistidos.
- [x] **[AUDIT-FAMILY-SHARING-RPC-REVIEW-1020]** Revisão independente final aprovada; migração aplicada em transação e registrada no histórico remoto; catálogo confirma `search_path=""`, EXECUTE da função base apenas para service_role, wrapper v2 disponível para authenticated, trigger ativo e zero linhas ZZ_SCOPE_PREFLIGHT.
- [x] **[AUDIT-LOCAL-GATES-1020B]** Vitest 357 passou/19 ignorados (62 arquivos passaram/2 ignorados), typecheck, Prettier, build de produção e E2E Playwright de navegação 4/4 passaram.
- [x] **[AUDIT-PUBLISH-FAMILY-SCOPE-1020]** Deploy Vercel `dpl_8ngT6Yvfmt4ee4VQLQFmQbqAcMN9` READY e alias `https://meupedemeia.vercel.app`; `/`, `/transacoes`, `/familia` e `/configuracoes` responderam HTTP 200.
- [x] **[AUDIT-DASHBOARD-RECENT-FAMILY-SCOPE-1020]** RPC do dashboard corrigida: atividade própria preservada; atividade de terceiros só retorna com autor da mesma família ativa e dentro do `sharing_scope`; suporte também a vínculo legado. Migration `20261020235256` aplicada via `db push`, revisada independentemente e validada em preflight linked `BEGIN/ROLLBACK` para registro permitido, fora do escopo, próprio com `payer_id` e membro legado. Catálogo live confirma `search_path=""`, base sem EXECUTE para authenticated, wrapper v2 existente; zero fixtures residuais.
- [x] **[AUDIT-DASHBOARD-RECENT-REVIEW-1020]** Revisor independente verificou migration e preflight final, confirmou equivalência do SQL testado com a migration e não encontrou bloqueio.
- [x] **[AUDIT-CLEANUP-CRON-PROJECTION-1021]** Corrigida a limpeza agendada de logs (helper restrito a `postgres`, janela atual de 365 dias preservada), validação de limites e projeção de lançamentos excluídos; migrations aplicadas e registradas no Supabase após preflights em `BEGIN/ROLLBACK` e revisão independente.
- [x] **[AUDIT-FAMILY-CONTACTS-LOADING-1021]** A tela Família diferencia consulta pendente, lista vazia e erro; teste de regressão focado passou 4/4. Produção revalidada após reload: Fran em Membros (1), Jhonatan em Contatos de despesa (1).
- [x] **[AUDIT-FAMILY-CONTACTS-RECHECK-LIVE-1021]** Após novo relato de lista vazia, reload autenticado em produção: Fran (membro) e Jhonatan (contato) reapareceram após o splash. O formulário real de divisão também listou ambos como participantes. Não houve erro de console observado e o formulário sintético foi fechado sem salvar; não foi possível reproduzir a ausência nesta sessão.
- [x] **[AUDIT-FAMILY-STALE-CACHE-ERROR-1021]** Corrigido erro de atualização em background que escondia a página Família apesar de dados em cache; a tela mantém os membros/contatos e mostra aviso não fatal. Teste dedicado cobre falha da consulta com Fran/Jhonatan já carregados; revisão independente aprovada, `Family.test.tsx` e build local passaram.
- [ ] **[AUDIT-SPLIT-MEMBERS-LOADING-1021]** Reincidência reportada. Em `/familia` e no modal real “Dividir”, Fran (membro) e Jhonatan (contato) aparecem após as consultas concluírem; nenhum lançamento foi salvo. Correção local exibe loading/erro em vez de lista vazia, mantém participantes em cache se refetch falhar, aplica `active_in_form` aos contatos, não usa fallback da família em viagens sem participantes carregados e bloqueia confirmação sem pagador resolvido. Corrigido também P2 de `Family.tsx`: falha de atualização não descarta pessoas já visíveis; teste prova Fran/Jhonatan preservados. Revisão independente aprovada; Família + split **15/15**, typecheck, Prettier, `git diff --check` e build passaram. Vercel confirmou bloqueio de autoria: email do commit `cascaoconcurseiro@gmail.com` não corresponde a uma conta Git reconhecida/vinculada. Produção continua em `1792621290747`; patch não publicado. Wesley precisa vincular/verificar a conta Git/Vercel compatível, depois publicar e confirmar a lista desde o primeiro instante.
- [x] **[AUDIT-SECURITY-HARNESS-EXPECTED-ERRORS-1021]** `expectSqlState()` agora usa savepoint individual por erro esperado e o preflight da projeção cobre separadamente `credits_related` e `debits_direct`; revisão independente estática aprovada. Execução completa do harness ainda depende de `SUPABASE_DB_URL`/`DATABASE_URL` disponível no ambiente.
- [x] **[UI-TOPBAR-CENTER-1022]** Links desktop do topbar centralizados no espaço disponível, com espaçamento uniforme e mantendo rolagem horizontal; `npm run build` passou. Validação visual após publicação pendente.
