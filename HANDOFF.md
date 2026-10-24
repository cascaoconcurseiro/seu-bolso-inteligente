# HANDOFF.md — Ponto de Continuidade

> Última atualização: 2026-10-24

## Continuação - 24/10/2026 - matriz E2E verde e correção de cadastro de contatos

- Revisão candidata permanece no worktree isolado `C:\Users\Wesley\.codex\worktrees\rpc-audit-release\seu-bolso-inteligente`, baseado em `origin/main`; checkout principal com alterações alheias preservado. As 28 migrations já aplicadas no banco mas ausentes do repositório foram copiadas sem alterações para reconciliar o histórico local.
- Specs E2E atualizadas para textos/fluxos reais da interface. Matriz completa `npx playwright test --workers=2`: 114 passaram, 1 ignorado, 115 total, em Chromium, Firefox, WebKit, Mobile Chrome e Mobile Safari. A nova regressão de convites/contatos passou 15/15 nos cinco projetos. A matriz anterior já era verde em 109/110 antes da última regressão; a execução mais recente é o resultado autoritativo.
- Revisão do fluxo de contato encontrou busca residual a `profiles` por e-mail e nome, que podia falhar sob RLS e vincular incorretamente homônimos. `useAddSharedContact` agora grava contato externo sem vinculação automática; E2E confirma `user_id`/`linked_user_id` nulos e ausência dessas consultas. Convites familiares seguem separados e usam `family_invitations.to_email` sem enumeração de perfis.
- Vitest: 332 passaram/19 ignorados (351); typecheck passou; build Vite/PWA passou. Build ainda avisa que o chunk principal é 692,86 kB minificado e que falta token Sentry para upload de source maps. `npm audit --omit=dev` continua com cinco moderadas em Tailwind/PostCSS e React Router; correção automática requer majors e não foi incluída.
- `npx supabase db push --linked --dry-run` apontou exclusivamente as quatro migrations candidatas `20261024212001`, `20261024212531`, `20261024222000` e `20261024223500`. Preflights anteriores executados em transações revertidas; nenhuma migration foi aplicada nesta sessão.
- **Próximo passo concreto:** aguardar a revisão independente, conferir `git status`, `git diff` e `git log --oneline -5`; commitar somente os arquivos do release no worktree isolado e tentar push normal para `main`, conforme autorização anterior. Depois conferir deployment, aplicar as quatro migrations e validar os saldos/família/topbar ao vivo.
- **Bloqueio pendente:** aceite OFX sintético live precisa da extensão Codex no Brave com permissão temporária de acesso a arquivos locais ativa; a autorização do usuário já foi dada, falta confirmar a permissão no browser. Backup/restauração permanece desativado até fechar testes transacionais e escopo compartilhado.
- Progresso registrado: 360/396 itens concluídos (36 abertos; 9,1%). Grupo AUDIT: 185/210 (25 abertos; 11,9%). Goal ativo.

## Continuação - 24/10/2026 - revisão semântica das RPCs e patches candidatos

- Catálogo Supabase conferido com TLS estrito: 131 funções `SECURITY DEFINER`, 55 executáveis por `authenticated`, zero por `anon` e zero sem `search_path`. A revisão semântica dos corpos e callers das 55 foi reconciliada entre revisores de finanças e família/viagens.
- Achados para fechamento: `is_family_member_v2` não limita status ativo e famílias não excluídas (impacto depende de memberships inativas persistentes); `get_monthly_projection` não exclui splits soft-deleted nem contas inativas; `get_shared_expense_summary_by_person` inclui splits soft-deleted e conta receitas como despesa; `get_admin_user_dossier` serializa `app_pin_hash`; helpers de reatribuição aceitam destino inativo/removido em chamadas diretas. Ausência de caller local não remove exposição RPC autenticada.
- Migration `20261024212001_fix_trip_balance_soft_deleted_splits_and_invite_notifications.sql`: wrapper de saldo de viagem agora exclui splits removidos; resposta do convite limpa notificações novas usando ID do convite em metadata, mantém suporte à forma legada e não toca metadata divergente/de outro usuário. Harness live com fixtures sintéticas em `BEGIN/ROLLBACK`: 15/15, dados revertidos; serviço de notificação 4/4 e TypeScript aprovados.
- Migration `20261024212531_harden_installment_split_integrity_and_delete.sql`: valida soma monetária/percentual dos splits, rejeita subcentavos e split recém-criado quitado, protege série contra colisão de proprietário e troca hard-delete por exclusão lógica de parcelas futuras, bloqueando série quitada/parcialmente liquidada. Criação e exclusão usam o mesmo advisory lock. Revisão independente aprovou a lógica após ajustes. Harness live anterior aos casos finais passou 25/25 com rollback; versão atual adiciona cobertura para subcentavos e `settled_at` isolado, mas ainda precisa de nova execução live. A corrida entre sessões não é simulada; lock foi confirmado por inspeção. Nada foi aplicado remotamente.
- Migration `20261024222000_harden_family_membership_admin_and_shared_summary.sql` limita membership da família a estado ativo e família não excluída, remove `app_pin_hash` do dossier admin, exclui splits soft-deleted/receitas do resumo por pessoa e exige destino ativo nos helpers de reatribuição. Revisão independente aprovada; comportamento de family/admin, resumo e helpers foi testado com fixtures sintéticas e rollback via Supabase CLI.
- Migration `20261024223500_fix_monthly_projection_inactive_accounts_and_deleted_splits.sql` deriva da definição live atual. Projeção futura filtra contas inativas e splits removidos. Reconstrução de saldo histórico considera somente transações já postadas; só ajusta o lado ativo das transferências e trata o outro lado inativo como excluído do saldo-base. Reviewer independente aprovou a lógica após revisão do caso histórico.
- Validação live pelo Supabase CLI vinculado (sem URL/credencial direta): as quatro migrations candidatas compilam juntas em `BEGIN/ROLLBACK`. Casos sintéticos separados com rollback passaram para (a) membership ativa/inativa/família excluída e dossier admin sem hash PIN; (b) resumo de despesas ignorando split excluído e receita compartilhada; (c) destinos inativos negados pelos helpers; (d) split de fração de centavo rejeitado e exclusão lógica de parcelas futuras; (e) projeção atual/histórica com contas ativas/inativas, transações postadas/agendadas, transferências nos dois sentidos e split removido. Consultas de pós-condição confirmaram zero usuários/famílias/transações dos fixtures criados nesta sessão.
- `scripts/test-transaction-rpc-ownership.mjs` agora também contém regressões para projeção, resumo compartilhado, helpers, family membership e payload admin; `node --check`, Prettier e `git diff --check` passaram. O harness node-postgres completo não foi executado nesta sessão; os cenários foram verificados pelo SQL CLI live em transações revertidas.
- Benchmark live repetido em `/configuracoes`, Brave com cache e service worker desativados: mediana de 3 navegações, load 363 ms, TTFB 43 ms, DOMContentLoaded 331 ms, FCP 324 ms e 397.079 bytes transferidos. Comparação com baseline histórico de 535,6 ms: load 32,2% menor; a condição de navegação não é idêntica a primeira visita.
- Não foi publicada migration nem enviado OFX. Produção ainda usa `buildTimestamp=1792664327486`; o upload sintético aguarda parser corrigido publicado e confirmação manual da permissão local da extensão Codex no Brave. Topbar também aguarda publicação isolada.
- Próximo passo concreto: preparar uma entrega isolada das quatro migrations e testes verificados sem capturar o working tree alheio; cumprir o fluxo autorizado para `main`; depois conferir produção e repetir o upload OFX sintético quando a permissão local do Brave estiver habilitada.
- Progresso do checklist: 359/395 itens concluídos (36 abertos; 9,1%); grupo AUDIT 184/209 (25 abertos; 12,0%). São contagens de itens, não estimativa de esforço. Goal ainda ativo.

## Continuação - 24/10/2026 - regressão responsiva do topbar

- E2E Chromium encontrou falha real em 785 px: com `justify-center`, links excedentes ficavam centralizados dentro da faixa rolável e “Início” saía da área visível. `AppLayout.tsx` agora alinha à esquerda em larguras intermediárias e centraliza a partir de `2xl`, quando há espaço.
- `e2e/navigation.spec.ts` verifica link inicial alcançável em 785 px e centralização em 1920 px. Suíte Chromium de navegação passou 4/4; build e `git diff --check` passaram. `prettier --check` sinaliza divergências de formatação distribuídas pelo arquivo E2E preexistente; não formatei o arquivo todo para evitar mudanças de escopo maior.
- Verificação somente leitura: produção responde `version=1.0.0`, `buildTimestamp=1792664327486`, anterior ao build local. Não foi publicada nesta sessão; ainda falta aceite visual publicado.
- Testes de `src/utils/ofxParser.test.ts` e `src/components/modals/OFXImportModal.test.tsx` passaram 13/13. A produção ainda serve bundle anterior ao parser corrigido; não foi enviado arquivo nem alterado dado financeiro.
- Duas revisões independentes do backup confirmaram que o restore deve continuar desativado: sequência REST sem rollback, cascatas/falhas em raízes de viagem/conta e necessidade de controlar convites, memberships e PII por linha/coluna. Contrato atualizado; nenhuma consulta a linhas nem mutação remota foi feita.
- `BackupManager.test.tsx` e `backupUtils.test.ts` passaram 4/4, validando o comportamento local do gerenciador/paginação; isso não substitui os critérios de snapshot consistente nem teste de restore transacional.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Bloqueios: working tree contém alterações locais alheias que precisam ficar fora da publicação; teste OFX requer a permissão temporária da extensão para ler arquivo local. Restauração permanece desativada até critérios de escopo/atomicidade serem testados.

## Continuação - 23/10/2026 - painel de acompanhamento

- Adicionado ao topo de `CHECKLIST.md` um painel com evidência concluída, foco atual, próximos focos e regra para mover o foco a cada sessão. Contagens atuais: checklist 352/389; grupo AUDIT 178/204. Há itens antigos/sobrepostos e fora da auditoria, então as contagens não representam trabalho homogêneo.
- O ajuste de alinhamento do topbar tem build local aprovado; sua validação visual publicada ainda está pendente.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Bloqueios: resultado ao vivo do topbar depende de publicação; upload OFX depende da permissão temporária de arquivo local da extensão estar ativa. Backup/restauração exige fechar e testar o escopo transacional antes de reativar.

## Continuação - 22/10/2026 - alinhamento do topbar

- Navegação desktop ajustada em `src/components/layout/AppLayout.tsx`: links centralizados no espaço entre a marca e os controles da direita, com espaçamento uniforme e mantendo a faixa horizontal rolável em telas menores.
- Build de produção local passou. Não foi feito deploy; a validação visual em produção fica pendente até publicação autorizada.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Bloqueios: working tree contém alterações locais alheias que precisam ficar fora da publicação; teste OFX requer a permissão temporária da extensão para ler arquivo local. Restauração permanece desativada até critérios de escopo/atomicidade serem testados.

## Continuação - 22/10/2026 - deploy do fix de Família e rechecagem live

- Push fast-forward para `main` confirmado em `725f50c197d82ee1d6b35ce2337603d299376a27`; nenhum dos demais arquivos modificados do workspace foi incluído. Vercel marcou o deployment de produção desse commit como `Ready`, e `version.json` do alias corresponde ao timestamp do novo build. O preview foi confirmado pelo Wesley como funcional.
- A primeira aba permaneceu mostrando o erro após o deployment. Uma aba nova autenticada no mesmo alias carregou Fran em `MEMBROS (1)` e Jhonatan em `CONTATOS DE DESPESA (1)`. Em seguida, na aba antiga, naveguei para Início e retornei a Família; os dois nomes também carregaram. Smoke visual confirmado no alias de produção, sem alterar registros. A evidência indica estado/bundle antigo mantido na aba aberta, mas a causa exata da persistência inicial não foi instrumentada.
- Inspeção Supabase somente leitura via `npx supabase db query --linked`, usando `SET LOCAL ROLE authenticated` e claims do Wesley: a consulta equivalente retornou 1 família, 2 membros, 1 contato e 3 perfis para enriquecimento; nenhuma escrita ocorreu. `authenticated` não tem SELECT de tabela inteira em `profiles`, mas as colunas públicas continuam concedidas por coluna. A policy live de SELECT em `families` usa `owner_id` ou `is_family_member_v2`; essa função lê `family_members`, sem referência a `profiles`. A hipótese de falha atual de RLS no banco não foi reproduzida.
- CI #39761847259 concluído: build, Vitest, lint, TypeScript e formatação dos arquivos alterados passaram. Playwright Chromium teve 14 falhas e 4 passagens; o job recebeu `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` vazias, e os erros foram principalmente rotas autenticadas sem conteúdo. `Database Security Contract` falhou porque `SUPABASE_DB_URL` não está configurada como secret no GitHub. `Security Audit` falhou com findings de alta/moderada severidade em dependências de produção, incluindo `react-router`, `vite`, `tailwindcss` e transitivas. Não transmitir URL/credenciais do banco ao GitHub sem autorização específica.
- Nenhum dado financeiro foi alterado e nenhuma migration foi aplicada nesta continuação.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Continuação - 22/10/2026 - regressão ao vivo Família/Contatos

- Reproduzi em produção na sessão autenticada do Wesley: `/familia` mostrava “Não foi possível carregar os dados da família”. A captura de rede identificou `403` com código PostgreSQL `42501` (`permission denied for table profiles`). As consultas live do bundle pediam `families.select(*,owner:profiles(...,email))` e `profiles.select(*)`; o banco restringe a leitura de perfis a colunas públicas após o hardening de privacidade. Como a consulta da família dependia do join de perfil, a falha impedia em cascata membros e contatos. Nenhum dado foi alterado.
- Patch local em `src/hooks/useFamily.ts`: carregar a família sem join com `profiles`, manter falha de leitura da família/membros como erro explícito, preservar os vínculos caso a consulta secundária de avatar falhe, derivar o membro virtual do owner por `family.owner_id` e repetir uma única vez apenas falhas transitórias. Não altera permissões/RLS nem grava no Supabase.
- Testes locais: Família + hook + seletor Dividir **16/16**, typecheck e build passaram; Prettier e `git diff --check` passaram. Revisão independente sem bloqueadores e com recomendação de não retentar 403 permanentes, incorporada no retry condicional.
- PR #75: https://github.com/cascaoconcurseiro/seu-bolso-inteligente/pull/75; commits `58417c5f` (correção e teste), `e5ccc794` (lockfile compatível com npm 10) e `60b31a1c` (contratos de tipos descobertos no CI). Atualizei a produção ao vivo em sessão autenticada: após recarregar `/familia`, a mensagem de erro continua. CI #319: `npm ci`, build, Vitest, typecheck e lint passaram; `format:check` falha em 61 arquivos preexistentes; Playwright falhou em 13 testes E2E; auditoria de dependências ainda aponta 11 vulnerabilidades altas; o contrato DB falha porque o secret da conexão não está configurado. Não fiz rollback amplo de `profiles`, pois isso exporia campos privados como o hash de PIN e configurações financeiras.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- A auditoria geral permanece ativa. Não considerar este achado fechado em produção até a versão do GitHub/Vercel ser atualizada e verificada.

## Reincidência reportada — 21/10/2026

- Reproduzi ao vivo em `/familia` com a sessão Wesley: Fran consta em `MEMBROS (1)` e Jhonatan em `CONTATOS DE DESPESA (1)`. No Nova transação > Dividir, ambos apareceram após abrir o seletor. A consulta terminou antes da inspeção, então o estado vazio transitório que o usuário vê não foi capturado nesta tentativa.
- Encontrei causa adicional para a reincidência: `Family.tsx` substituía a tela inteira por erro em falha de atualização, mesmo com dados anteriores no cache. A correção mantém membros/contatos visíveis e apresenta aviso não fatal; teste dedicado cobre esse cenário.
- O painel Vercel identificou o bloqueio: os deployments são bloqueados porque o email de autoria do commit (`cascaoconcurseiro@gmail.com`) não corresponde a uma conta Git vinculada/reconhecida. O `git config user.email` local e o commit `fe307e8` confirmam esse email. A documentação oficial orienta vincular o provedor Git e/ou usar email verificado que corresponda ao autor; não alterei configurações da conta nem contornei a proteção.
- A produção segue em `version.json` `1792621290747`, sem os estados de carregamento da correção. Verificação local desta rodada: Família + divisão **15/15**, Prettier, typecheck, `git diff --check` e build Vite passaram; o build mantém avisos conhecidos de chunks/importação dinâmica e token Sentry ausente. A correção não está resolvida em produção até deployment `READY` e validação autenticada após o alias ser atualizado.
- Próximo passo: Wesley precisa conectar à Vercel/Git o usuário que corresponde ao email usado pelo autor, ou tornar esse email verificado na conta Git/Vercel; então reenviar somente o patch e validar `/familia` e Nova transação > Dividir no instante inicial. Depois retomar as demais pendências da auditoria.

## Continuação - 21/10/2026 - regressão de participantes e bloqueio de deploy

- Em produção autenticada, a Família mostra Fran em “Membros (1)” e Jhonatan em “Contatos de despesa (1)”; “Divisão e Pagamento” também lista ambos depois da consulta. O defeito recorrente é transitório: o bundle publicado ainda não apresenta estado de carregamento e pode mostrar lista vazia antes das queries concluírem. Não salvei transação nem alterei o Supabase.
- Patch isolado aguarda queries de família, membros, contatos e viagem; distingue loading/erro/lista vazia, mantém dados em cache em falha de atualização e não usa membros gerais como fallback quando uma viagem não retorna participantes. Sem lista após erro, a confirmação fica bloqueada. Revisão independente aprovou; `SplitModal.test.tsx` passou 7/7, typecheck, build e `git diff --check` passaram no clone limpo da branch `main`.
- Dois deploys isolados foram criados pela Vercel mas retornados como `BLOCKED` (`dpl_C8WeH1yWMS5zWP6CHHdtSVRYvhNF` e `dpl_55Y9yKVzApwsgSQFQLZ9MqDwv3pD`). O painel identificou que o email de autoria `cascaoconcurseiro@gmail.com` não corresponde a uma conta Git reconhecida/vinculada. O alias principal continua no build `1792621290747`; não alterei a política de publicação nem contornei o bloqueio.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Progresso por caixas (não ponderado): grupo `AUDIT` tem 26 pendentes de 202 (12,9% abertas); checklist inteiro tem 37 pendentes de 386 (9,6% abertas). OFX live, restore completo, inventário de RPCs e outros gates ainda impedem concluir o goal.

## Continuação - 21/10/2026 - benchmark frio e RPCs financeiras

- Benchmark de produção em `/configuracoes`, usando Brave com cache e service worker desativados: navegação 535,6 ms; TTFB 35,3 ms; DOMContentLoaded 439,6 ms; load 535,6 ms; First Paint/FCP 448 ms. Na entrada inicial, foram buscadas 2 imagens de avatar (35.199 bytes codificados), contra 30 (586.928 bytes) no baseline anterior: redução de 94,0% do tráfego inicial. Ao rolar até a grade, os avatares restantes carregaram sob demanda.
- Revisão read-only no catálogo Supabase de orçamento (`get_user_budgets_progress`, `get_user_budgets_progress_with_rollover` e wrappers v2), patrimônio (`get_net_worth` e wrapper), evolução (`get_wealth_evolution` e wrapper) e resumo mensal: bases `SECURITY DEFINER` sem EXECUTE para authenticated/anon; wrappers v2 autenticados, `search_path=""`, usam `private.authenticated_uid()`; os corpos restringem por UID, `get_net_worth` e `get_monthly_evolution_report` também validam `auth.uid()`, o rollover limita carryover ao orçamento original e a evolução limita 1–120 meses e ignora transações soft-deleted. Nenhum defeito confirmado nesses grupos; inventário global segue pendente.
- Testes locais OFX: `src/utils/ofxParser.test.ts` e `src/components/modals/OFXImportModal.test.tsx` passaram (13/13). O aceite com arquivo no site segue pendente: a permissão de arquivo na extensão Brave não está confirmada como ativa e o navegador bloqueou a abertura da página de extensões; não foi enviado arquivo.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Progresso por caixas (contagem simples, sem ponderar risco/cobertura): **AUDIT: 26 abertas de 203 (12,8% falta)**; **checklist total: 37 abertas de 387 (9,6% falta)**. Restore integral, OFX, RLS de viagens, publicação Família/Dividir, segurança/DB lint e o inventário completo de RPCs ainda impedem concluir o goal.

## Continuação - 21/10/2026 - rechecagem de família/contatos e publicação

- Após novo relato de lista vazia, revalidei ao vivo a conta Wesley em `/familia`: Fran aparece em `MEMBROS (1)` e Jhonatan Rizzon em `CONTATOS DE DESPESA (1)`. Após recarga, os contatos ficam em estado `carregando…` até a consulta retornar; não reproduzi lista vazia persistente.
- No formulário real de nova transação, `Divisão e Pagamento` listou Fran e Jhonatan como participantes. Inspeção fechada sem salvar; nenhum dado financeiro foi alterado. O console não retornou erros durante a reprodução.
- Publicada a versão `dpl_8w1c9XaDrChqa6sgpoCmYsNZbSaJ` (`READY`), build `1792621290747`, após `npm run build` passar. É a versão com carregamento de imagens de avatar sob demanda. A produção foi conferida pelo `version.json`; validação final de desempenho das imagens ainda está pendente.
- Migrations `20261021100806` e `20261021101845` seguem aplicadas e registradas no Supabase. O harness de segurança foi executado contra a produção, passou com 19 RPCs e 9 migrations candidatas testadas em transação revertida; não deixou fixtures.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Progresso do checklist de auditoria: 26 itens abertos e 182 concluídos de 208 (12,5% das caixas abertas; contagem simples, não cobertura ponderada). O relato de ausência de pessoas não foi reproduzido nesta sessão; se persistir, falta capturar a tela/rota exata no momento em que os nomes somem. A auditoria e o goal continuam ativos.

## Continuação - 20/10/2026 - privacidade da atividade recente no dashboard

- Auditoria live adicional encontrou que `get_dashboard_summary` retornava detalhes de lançamentos pagos por um membro sem validar vínculo familiar ativo nem `sharing_scope`.
- Migration `20261020235256_secure_dashboard_recent_shared_transactions.sql` limita a atividade de terceiros a autor pertencente à família ativa e aplica os quatro escopos; mantém visíveis os próprios lançamentos mesmo com `payer_id`, e aceita vínculo legado `user_id` sem `linked_user_id`.
- Preflight em produção via `BEGIN/ROLLBACK` cobriu lançamento compartilhado dentro do período, fora do período, lançamento próprio com `payer_id` e vínculo legado; passou e terminou com zero linhas sintéticas. Revisão independente aprovou o SQL e confirmou que o harness testa a definição exata da migration.
- Migration aplicada com `npx supabase db push --linked`; catálogo remoto confirma `SECURITY DEFINER`, `search_path=""`, função base sem EXECUTE para authenticated e wrapper v2 disponível. Versões de migration local/remota ficaram sincronizadas.
- O ajuste é somente backend, já ativo imediatamente; nenhuma publicação frontend é necessária para esta mudança.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Continuação - 20/10/2026 - escopo familiar, navegação e publicação

- Corrigida a autorização na base das RPCs familiares. `get_shared_invoice_data` agora exige que o usuário autenticado corresponda ao parâmetro, família não excluída e vínculo ativo; os registros originados pelo dono passam pelo `sharing_scope` (todas, viagens, período inclusivo, viagem específica), enquanto transações próprias do convidado continuam visíveis. Splits completos só retornam junto de uma transação já autorizada, preservando os cálculos de saldos.
- `get_family_consolidated_summary` agora é exclusivo do proprietário, sem expor patrimônio e fluxo de caixa a membros convidados. O trigger protege alterações em `family_members`, inclusive mudanças de `sharing_scope`, papel e status; policy de DELETE limita exclusão ao proprietário ou criador do contato. Interface de família também esconde controles de gestão para não proprietários.
- Revisão independente encontrou dois bloqueios na primeira versão (bypass de escopo para transações de outros membros e omissão de splits correlatos). Ambos corrigidos; revisão final aprovou sem outros bloqueios.
- Migration `20261020232349_enforce_family_sharing_scopes_in_rpcs.sql` aplicada ao Supabase em transação e registrada no histórico remoto. Preflights reversíveis testaram escopos de período e viagens, limite inclusivo, vencimento de cartão, vínculo legado, transação criada pelo próprio convidado, splits de contraparte, resumo de dono/membro, vínculo inativo, updates e DELETE sob `authenticated`. Pós-condição: nenhuma linha `ZZ_SCOPE_PREFLIGHT` persistida.
- Navegação móvel continua lado a lado sem botão “Mais”; pré-carregamento no toque foi testado. Vitest **357 passou / 19 ignorados** (62 arquivos passaram, 2 ignorados), typecheck, Prettier e build passaram. E2E de navegação Chromium **4/4** passou, incluindo viewport intermediário e todos os destinos móveis.
- Vercel publicou `dpl_8ngT6Yvfmt4ee4VQLQFmQbqAcMN9` em `READY`, alias `https://meupedemeia.vercel.app`. Smoke HTTP em `/`, `/transacoes`, `/familia` e `/configuracoes`: 200. Build mostra avisos já conhecidos de importação mista de `notificationService` e ausência de token Sentry; Vercel também reportou 7 vulnerabilidades no conjunto instalado, que precisam permanecer classificadas/avaliadas.
- O aceite OFX sintético continua pendente. A tentativa de abrir `brave://extensions` foi bloqueada pela política do navegador; não usar outro caminho para contornar. O usuário precisa ligar manualmente “Permitir acesso a URLs de arquivo” na extensão Codex no Brave e avisar para retomar o envio sintético. Nenhum OFX foi transmitido nesta sessão.
- Ainda não marcar a auditoria total como concluída: permanecem revisão semântica das demais RPCs `SECURITY DEFINER`, teste real de acerto via UI quando houver item pendente, restore integral de dados pessoais/compartilhados, medição fria de navegação (TTFB/LCP/rede), benchmark RLS de viagens e configuração de proteção a senhas vazadas no Dashboard.
- Progresso do checklist de auditoria: 26 de 197 itens abertos (13.2%). Os itens têm pesos diferentes, então esse percentual mede apenas caixas ainda abertas e não cobertura funcional. O goal permanece ativo.
## Continuação - 20/10/2026 - validação e publicação dos acertos compartilhados

- Corrigida a direção financeira dos reembolsos (`INCOME`) na RPC de acertos; o sinal agora coincide com `generateInvoices()` para despesa, reembolso e lotes mistos. Os flags `settled_by_debtor/creditor` continuam vinculados às pessoas originais, como a tela espera.
- A RPC exige valor líquido integral e filtra pais apenas `EXPENSE`/`INCOME`; o cliente compara o total em centavos antes de enviar. Desmarcar todos os itens agora resulta em “nenhum item para acertar”, sem interpretar seleção vazia como todos.
- Preflight na produção dentro de `BEGIN/ROLLBACK` aplicou a migration real e testou despesa e reembolso em confirmação bilateral, seleção mista de despesa+reembolso e rejeição de valor parcial. Todas as assertions passaram; pós-condição encontrou zero transações de teste e zero usuários temporários.
- Revisor independente aprovou a migration final. Aplicadas seletivamente e registradas no histórico remoto as migrations `20261020224406` (ownership de RPCs de transação) e `20261020230345` (validação de acertos); `20261020224936` já estava aplicado. Catálogo confirmou `request_settlement_v2` como `SECURITY DEFINER`, `search_path=''`, EXECUTE para authenticated e sem EXECUTE para anon.
- Testes focados: Vitest **60/60** após a correção de acerto; suíte anterior com invoices e splits **63/63**; Prettier e `git diff --check` passaram. `npm run typecheck` e build local passaram. Build remoto da Vercel `dpl_BKx3d5tqiECuQ6rLm8EnKYt5d7im` ficou `READY`, alias `https://meupedemeia.vercel.app`; `version.json` live = `1792538156720`; `/transacoes` respondeu HTTP 200.
- Pós-publicação, a rota autenticada `/compartilhados` abriu no app e exibiu o painel sem despesas pendentes no mês; não havia item para testar a ação de acerto pela UI, e nenhum dado foi alterado. A navegação inicial para o caminho singular `/compartilhado` gerou 404 porque essa rota não existe; o caminho correto foi confirmado no app como `/compartilhados`.
- Nova finding em revisão: `get_shared_invoice_data_v2` inclui transações e membros sem filtrar status ativo e entrega dados antes do filtro `sharing_scope` feito no cliente; `get_family_consolidated_summary` retorna patrimônio/renda/despesa de toda a família a qualquer membro ativo e também inclui vínculos pendentes. A segunda RPC não tem caller no código atual, mas authenticated pode executá-la. Nenhuma alteração foi aplicada para esses endpoints; definir e testar o contrato de visibilidade antes da migration.
- Pendências gerais permanecem: aceite autenticado da ação de acerto pela UI quando houver item disponível; OFX sintético aguarda o usuário habilitar localmente acesso a URLs de arquivo no Brave; restore completo compartilhado e atomicidade; revisão das RPCs `SECURITY DEFINER` restantes; benchmark frio de carregamento e itens do checklist ainda abertos.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Progresso heurístico: cerca de **20% ainda falta verificar**, incluindo novas findings de escopo; não há denominador fechado. Goal permanece ativo.

## Continuação - 20/10/2026 - hardening de RPCs de convite e saldos de viagem

- Revisão independente dos corpos live das RPCs `SECURITY DEFINER` encontrou riscos de participação inativa em `get_trip_participant_balances_v2` e resposta de convite sem whitelist/lock em `fn_respond_trip_invitation`. Há outros achados financeiros e de escopo familiar ainda em revisão; esta migration não resolve a auditoria completa.
- Migration `20261020223745_harden_trip_invitation_responses_and_balances.sql` agora exige dono ou membro ativo em viagem não excluída para consultar saldos; resposta de convite valida apenas `accepted|rejected`, verifica convidado e estado pendente, bloqueia convite e viagem durante aceite, usa compare-and-set, e bloqueia aceite após exclusão da viagem.
- Harness novo `npm run test:trip-rpc-security`: **12/12 verificações aprovadas** em transação Supabase com TLS verificado e rollback: owner/membro ativo permitidos; inativo/pendente/outro usuário/viagem apagada negados; resposta inválida/replay negados; aceitação e rejeição válidas; convite de viagem apagada fica pendente sem criar membro. `testDataRestored=true`. Revisão independente aprovou o diff e a mitigação de concorrência; o harness não simula simultaneidade real, mas a migration serializa por `FOR UPDATE`.
- Migration aplicada ao Supabase remoto em `2026-10-20 22:37:45` UTC; `migration list` registra local=remote e `db push --dry-run` informa up-to-date. Pós-condição no catálogo confirma `SECURITY DEFINER`, `search_path=''`, EXECUTE por authenticated e verificações da definição presentes.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Continuação - 20/10/2026 - redução de espera na navegação móvel e publicação

- Continuação: Vite foi atualizado de 5.4 para 7.3.7, linha 7.3 atualmente mantida para correções de segurança. `npm audit` caiu de 9 para 7 avisos (2 moderados, 5 altos), todos de dependências de desenvolvimento; `npm audit --omit=dev` reporta zero vulnerabilidades. Build local e remoto passaram. Não migrei Tailwind 3 para 4 porque é uma mudança major com impacto em CSS/utilitários e navegadores suportados; manter como avaliação separada.
- Após a atualização: Vitest **356 passou / 19 ignorados**, Playwright **114 passou / 1 skip esperado** em cinco projetos, typecheck, format:check, ESLint, scanner de segredos e build passaram. O bundle principal passou de 677,27 KB/199,94 KB gzip (Vite 5) para 665,57 KB/198,11 KB gzip (Vite 7); não é medição de tempo de carregamento.
- Nova publicação Vercel `dpl_6roGaj73yoWxtbDsuL69d4Sj5D4i` concluiu `READY`, alias `https://meupedemeia.vercel.app`; `public/version.json` buildTimestamp `1792495643687`. Smoke autenticado pós-deploy abriu `/transacoes`, confirmou título correto e estado vazio de 0 registros para outubro (a observação anterior de 16 registros foi de outra data/estado); nenhuma mutação ocorreu. Aba restaurada em `/configuracoes?section=backup`, que continua com export parcial e restore desativado.
- Mantenho o relato do bundle anterior abaixo como histórico; os avisos atuais de build são import misto de `notificationService` e token Sentry ausente. O warning de API CJS do Vite desapareceu. Sem TTFB/LCP medidos; a validação de espera continua qualitativa.

- Revisão independente de performance encontrou que o desktop pré-carregava módulos no foco/hover, enquanto o `MobileNav` só iniciava a importação após navegação; páginas privadas são lazy-loaded e exibem fallback skeleton até resolver o chunk. Adicionei preloading no `pointerdown` (inclui toque) e foco dos botões móveis em `src/components/layout/MobileNav.tsx`.
- Adicionei regressão em `e2e/navigation.spec.ts`: pointerdown no destino Contas solicita o módulo antes de navegar e mantém URL em Transações. Focal Chromium + Mobile Chrome passou 4/4; navegação/layout Chromium+Mobile Chrome passou 6/6; `npm run typecheck`, `npm run format:check` e `npm run build` passaram. Build mantém avisos conhecidos: API CJS Vite, imports mistos de `notificationService` e ausência de token Sentry para upload de source map.
- Publicado por autorização prévia do usuário: deployment Vercel `dpl_FxfLGATcoJSs7HpLqSqZxkD3dBzK`, estado `READY`; alias `https://meupedemeia.vercel.app`, `version.json` `buildTimestamp=1792495213896`. As 12 rotas principais foram abertas pela navegação na sessão autenticada; todas trocaram o título e nenhuma mostrou ErrorBoundary. Teste direto de HTTP HEAD confirmou 200 em `/`, `/transacoes`, `/contas` e `/configuracoes`. A lista live carregou com 16 transações e a aba foi devolvida a `/configuracoes?section=backup`.
- A entrada live direta em `/transacoes` exibiu primeiro splash nativo e depois conteúdo completo; as duas observações ficaram separadas por aproximadamente 0,3 s. Não é um benchmark frio controlado nem mede LCP/TTFB; permanece necessário capturar métricas de pintura e rede via instrumento de navegador autorizado. Preload móvel antecipa o chunk, mas consultas de dados continuam dependendo do Supabase.
- Progresso da auditoria continua em aproximadamente **18% por verificar**, sem denominador fechado. Próximo foco: revisão semântica das RPCs autenticadas e benchmark de rota fria; OFX e backup ainda pendentes.

## Continuação - 20/10/2026 - classificação dos avisos do lint e ACLs SECURITY DEFINER

- Reexecutei `npx supabase db lint --linked --schema public`. Os erros concretos atuais envolvem seis funções legadas que usam `audit_logs`, `financial_ledger`, `trip_participants` ou uma coluna inexistente em `trip_checklist`; `soft_delete_transaction` aparece por tabela temporária dinâmica que o analisador estático não resolve. O lint também lista variáveis/parâmetros não usados e uma inicialização com tipo inconsistente em `undo_shared_settlements`.
- Consulta read-only ao catálogo remoto: 131 funções `SECURITY DEFINER`, nenhuma executável por `anon`, nenhuma sem `search_path`; 55 são executáveis por `authenticated`. As seis rotinas legadas com erro estão apenas com EXECUTE para `service_role` (além de postgres), nenhuma ligada a trigger; busca por chamadas no frontend/Edge não encontrou uso. Não alterei o banco, porque remover rotinas exige revisar dependências SQL e consumidores não presentes no repositório.
- Triagem estática dos corpos das 55 executáveis por `authenticated`: todas contêm `auth.uid()`, `private.authenticated_uid()` ou guarda `is_admin()`; 10 usam a guarda de admin. `anon` e `authenticated` não têm `CREATE` no schema `public`, mitigando shadowing nas 80 definers com `search_path=public`. Essa triagem não prova semântica completa de filtros, ownership, amount validation ou efeitos laterais; manter o item aberto.
- Admin resets continuam desativados no app; nenhum usuário consta em `admin_users`, conforme verificação anterior. As migrations permanecem sincronizadas (309/309 e dry-run sem pendências, verificação anterior).
- Pendência de segurança ampliada: classificar as 55 funções `SECURITY DEFINER` executáveis por `authenticated` por autorização, escopo de dados e uso. A contagem e ausência de grants `anon` não comprovam a correção funcional de todas.
- Próximo passo: revisar em lotes as 55 RPCs autenticadas e comparar corpo com `auth.uid()`/escopo, começando por mutações financeiras e de viagens; em paralelo, fechar teste live OFX após a permissão oficial e medir navegação fria com captura repetível. Progresso heurístico: aproximadamente **18% falta verificar**; não há denominador fechado.
- O usuário reiterou autorização para habilitar temporariamente acesso local da extensão a fim de enviar o OFX sintético. Ainda assim, `brave://extensions` é bloqueado pela política da interface automatizada, que proíbe alcançar a mesma alteração por outros meios. Nenhuma permissão ou dado foi alterado; o usuário precisa habilitar manualmente em Configurações da extensão no Brave.

## Continuação - 20/10/2026 - matriz E2E completa e publicação autenticada

- Ponto de partida: CRUDs live anteriores já estavam limpos; OFX sintético aguardava permissão temporária do navegador. O usuário também autorizou atualizar o site e habilitar temporariamente o acesso local da extensão para esse upload.
- Validações locais deste ciclo: Vitest **356 passou / 19 ignorados**; Playwright **104 passou / 1 ignorado esperado** em cinco projetos (Chromium, Firefox, WebKit, Chrome móvel e Safari móvel); typecheck, formatação, diff check e build passaram. Depois, teste focado de Configurações passou 3/3, incluindo export JSON com dados vazios de fixture. Vitest/plugins atualizados para 4.1.12; suíte passou novamente 356/19 e build/typecheck/formatação passaram.
- Produção: Vercel `dpl_FoD6GHLhDovW5zoaMPLToKNXVugP` `READY`, alias `meupedemeia.vercel.app`; `version.json` `buildTimestamp=1792493711478`. `/configuracoes`, `/transacoes`, `/familia` responderam HTTP 200.
- Aceite live autenticado: Dashboard continua com Nubank em R$ 3.078,79 e consolidado BRL R$ 56.324,47; transações continuam em 16. Fran aparece como membro familiar e Jhonatan como contato de despesa. Nova Transação > Mais opções > Dividir listou ambos; fechei sem confirmar nem salvar. Nenhum dado foi alterado.
- Navegação interna ao vivo de Configurações para Transações atualizou URL/título em aproximadamente 300 ms; a lista completa apareceu na leitura de estado seguinte. Isso é amostra pontual, não benchmark frio controlado.
- Backup live: a interface começou a exportação e confirmou “Os dados incluídos no backup foram exportados”. O evento/caminho do arquivo não ficou disponível no navegador automatizado; não encontrei o nome esperado em Downloads. E2E local novo com Supabase vazio passou e validou nome, JSON parseável, usuário de fixture, 14 chaves de dados e restauração desabilitada. Não consigo afirmar o conteúdo do arquivo exportado em produção.
- Bloqueio OFX: tentativa de abrir `brave://extensions` foi rejeitada pela política de URL do navegador, com instrução explícita para não contornar por outra interface, CDP ou comandos. Permissão não foi alterada, arquivo OFX não foi enviado e nenhum lançamento foi criado. Para retomar, o usuário precisará habilitar manualmente no Brave o acesso a arquivos locais para a extensão Codex; depois testar arquivo sintético, reimportação como duplicata, excluir o registro pela UI e conferir saldo/lista baseline. A autorização para esse fluxo já foi dada.
- Dependências: `npm audit fix` não alterou o lockfile; atualizei explicitamente Vitest e plugins para 4.1.12, reduzindo avisos de 13 para 9. `npm audit --omit=dev` continua em zero. Os 9 restantes vêm do Vite 5/Tailwind 3 e de `braces`; resolver o conjunto exige planejar saltos de major, e a advisory de `braces` ainda não tem patch publicado.
- Pendências técnicas: `db lint` inclui funções antigas que citam relações removidas/inexistentes; verificar SECURITY DEFINER/grants e chamadores antes de qualquer correção. 309 migrations locais/remotas coincidem e o dry-run está up-to-date. Export de backup continua parcial/sem snapshot transacional; restore continua desativado até staging consistente, RPC atômica e teste de rollback/escopo compartilhado.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Progresso heurístico desta auditoria: cerca de **18% ainda falta verificar**; a cobertura não tem denominador fechado. Goal permanece ativo.

## Continuação - 20/10/2026 - CRUD live e correção do aviso de duplicidade

- Teste CRUD de produção: criei, editei e excluí pela interface `ZZ_AUDIT_CRUD_20261020_01`; os saldos retornaram ao baseline. Um segundo registro sintético (`ZZ_AUDIT_CRUD_20261020_02`) também foi removido; validação pós-limpeza confirmou Nubank R$ 3.078,79, consolidado BRL R$ 56.324,47 e `/transacoes` com 16 registros, sem os registros de teste.
- A captura live mostrou que o alerta de duplicidade podia persistir por um frame quando o envio começava. O hook agora retorna `false` imediatamente enquanto `isSubmitting`; teste de regressão confirma o valor síncrono. Vitest focal 1/1, typecheck e Prettier passaram. Publicado `dpl_6x9jQj1q6sRYrXkD2BPVDr3Sg6Eh`, READY; `version.json` live confirma buildTimestamp `1792491997247`.
- Após atualizar a PWA e recarregar `/transacoes`, a lista carregou com 16 registros. Novo create live de R$ 0,02 com descrição única foi salvo e apareceu como 17º; nenhum alerta de duplicidade apareceu no bundle publicado. Excluí o registro pela UI; a lista voltou a 16, toast confirmou remoção, e Contas confirmou Nubank R$ 3.078,79 / consolidado R$ 56.324,47. Houve um fallback vazio transitório no primeiro reload direto, mas navegação subsequente e recarga seguinte carregaram normalmente; benchmark formal da latência fria ainda pendente.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Progresso estimado permanece em aproximadamente **18% ainda por verificar**; a porcentagem é heurística e não um denominador de fluxos fechado.


## Continuação - 19/10/2026 - suíte local e auditoria da policy de notificações

## Continuação - 20/10/2026 - aceite autenticado de família e formulário

- Na aba autenticada existente, “Atualizar Agora” trocou a PWA para o bundle novo; o aviso de atualização desapareceu e `/configuracoes` carregou inteiro.
- Navegação live para `/transacoes`: 16 registros de outubro renderizados e resumo carregado. Importar OFX abriu a lista de cinco contas; ao selecionar Itaú, o seletor de arquivo ficou habilitado. Modal fechado sem escolher arquivo.
- Formulário “Nova Transação” abriu. Com valor e descrição sintéticos apenas em estado local, “Mais opções > Dividir” abriu “Divisão e Pagamento” e listou Fran e Jhonatan; a tela `/familia` confirma Fran no grupo “Membros (1)” e Jhonatan em “Contatos de despesa (1)”. Cancelado sem confirmar divisão e sem salvar. Não houve mutação do banco.
- Ainda falta o upload sintético OFX, por bloqueio da política de navegador na permissão de arquivos; convite real não foi enviado. Próximos passos: aceite funcional OFX quando acesso oficial à permissão estiver disponível, demais CRUDs live sem comunicação/registro persistente, benchmark da rota fria, auditoria completa do escopo backup e revisão histórica das migrations/advisories.
## Continuação - 20/10/2026 - verificação do catálogo Supabase

- Estado atual confirmado read-only com Supabase CLI: `supabase migration list --linked` retorna 309 versões coincidentes, 0 locais somente e 0 remotas somente; `supabase db push --linked --dry-run` responde `upToDate=true`, sem migrations pendentes.
- Consulta ao catálogo remoto confirmou email e hash do PIN sem SELECT para `authenticated`, cinco colunas públicas de profile acessíveis, `get_my_profile_v2` executável, trigger que impede mudar `transactions.user_id` e política de UPDATE limitada ao dono/criador/editor familiar.
- `find_profile_for_family_link_v2` sem EXECUTE para authenticated é intencional: migration posterior `20261018200350_family_email_invites_without_profile_enumeration.sql` revoga esse acesso para eliminar enumeração; não recriar o grant.
- Os dois harnesses foram executados contra o PostgreSQL Supabase, carregando `POSTGRES_URL_NON_POOLING` do `.env.local` apenas na variável temporária `SUPABASE_DB_URL` e usando a CA `D:\Downloads\prod-ca-2021.crt`, sem exibir segredo. `test:db-security`: passou, 19 RPCs, ownership bloqueado com SQLSTATE 42501 e rollback confirmado. `test:db-smoke`: suite completa, 29 checks, zero falhas/skips e `testDataRestored=true`. Isso valida os testes transacionais disponíveis, mas não cobre todos os fluxos UI live nem substitui uma fixture autenticada de edição de transação compartilhada.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
## Continuação - 20/10/2026 - OFX, publicação e limite do aceite ao vivo

- Corrigido o custo quadrático da comparação de duplicatas OFX: registros existentes são indexados por FITID e conteúdo, preservando o fallback por descrição e a comparação de conta/tipo/data/valor. A consulta já cobre todas as datas do extrato, filtra apenas registros vivos e pagina em blocos de 1.000; se a leitura falhar, não importa nada.
- Testes locais focados: 13/13; suíte completa Vitest: 355 passaram, 19 ignorados (61 arquivos passaram, 2 ignorados); `npm run typecheck`, `npm run format:check` e `git diff --check` passaram. Vercel publicou `dpl_8odYgGvYM1QfvDy3rtbvddKG4riR` como READY. `https://meupedemeia.vercel.app/version.json` confirmou buildTimestamp `1792490716440`.
- Aceite live de upload sintético não concluído. O usuário autorizou habilitar temporariamente acesso a arquivos locais, mas a política do navegador bloqueou a navegação para `brave://extensions` e proibiu qualquer alternativa que produza a mesma mudança de permissão. O arquivo sintético não foi enviado e nenhuma linha OFX foi criada. A permissão não foi alterada.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Estimativa heurística: aproximadamente **18% ainda falta verificar**; auditoria geral continua aberta.
## Continuação - 20/10/2026 - saldos, produção e gates da auditoria

- Após a confirmação do usuário, os três itens residuais da Fran foram marcados como quitados. O teste live autenticado identificou e removeu pela interface o lançamento `sallario` criado durante a auditoria; o saldo das contas permaneceu em R$ 3.078,79.
- Aceite live do painel: Fran não aparece mais em “Saldo com a Família”; Jhonatan permanece com R$ 910,38, correspondente à última parcela de novembro informada pelo usuário. A lista de transações também não mostra `sallario`. Nenhum outro lançamento foi removido nesta etapa.
- Corrigida e aplicada no Supabase a migration `20261020002459_secure_notification_creation.sql`. O harness rollback-only passou 14 verificações e deixou zero linhas; testes focados do serviço de notificações passaram 3/3. Migration dry-run está sincronizada.
- Produção Vercel foi atualizada e ficou READY em `https://meupedemeia.vercel.app` (deployment `dpl_3Wsy1Y3kV6ezPz2Qf83God7aN4Nz`). Build e smoke autenticado confirmaram versão publicada; velocidade percebida ainda precisa de benchmark em rotas lentas.
- Verificação local atual: Vitest 352 passaram/19 ignorados (61 arquivos aprovados, 2 ignorados), `npm run typecheck` e `npx vite build` passaram após a atualização compatível do lockfile. O bundle principal ficou em 676,88 kB (199,79 kB gzip); o build avisou sobre API CJS do Vite, token Sentry ausente e divisão mista de `notificationService`. E2E Chromium 20/20, DB security 19 RPCs, DB smoke 29 checks e Trip RLS 112 checks já passaram com rollback nos testes transacionais.
- Ao vivo, recarga direta das rotas Configurações/Simuladores mostrou fallback sem conteúdo textual aos 500 ms e conteúdo completo por volta de 3 s; navegação interna depois do bundle carregado mostrou conteúdo em até 500 ms. Isso separa atraso de cold start de navegação interna; benchmark formal de rede ainda pendente.
- `npm audit` começou com 14 alertas (7 moderate/7 high) e, após `npm audit fix` sem `--force`, reporta 13 (7 moderate/6 high). O restante está no toolchain de desenvolvimento e correção completa requer migrações principais de Vite/Tailwind; não aplicar `--force` sem migrar e validar plugins/build/testes.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Progresso global é estimado em **aprox. 18% ainda por verificar**; não concluir a auditoria enquanto esses itens e a revisão restante de advisories/RPCs estiverem abertos.
- Suíte completa Vitest passou: **349 testes aprovados, 19 ignorados** (60 arquivos aprovados, 2 ignorados). `npm run typecheck`, `npm run test:secrets`, Prettier para 75 arquivos TypeScript alterados e `git diff --check` passaram.
- O primeiro format check encontrou apenas `src/components/layout/AppLayout.tsx`; formatei esse arquivo sem alterar comportamento e a checagem passou.
- Catálogo PostgreSQL live: `notifications` tem RLS ligado, grant INSERT para `authenticated` e policy `Users can create notifications` cujo `WITH CHECK` é apenas `auth.uid() IS NOT NULL`. Uma tentativa sintética de inserir para um UID distinto dentro de transação foi negada com SQLSTATE 42501 e revertida, apesar de `auth.uid()` retornar o UID autenticado simulado. Não é evidência suficiente para concluir exposição nem para alterar a policy; investigar divergência do harness/contexto de execução.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Auditoria global continua ativa, estimativa heurística **cerca de 25% ainda falta verificar**. Restam aceites live de CRUD/OFX, backup/restore integral (mantido desativado até cobertura atômica), resolução dos advisories Supabase pendentes e validação do deploy das correções de frontend.

## Continuação - 19/10/2026 - divergência nos saldos de Fran e Jhonatan

- Reprodução somente leitura no Supabase: Jhonatan tem Airbnb 2/5 (R$ 910,38) e 5/5 (R$ 910,38) sem marcação de quitação; 1/5, 3/5 e 4/5 constam como confirmadas pelo credor. A entrada de 16/10 está vinculada à 3/5, sem vínculo com 2/5.
- Fran tem 29 splits comuns ainda pendentes (R$ 1.566,29), uma parcela Declaton 1/3 pendente (R$ 25,00), e R$ 35,00 de débitos dela ao Wesley; saldo líquido reproduzido: R$ 1.556,29. A fórmula do painel corresponde aos estados atuais, portanto não se deve alterar a soma para mascarar os registros.
- Após confirmação explícita, atualizei somente `settled_by_creditor=true` em 29 splits de Fran (R$ 1.566,29) e no Airbnb 2/5 de Jhonatan (R$ 910,38), usando role `authenticated`, identidade do Wesley, RLS, transação atômica e auditoria normal. 30/30 linhas verificadas; não criei nem apaguei transações.
- Reabri a produção: Jhonatan agora mostra R$ 910,38 (Airbnb 5/5 apenas). Fran agora mostra “Você deve R$ 10,00”, pois ainda há Declaton 1/3 (R$ 25) pendente a favor do Wesley e dois splits de Fran pagos por ela (R$ 35) ainda pendentes do lado do Wesley. Próximo passo: confirmar como tratar esses três itens de Fran; não alterar sem confirmação.

## Continuação - 19/10/2026 - remover código residual do menu "Mais"

- `AppLayout` agora renderiza somente os 11 destinos como links diretos e não contém mais o dropdown condicional "Mais"; removido também o array vazio `secondaryNavItems`. A barra móvel continua usando os mesmos destinos em faixa rolável.
- Verificações locais: Playwright Chromium `e2e/navigation.spec.ts` passou 2/2, ESLint focal passou e `git diff --check` passou. Revisor independente aprovou o diff. O browser de produção aberto já mostrava os 11 links lado a lado, sem botão “Mais”; não houve deploy nesta alteração pequena, pois a versão publicada já apresenta o comportamento solicitado.
- A auditoria geral continua ativa, com cerca de **25% a verificar**. Próximo passo: analisar a policy de INSERT em `notifications` e mapear todos os fluxos legítimos antes de propor correção, sem inserir notificações para terceiros em produção.

## Continuação - 19/10/2026 - reforço do harness RLS de viagens

- Harness `npm run test:trip-rls-policy-split` reforçado com asserts de linha afetada em INSERT/limpeza, tentativas anônimas de UPDATE/DELETE e tentativa owner/editor de mover linha para outra viagem, validando `WITH CHECK`.
- Primeira execução detectou apenas SQL de DELETE inválido no próprio teste (`DELETE` sem `FROM`); corrigido antes de aceitar o resultado. Reexecução contra Supabase passou **100 verificações**, sem falhas; rollback confirmou `testDataRestored=true`.
- Revisor independente encontrou e ajudou a fechar falso verde: o trigger de endpoints também rejeita mudança de viagem. O harness agora verifica exatamente os predicados completos em `pg_policies` (roles, `qual` e `with_check`), incluindo `can_edit_trip_plan(trip_id)` sem condições extras, e confere rollback das duas viagens. Parecer final aprovado sem riscos críticos.
- Reexecução do harness contra Supabase passou **112 verificações**, sem falhas; `testDataRestored=true`. Prettier e ESLint do script passaram. Benchmark de latência continua pendente; não há evidência de ganho de desempenho. Auditoria geral permanece ativa, com estimativa heurística de cerca de **25% a verificar**.
- Inventário live de escopo de backup repetido (somente metadados): 46 tabelas continuam com RLS. As 14 exportadas hoje incluem tabelas financeiras cujas policies permitem leitura familiar; o catálogo também confirma dados por `trip_id`, vínculos a contas/cartões e cascatas. Isso exige definir export/import por propriedade e compartilhamento, com tratamento explícito das dependências, antes de habilitar restore.
- Próximo passo: desenhar o contrato versionado de backup para as 46 tabelas com classificação por proprietário/compartilhamento e dependências FK, então implementar e provar RPC transacional de restauração em banco isolado. Depois benchmark de policies e aceites live de CRUD/OFX.

## Continuação - 19/10/2026 - contrato de backup/restauração v2

- Revisão independente somente de metadados classificou as 46 tabelas: 15 candidatas a estado pessoal, 20 a recursos compartilhados e 11 a preservar, derivar ou excluir. Risco reiterado: excluir raízes `trips` pode apagar `transactions` dos colaboradores por cascata.
- Documento `docs/BACKUP_RESTORE_V2_CONTRACT.md` criado com o escopo inicial, as regras da decisão do usuário de substituir compartilhados, três opções arquiteturais, proposta de staging por partes + RPC final atômica e critérios de aceite. `MASTER_BLUEPRINT.md` registra a decisão em validação. Revisão independente do documento está em andamento.
- Pesquisa oficial Supabase atual confirma uso de funções de banco para operações data-intensive, necessidade de filtrar identidade em `SECURITY DEFINER` e limites de memória/duração das Edge Functions. Não foi feita alteração no Supabase nem export de linhas privadas nesta etapa.
- Próximo passo: incorporar revisão independente, fechar as linhas ainda incertas (`category_keywords`, eventos de liquidação e contribuições compartilhadas), e prototipar snapshot/staging em ambiente isolado. Restore permanece desativado. Auditoria ampla em cerca de **25% a verificar**.

## Continuação - 19/10/2026 - policies RLS de viagens

- A migration `20261019235154_split_trip_view_and_write_policies.sql` separa SELECT de INSERT/UPDATE/DELETE em `trip_bags`, `trip_journal_entries` e `trip_reservation_endpoints`, removendo sobreposição permissiva de SELECT sem alterar os checks de escrita.
- Revisão independente aprovou a equivalência dos papéis. Harness `npm run test:trip-rls-policy-split` passou 76 verificações contra o Supabase: owner/editor leem e escrevem; viewer lê sem escrever; outsider e anon não acessam. Fixtures de usuário/viagem/linhas foram criadas somente em transação e `testDataRestored=true` após rollback.
- Migration aplicada no remoto; `supabase db push --linked --dry-run` confirmou sincronização. Os grants de anon foram comparados antes/depois e permaneceram iguais. As policies agora têm uma única regra SELECT e regras separadas de escrita.
- Não há benchmark de latência com volume representativo; não atribuir ganho de velocidade sem essa medição. A auditoria ampla permanece em cerca de **25% a verificar**.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Continuação - 19/10/2026 - integridade da exportação de backup

- Inventário executado diretamente no PostgreSQL de produção sem ler linhas privadas: 46/46 tabelas públicas com RLS. O relatório identifica colunas candidatas de propriedade, todas as FKs e regras ON DELETE, e policies por papel/comando; script repetível em `npm run audit:backup-scope`.
- Evidência crítica para o contrato: as tabelas de viagem são compartilhadas por `trip_id`; exclusão da viagem apaga por cascata transações, reservas, itinerários, comunidade e membros. Já contas financeiras são de `user_id`; acessos familiares permitem leitura em algumas tabelas, mas não tornam os dados financeiros de terceiros propriedade do usuário que restaura. O restore deve atualizar raízes compartilhadas sem apagar transações financeiras dos colaboradores.
- Corrigido truncamento silencioso de exportações maiores que 1.000 linhas: consultas de tabelas, viagens próprias e dados filhos agora paginam com ordenação estável por `id`; filhos de viagens consultam IDs em lotes de 100.
- Teste novo cobre 1.001 linhas e erros de consulta; testes focados passaram (4/4), suíte Vitest completa passou (349 passaram, 19 ignorados), `typecheck`, Prettier e `git diff --check` passaram. Revisão independente aprovou a correção de paginação.
- Limite conhecido do backup ainda aberto: várias consultas não formam snapshot transacional; alterações concorrentes durante o download podem produzir um arquivo temporalmente inconsistente. A exportação continua parcial (14/46 tabelas) e a restauração permanece desativada até cobertura completa e RPC transacional com rollback comprovado. Nenhuma escrita live foi feita nesta etapa.
- Próximo passo: projetar e implementar export/import versionado com escopo de ownership compartilhado, snapshot consistente, RPC atômica e testes de rollback em banco isolado. Depois concluir aceites live de CRUD por módulo e OFX. Auditoria geral continua ativa; estimativa heurística **cerca de 25% ainda falta verificar**.

## Continuação - 19/10/2026 - navegação móvel direta e suíte E2E completa

- Atendido o pedido de remover também o “Mais” da barra inferior móvel: os 11 destinos ficam diretamente na mesma faixa horizontal rolável; “Nova” continua como ação própria. Adicionei pista de continuidade por degradê enquanto há itens fora da área e descrição acessível para leitores de tela.
- Produção atualizada por pedido anterior do usuário. Deploy Vercel `dpl_A5wmniz4WavJ6MquauhDdXjKFTEp`, `READY`, alias `meupedemeia.vercel.app`; `version.json` live confirma `buildTimestamp=1792452116907`. No navegador autenticado com viewport 390×844, a faixa continha 12 botões (11 destinos + Nova), overflow horizontal 1037/375 px, degradê ativo e nenhum botão “Mais”. Clique em “Simuladores” abriu a página; nenhum dado financeiro foi criado ou alterado. Viewport temporário foi restaurado ao final.
- Revisão independente da alteração móvel: navegação e ação Nova corretas. A observação de rolagem pouco perceptível foi resolvida com degradê dinâmico e texto acessível.
- Testes: suíte Playwright completa **99 passaram, 1 ignorado** em Chromium, Firefox, WebKit, Mobile Chrome e Mobile Safari; rodou com servidor Vite persistente e um worker. A rodada paralela anterior perdeu o servidor local durante WebKit e não foi contada como aceite. Vitest **347 passaram, 19 ignorados**; `typecheck`, ESLint focal, Prettier focal, `git diff --check` e build local/produção passaram. O build mantém warnings conhecidos de Vite CJS, `notificationService` em chunks mistos, ausência de token Sentry e dependências de desenvolvimento reportadas pelo npm.
- Banco: a migration revisada `20261019233500_restrict_anon_default_privileges_public.sql` foi aplicada. O dry-run remoto confirma zero migrations pendentes. Verificado em leitura: defaults de `anon` removidos para tabelas/sequences novas criadas por `postgres` em `public`; defaults de `authenticated` mantidos; grants atuais de `anon` em `error_logs` preservados.
- ACL/RLS live: todas as 46 tabelas públicas têm RLS; nenhuma tabela com escrita efetiva de `anon` está sem RLS; zero funções `SECURITY DEFINER` executáveis por `anon`. O POST de `error_logs` via Data API anônima retornou 201 com `Prefer: return=minimal`; o probe anterior falhava porque pedia retorno/leitura, sem policy SELECT para `anon`. Marcador único de auditoria removido e consulta separada confirmou `remaining=0`. Revisão independente aprovou a migration. Um teste transacional criou tabela/sequence descartáveis e confirmou `anon` sem SELECT/INSERT/USAGE futuro, `error_logs` ainda inserível por `anon` e rollback sem objetos residuais.
- Harnesses PostgreSQL após a migration: certificado oficial baixado de Settings > Database > SSL em `D:\Downloads\prod-ca-2021.crt`, sem segredo no repositório. `test:db-security` passou com TLS estrito, 19 RPCs v2 e probe de ownership bloqueado/rollback garantido; `test:db-smoke` passou 29/29, sem skips, `testDataRestored=true`, cobrindo transferências multi-moeda e reconciliação.
- Backup: inventário live confirmou 46 tabelas; a exportação atual declara 14, algumas sem filtro explícito por proprietário. O restore continua desativado e seu código antigo faz múltiplos DELETE/INSERT por chamadas REST, sem atomicidade. O usuário escolheu incluir também dados compartilhados; dependências de viagens/cartões/família têm cascatas e exigem escopo de ownership e RPC transacional antes de reativar. Não exportei dados pessoais nem executei restauração.
- Próximo passo concreto da auditoria geral: fechar o contrato de propriedade/escopo da exportação e desenhar a RPC transacional de restore sobre as 46 tabelas; depois testar em transação com fixtures sintéticas e rollback. Também faltam aceite live de CRUD por módulo e OFX. Auditoria incompleta; estimativa heurística **cerca de 25% ainda falta verificar**. Não enviar convites nem salvar lançamentos permanentes; remover todo marcador temporário criado para testes.

## Continuação - 19/10/2026 - publicação e validação live

- Ajuste pedido pelo usuário: todos os 11 destinos voltaram a aparecer diretamente lado a lado na navegação do cabeçalho; removi o overflow “Mais”. Em viewports intermediários os itens permanecem em uma única linha, com rolagem horizontal no cabeçalho. Teste Playwright Chromium do cabeçalho em 785 px passou, incluindo navegação pelos destinos. Build/typecheck/formato passaram e deploy Vercel `dpl_7JwrUEERAsk788c4WuwAaHctJEtU` está `READY`. Produção, após limpeza do cache PWA, mostra todos os links diretos e nenhum botão “Mais”.

- A pedido do usuário, publiquei a versão de produção no Vercel. Deploy `dpl_5Kv6fPHHyvjUWgRwMkBJAg67sTAX`, status `READY`, domínio `meupedemeia.vercel.app`; `version.json` confirma `buildTimestamp=1792449872801`. O PWA aberto ainda carregava bundle antigo até acessar `/limpar-cache.html`; após isso, a versão nova carregou.
- Aceite autenticado sem mutações: `/familia` mostrou Fran como membro e Jhonatan como contato ativo. O diálogo de convite abriu sem “Usuário não cadastrado. Os dados ficarão salvos localmente.”; não preenchi nem enviei convite. `/compartilhados` carregou. Nova transação > Mais opções > Dividir abriu seletor normal com Fran e Jhonatan; cancelei os modais sem salvar.
- O primeiro smoke da versão publicada encontrou erros reais de Supabase Realtime: o hook montava callbacks em canais nomeados iguais enquanto desmontagens de rotas/StrictMode ainda limpavam canais prévios. Corrigi `useGlobalRealtime` com escopo único por execução do efeito, rodei Vitest **347/19 ignorados**, typecheck, lint focal, formato e build, e publiquei novamente. Em aba nova autenticada após o segundo deploy, `/familia` abriu sem erros de console. Erros listados na aba anterior têm timestamps anteriores ao deploy (22:40:47) e são logs históricos daquela execução, não falhas novas confirmadas.
- E2E: teste do menu móvel segue sem aceite completo. Rotas autenticadas sem mutação acima passaram manualmente, mas não substituem a rodada Playwright multiprojeto. Gates permanecem: testes de produção no domínio e no banco já confirmam os fluxos indicados; Vitest 347/19 ignorados, typecheck, secret scan, format check, auditoria de dependências de produção (zero alta/crítica alcançável) e build passaram. Avisos existentes: dependências de desenvolvimento, CJS Vite, chunk misto de `notificationService`, Sentry sem token.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Continuação da auditoria - 19/10/2026 - convite por email, divisão e smoke PostgreSQL validado

- Em produção, `/familia` abriu o diálogo com o aviso **“Usuário não cadastrado. Os dados ficarão salvos localmente.”**. Não enviei o convite nem alterei os campos já preenchidos. O bundle live ainda é de 09/10; o código local e a migration `20261018200350` já aceitam registrar convites pelo email normalizado sem verificar/expor se a conta existe. Assim, o defeito visível vem do frontend não publicado, não da migration remota.
- Confirmei que a migration de convites está aplicada remotamente e que as demais migrations continuam alinhadas. A consulta local não encontra mais a busca `find_profile_for_family_link_v2` no caminho de convite.
- Ajustei o formulário de transação conforme pedido: “Dividir” sempre abre o seletor de pessoas, inclusive quando ainda não há pessoas carregadas; removi o painel **Divisão Rápida** do formulário de nova transação. O seletor segue mostrando membros de família e contatos habilitados (`active_in_form=true`). Teste comportamental novo verifica que o botão abre o modal e não exibe a divisão rápida.
- Um defeito no harness de segurança aninhava `BEGIN` e fazia o `ROLLBACK` encerrar a transação externa, invalidando a identidade autenticada simulada. Corrigi o rastreamento de transação. A primeira execução com o harness defeituoso marcou temporariamente `profiles.full_name` da Fran como texto de auditoria; restaurei o valor para `Fran` e uma consulta confirmou marcador zero e perfil restaurado. A repetição correta do `test-database-security.mjs` passou e confirmou bloqueio do probe de ownership; não há vulnerabilidade de update de perfil demonstrada.
- Com o CA oficial obtido em Settings > Database > SSL, o `test:db-security` passou com TLS verificando certificado/hostname. O `test:db-smoke` passou **29 verificações**, sem falhas, com `testDataRestored=true`; transferências BRL/USD, rejeição de destino inválido, pagamento parcial (não havia fixture elegível), cálculos do dashboard e reconciliação de saldos passaram.
- Verificação local após as mudanças: Vitest **347 passaram, 19 ignorados**; `typecheck`, build de produção, ESLint focal e `git diff --check` passaram. Permanecem avisos de chunk/import da `notificationService`, falta de token Sentry e warning de API CJS do Vite; não impediram o build.
- Revisão independente somente por leitura não encontrou bloqueadores nos fluxos de divisão, composição de membros e convite por email. A revisão ressalva que o teste do botão confere a abertura via setter e o SplitModal tem teste separado para Fran/Jhonatan; nenhuma alteração live foi executada pelo revisor.
- **Pendência que mantém o usuário sem ver as correções:** produção serve o bundle de 09/10 e reproduziu tanto telas de família vazias quanto o aviso incorreto do convite. O build local é de 19/10. Nenhuma publicação foi executada; o worktree contém várias alterações acumuladas da auditoria e precisa de um pacote de release revisável/aceito antes do deploy e dos testes live pós-publicação.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Estimativa heurística global: **cerca de 35% ainda falta verificar**. Cobertura nova de banco autenticado com TLS reduz incerteza do backend, mas a interface live continua desatualizada e muitos fluxos live não passaram por CRUD ponta a ponta.

## Continuação da auditoria - 19/10/2026 - família, divisão de despesa e backup

- Reproduzi no site publicado o defeito relatado: ao abrir Nova transação > Mais opções > Dividir, o botão acionou “Divisão Rápida” em vez de abrir a lista de pessoas. A rota /familia mostrava zero membros e contatos apesar dos dados existentes.
- Causa confirmada: o Supabase já nega SELECT de `profiles.email` para `authenticated`, mas o bundle publicado ainda solicita esse campo em consultas de família/cartões/convites. O `useFamily` publicado ignora o erro ao buscar a família do dono e retorna `null`; a interface então omite Fran e Jhonatan e a ação “Dividir” cai no modo rápido. O site publicado continua em `buildTimestamp=1791564459008` (09/10), enquanto o build local atualizado é `1792428448688` (19/10).
- No banco, sob role `authenticated` com RLS, a consulta da família e das relações permitidas retornou uma família e três linhas ativas: Fran como membro, Jhonatan como contato e Wesley como dono. Os dados preservam a classificação informada pelo usuário. O campo `active_in_form` de Jhonatan estava `false`; após autorização explícita do usuário para que as pessoas apareçam no formulário, alterei somente esse contato da família do usuário para `true`. O Supabase confirmou exatamente uma linha atualizada. Fran é incluída pelo fluxo de membro de família sem depender dessa chave.
- Código local: as leituras de perfil usam somente colunas autorizadas; falhas de família/membros agora chegam ao estado de erro e a tela não apresenta listas vazias como sucesso. Falhas apenas de contatos/convites exibem aviso parcial. Convites propagam erros em vez de convertê-los em lista vazia. A montagem de pessoas para divisão ficou coberta por teste: membros da família aparecem, contatos aparecem somente com `active_in_form=true` e ids não se duplicam.
- Corrigi também a exportação do backup: a tabela `accounts` agora é filtrada por `user_id` do usuário, evitando exportar contas compartilhadas de outras pessoas que RLS torna visíveis. Restauração continua desativada até existir catálogo completo e operação atômica.
- Verificação local final: Vitest **346 passaram, 19 ignorados**; typecheck passou; build de produção passou; secret scan passou. ESLint focal passou sem erros, com cinco avisos `no-explicit-any` já existentes em `Family.tsx`. Build ainda reporta chunk de notificação que mistura imports estático/dinâmico e ausência de token Sentry; não impediram a geração do bundle.
- **Limite de produção:** nenhuma alteração de frontend foi publicada nesta etapa. A versão live ainda reproduz o erro; a correção local precisa de publicação autorizada e depois aceite autenticado em `/familia`, `/compartilhados` e no modal “Dividir”, confirmando Fran e Jhonatan. Não marcar a auditoria global como concluída antes dessa validação e dos fluxos de backend ainda listados abaixo.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Estimativa heurística global: **cerca de 40% ainda falta verificar**; execução local e bancos consultados cobrem parte dos fluxos, mas o frontend live ainda não contém as correções e diversas gravações/backend permanecem sem aceite completo.

## Continuação da auditoria - 19/10/2026 - hardening de exclusão de contas

- Corrigida no Supabase a divergência de `public.soft_delete_account(uuid)`: a versão live permitia soft-delete de transações vinculadas sem validar `transactions.user_id`. O catálogo confirmou 9 vínculos ativos entre contas e transações de donos diferentes.
- Migration `20261019161707_harden_soft_delete_account_live.sql` reaplica a lógica segura já presente no projeto: exige usuário autenticado e propriedade da conta, recusa exclusão se houver qualquer transação ativa ou meta vinculada, e arquiva somente a conta do chamador. Revisão independente não encontrou bloqueador.
- Migration aplicada via `npx supabase db push --linked`. Pós-condições live: migration registrada; `anon` sem EXECUTE; `authenticated` com EXECUTE; função `SECURITY DEFINER` contém a guarda de transações. `db push --dry-run` confirmou banco remoto atualizado. Os 9 vínculos cross-owner permanecem intocados, como esperado; a função agora bloqueia a exclusão da conta enquanto existirem.
- `npm run typecheck` e `git diff --check` passaram. Não foi chamada a função destrutiva no banco; verificação live foi de catálogo e contagem agregada.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Estimativa heurística global: **aproximadamente 45% ainda falta verificar**; auditoria não encerrada.

## Continuação da auditoria - 19/10/2026 - inspeção autenticada do Dashboard Supabase

- Sessão autenticada do Dashboard agora acessível no Brave. Projeto `main/PRODUCTION` mostra status Healthy, última migration `harden_soft_delete_account_live`, 18/60 conexões, CPU 4%, disco 4%, RAM 51%; janela do painel: 128 requisições e 89,8% de sucesso. Últimos 60 min: API Gateway 5 avisos 4xx/0 erros 5xx; Postgres 8 eventos em nível de erro.
- Inspecionei logs unificados (119 eventos). O evento `42P01 relation public.audit_logs does not exist` às 12:36:31 foi gerado pela minha consulta read-only de auditoria que referenciou uma tabela ausente; classificar como erro do teste. Outro `42P01 missing FROM-clause entry for table p` às 13:19:07 também veio da consulta de verificação malformada `select p.prosecdef` e é erro meu de ferramenta.
- Há cinco erros `42501 permission denied for table profiles` entre 12:24:03 e 12:24:07 sem query/command preenchidos no log; impacto e origem ainda não identificados. Investigar em separado, relacionando os fluxos que consultam `profiles` e repetir com log/função observável.
- O log também mostra falha `28P01` do login temporário `cli_login_postgres` às 13:06; `db push` posterior concluiu com sucesso e dry-run ficou up-to-date. Houve `08P01 unexpected EOF on standby connection` às 12:46, sem evidência suficiente para atribuir causa.
- Em Authentication > Attack Protection, “Prevent use of leaked passwords” aparece Disabled e o controle de mudança não está disponível nessa tela; há botão “Configure in email provider”. A configuração fica pendente até identificar requisito/plano e o caminho compatível. Não alterei configuração do Auth.
- Visão geral informa “Last backup: No backups”. Validar plano e cobertura de backup. O restore da aplicação continua suspenso porque a exportação não cobre todos os dados compartilhados.
- Próximos passos: rastrear os cinco `42501` em `profiles`; conferir 5 avisos API 4xx por rota; esclarecer a ausência de backup e a disponibilidade da proteção de senhas; continuar fluxos live. Sessão do Dashboard deixada aberta para retomar.
- Estimativa heurística global segue **cerca de 45% ainda falta verificar**.

## Continuação da auditoria - 19/10/2026 - navegação responsiva e teste live

- A autorização do usuário para testar em produção e remover lançamentos sintéticos cobriu um lançamento `ZZ_TESTE_AUDIT_LIVE_1792405089050` de R$ 0,01 em Nubank - Conta Corrente. A exclusão pela interface mostrou “Transação removida!”; consulta ao Supabase confirmou `deleted_at` preenchido e saldo voltou de R$ 3.078,78 para R$ 3.078,79. A linha tombstone ainda existe no banco; purga física aguarda confirmação na ação devido ao aviso de irreversibilidade.
- Acesso direto ao Supabase via CLI vinculado confirmou consulta remota. O Dashboard web continua redirecionando para `sign-in`; solicitei que o usuário entre manualmente em aba aberta para inspeção visual autenticada. Não solicitei senha.
- No build publicado, uma recarga morna de Perfil exibiu a seção em 272 ms e a troca para Categorias em 381 ms; ambas mostraram conteúdo no primeiro snapshot após a ação. Console da aba sem erros/avisos. São amostras de uma sessão aquecida, não benchmark frio nem prova da lentidão reportada em outras páginas.
- Reproduzi falha real de navegação no site publicado em viewport 785 px: o header tem altura de 48 px, mas a navegação ocupava 112 px com links fora da tela (`Contas` em y=-32 px); cliques por link terminaram em `/relatorios` e `/compartilhados`. Corrigi localmente dividindo 3 destinos no cabeçalho e os demais no menu `Mais`; o menu mobile mantém todos os destinos.
- Novo `e2e/navigation.spec.ts` percorre os 3 destinos principais, 8 itens de Mais e 11 destinos do menu móvel; também checa os links principais dentro dos 48 px de header em 785 px. Resultados expandidos: 2/2 em Chromium, Firefox, WebKit e Mobile Chrome; Mobile Safari passou o menu móvel 1/1 e pulou a checagem de cabeçalho desktop por manter viewport de iPhone. Typecheck passou; revisão independente não encontrou regressão.
- Correção de navegação ainda está apenas no worktree e não foi publicada. O teste live continua no build anterior; não alegar correção em produção.
- Próximo passo: concluir confirmação de purga do tombstone; continuar auditoria live/DB e resolver pendência de login manual ao Dashboard. Depois revisar rotas em larguras variadas e os fluxos de backup/importação/escrita autenticada.
- Estimativa heurística global mantida: aproximadamente **45–50% ainda falta verificar**. A cobertura local e algumas rotas live são amplas, mas banco, fluxos completos, release e aceite pós-publicação continuam sem prova integral.
## Continuação da auditoria - 19/10/2026 - regressões de velocidade e funções de banco

- Revalidei a correção local para o carregamento de `Configurações > Perfil`: o conteúdo essencial deixa de aguardar o RPC do perfil e o avatar continua protegido contra gravação antes da leitura. A alteração ainda está somente no worktree; não medi a latência do backend nem publiquei o frontend.
- Suíte atual desta sessão: Vitest **340 passaram, 19 ignorados**; typecheck passou; `test:db-connection` passou **6/6**; Playwright passou **90/90** em Chromium, Firefox, WebKit, Mobile Chrome e Mobile Safari. Os E2E interceptam o Supabase, portanto são cobertura de interface/local, não de backend.
- Estado de migrations revalidado hoje via CLI vinculada: **303 timestamps locais/remotos, 0 local-only, 0 remote-only, 0 divergências**; `db push --linked --dry-run` confirmou `upToDate=true`, nenhuma migration/seed/role pendente. Não executar push adicional sem mudança aprovada.
- No site publicado autenticado, reabri `Configurações > Perfil`: o primeiro estado após reload ainda mostra splash, e o conteúdo completo apareceu após a espera do carregamento; Categorias abriu com 181 no badge, itens presentes e nenhum erro/aviso de console. É observação manual, não benchmark preciso. O perfil de produção ainda exibe “Sem nome”; o fallback local para o nome/email do Auth não está publicado.
- Acesso direto ao Dashboard: a rota `Database Settings` redireciona para `sign-in`; deixei a aba de projeto aberta para autenticação manual. O CLI continua funcionando. `.env.local` tem `POSTGRES_URL_NON_POOLING`/`POSTGRES_URL`, mas os harnesses aceitam `SUPABASE_DB_URL`/`DATABASE_URL`, e falta CA oficial para TLS `verify-full`; por isso o smoke direto PostgreSQL não foi executado. A documentação atual do Supabase requer o CA do Dashboard para verificar CA+hostname ([conexão PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres)).
- Consulta remota somente leitura ao catálogo confirmou que `calculate_balance_between_users`, `settle_balance_between_users`, `confirm_settlement` e `reject_settlement_request` são funções legadas sem chamadas em `src`, Edge Functions ou cron; suas permissões efetivas são somente `postgres` e `service_role`. As duas primeiras referenciam `financial_ledger` removida e as duas últimas `audit_logs` ausente. Não são fluxos públicos ativos.
- O painel administrativo deixa o botão de reset explicitamente desabilitado e informa que a rotina está temporariamente indisponível. O handler antigo ainda lança erro se chamado, mas o fluxo visível não permite alcançá-lo. Não classificar como falha ativa da interface; o reset permanece recurso suspenso.
- Banco remoto: consulta read-only confirmou que as funções de reset estão `SECURITY DEFINER` e executáveis apenas por `postgres`/`service_role`; cron não chama essas funções. As definições referenciam `trip_checklist.user_id`, coluna inexistente (a tabela só tem `trip_id`). Assim, não reativar sem substituir a rotina server-side e testar autorização/rollback em banco isolado.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Estimativa heurística global: **aproximadamente 45–50% ainda falta verificar**. A revisão cobre amplamente testes locais, mas faltam aceites transacionais reais com TLS validado, fluxos CRUD completos e publicação/aceite da versão do frontend.

## Continuação da auditoria - 19/10/2026 - carregamento das Configurações

- Reprodução ao vivo autenticada em `Configurações > Perfil`; a troca de seção chegou a renderizar Perfil, enquanto a captura fornecida mostrava o estado de três skeletons. O código local confirmava que `AccountSettings` ocultava todo o conteúdo até `get_my_profile_v2` resolver.
- Removi o bloqueio da tela de Perfil: nome e e-mail aparecem desde o primeiro render usando perfil quando disponível, senão metadados/e-mail do Auth. O avatar mantém seus controles desativados até o perfil salvo carregar e sincroniza cor/ícone com os valores recebidos para impedir sobrescrita acidental.
- Revisão independente aprovou a alteração. Testes focados: 6/6 passaram (renderização imediata, sincronização/segurança do avatar e hook do perfil). Typecheck e build de produção isolado passaram. Lint focal sem erros, com avisos em AccountSettings e Settings.
- A alteração está apenas no worktree; a página publicada não foi alterada e precisa de publicação para receber a melhoria. A lentidão do RPC em uma sessão fria não foi medida; esta correção remove a espera visual, mas não prova que o backend ficou mais rápido.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Estimativa global mantida: cerca de **50% ainda falta verificar**; esta correção fechou somente o bloqueio visual reproduzido em Perfil.
- Na revisão do backup, encontrei e corrigi o escopo de limpeza de `trip_exchange_purchases`: agora filtra por `trip_id` de viagens próprias, incluindo compras de outros membros nessas viagens e preservando compras de viagens compartilhadas em que o usuário não é dono. Revisão independente confirmou a coerência com os tipos gerados. Restauração atômica permanece pendente; iniciei Docker Desktop, mas `com.docker.service` continuou parado e a engine não abriu, então não foi possível validar uma migration transacional. Nenhuma restauração live foi executada.

## Continuação da auditoria - 18/10/2026 - verificação TLS dos harnesses PostgreSQL

- Segui `equipe-elite-projetos` e `supabase-specialist`. A revisão independente encontrou que `scripts/test-database-security.mjs`, `scripts/test-database-smoke.mjs` e `scripts/generate-database-baseline.mjs` configuravam `rejectUnauthorized: false`. O helper inicial também deixava parâmetros `ssl` da URL substituir a configuração passada ao `pg.Client`.
- Centralizei a configuração em `scripts/lib/verified-db-connection.mjs`: TLS obrigatório, verificação CA/hostname padrão do Node, CA oficial configurável por `SUPABASE_DB_SSL_CA_FILE`/`PGSSLROOTCERT`/`sslrootcert`, remoção dos controles TLS da URL e rejeição de `sslcert`/`sslkey` não suportados. Os três scripts agora usam o helper. Adicionei `test:db-connection` com seis regressões incluindo `ssl=no-verify`, `ssl=0`, `sslmode=disable`, configuração global de TLS fraco e validação do `pg.Client` efetivo.
- `npm run test:db-connection` passou 6/6; secret scan, `node --check` dos scripts e `git diff --check` passaram. Ainda preciso de revisão independente final após o reparo.
- Tentei `test:db-security` com `POSTGRES_URL_NON_POOLING` carregada em variável temporária, sem imprimir credencial. A conexão estrita falhou em `SELF_SIGNED_CERT_IN_CHAIN` antes de executar SQL. A página do Supabase solicitada redirecionou para login e não foi acessada; não tentei entrar. O certificado oficial precisa ser obtido do Dashboard autenticado ou fornecido no caminho indicado por `SUPABASE_DB_SSL_CA_FILE`.
- Correção importante de evidência: os preflights PostgreSQL anteriores desta auditoria usaram validação do certificado desativada. Não há indício de interceptação, mas a autenticação do servidor não foi comprovada; portanto, repetir os harnesses com CA e hostname verificados antes de confiar nos resultados de banco.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Continuação da auditoria - 18/10/2026 - cross-browser e leitura ao vivo

- Segui `equipe-elite-projetos`; revalidei o worktree atual sem desfazer alterações anteriores.
- `npm test -- --run`: 336 testes passaram, 19 ignorados (54 arquivos; 52 passaram e 2 ignorados). `npm run typecheck` e `npm run test:secrets` passaram. `deno test supabase/functions/_shared`: 9/9; `deno fmt --check` cobriu 7 arquivos e passou. `npx playwright test`: 90/90 em Chromium, Firefox, WebKit, Mobile Chrome e Mobile Safari.
- Ao vivo, em leitura e navegação sem submissões, Dashboard, Transações, Contas, Família e Simuladores (Renda Fixa e Poder de Compra) carregaram em sessão autenticada. Na produção, a diferença entre os totais do Dashboard e da lista de Transações continua visível; no simulador IPCA, “Puxar do BCB” aparece desabilitado. Não reconciliei nem alterei lançamentos identificados como testes pelo usuário.
- Consulta somente leitura via `supabase db query --linked` confirmou novamente `INSERT`, `REFERENCES`, `SELECT` e `UPDATE` de `anon` e `authenticated` em 24/24 colunas de `public.profiles`. A migration de hardening não foi aplicada.
- `npm run test:db-security` e `npm run test:db-smoke` não iniciaram porque este processo não tem `SUPABASE_DB_URL` nem `DATABASE_URL`; a consulta CLI vinculada não substitui os testes transacionais. Não tentei contornar TLS nem escrever no banco.
- A auditoria completa segue sem aceite: estimativa heurística de **aproximadamente 80% por verificar**. Passar os testes de interface em 5 perfis de navegador não prova CRUDs, falhas/retries e consistência das RPCs. Próximo passo concreto: restabelecer conexão PostgreSQL validada para executar `test:db-security` e `test:db-smoke` em rollback; depois retomar a reconciliação individual do histórico antes de qualquer release.

## Continuação da auditoria - 18/10/2026 - compatibilidade da ACL de profiles

- Segui `equipe-elite-projetos` e pedi revisão independente somente leitura da migration `20261016154008_harden_profile_private_fields.sql` contra os consumidores atuais do frontend.
- `useUserProfile.ts` lê o próprio perfil por `get_my_profile_v2` e só grava as preferências que estão na lista de UPDATE da migration. `shared_closing_day`, `shared_due_day` e `shared_credit_card_behavior` não são usados pelo código ativo em `src`; aparecem somente nos tipos gerados e migrations legadas. Mantive-os fora da concessão, em favor do menor privilégio.
- Não houve alteração de código ou banco nesta verificação. A busca local não descarta consumidor SQL/RPC fora deste checkout; migration continua não aplicada, sem decisão de release, por causa da divergência do histórico remoto/local.
- A estimativa da auditoria ampla permanece em aproximadamente **80% por verificar** (cerca de 20% coberto), por estimativa de escopo e não por contagem exata de testes. Nenhum lançamento financeiro foi criado, removido ou alterado.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.



## Continuação da auditoria - 18/10/2026 - leitura de ACL de profiles

- Revalidei o histórico remoto com supabase migration list --linked: 333 entradas (289 remotas, 303 locais, 259 coincidentes, 44 só locais e 30 só remotas).
- Supabase db dump --linked não funcionou porque o Docker Desktop não está ativo. A conexão pg direta também falhou ao validar a cadeia TLS (SELF_SIGNED_CERT_IN_CHAIN); não desativei a validação. Consultei os catálogos em modo somente leitura pelo comando db query --linked.
- Estado publicado confirmado: anon e authenticated têm INSERT, REFERENCES, SELECT e UPDATE nas 24 colunas de public.profiles. has_column_privilege confirmou que ambos podem selecionar app_pin_hash; authenticated também pode atualizar id e app_pin_hash e ambos têm TRUNCATE.
- Policies publicadas: Users can view profiles aplica qual id = auth.uid() OR auth.uid() IS NOT NULL (qualquer sessão autenticada pode selecionar todas as linhas); Users can update own profile restringe a linha ao id da sessão, mas a ACL ainda concede atualização de id e app_pin_hash.
- get_my_profile_v2 e find_profile_for_family_link_v2 não aparecem no catálogo publicado. A migration local 20261016154008_harden_profile_private_fields não está registrada no histórico remoto, e os efeitos de segurança permanecem ausentes.
- Nenhuma alteração remota foi executada. A análise semântica confirmou que a próxima correção de segurança necessária deve remover as ACLs amplas e restringir a policy; ainda falta reconciliação de migration history para release segura.

## Continuação da auditoria - 18/10/2026 - smoke autenticado e saldos familiares

- Segui novamente equipe-elite-projetos. No Brave autenticado, naveguei pelas 12 rotas principais e todas renderizaram; isso comprova apenas carregamento das telas, não os CRUDs e fluxos completos.
- No Dashboard publicado, outubro mostra entradas de R$ 2.010,20 e saídas de R$ 11,00. A divergência conhecida de pagamentos de fatura permanece: cálculo esperado em base de caixa R$ 3.937,38, devido a R$ 3.926,38 em pagamentos de fatura não somados pela versão publicada.
- A página Família publicada mostra Fran como única membro ativa; Jhonatan aparece como contato de despesas. A versão publicada (09/10) usa get_current_shared_debts_v2 com intervalo do mês selecionado; a versão local (18/10) soma pendências de vários meses e a alteração local foi corrigida para respeitar sharing_scope. O aceite live desse build corrigido permanece pendente.
- Na tela Compartilhados em ago/2026 foram exibidos Fran: 31 itens em aberto, R$ 1.578,79; Jhonatan: 1 item, R$ 910,38. O seletor foi restaurado para out/2026. São valores daquela competência, não saldo histórico total.
- Indicadores econômicos falharam ao vivo (fetch de CDI/IPCA); correção local agora usa a Edge Function existente, valida resposta e exibe aviso quando entra em fallback. O código da função também ganhou timeout, validação de taxa e CORS restrito. Correção revisada independentemente e validada localmente, ainda não publicada.
- Validação local antes da correção do escopo: suíte Vitest 331 aprovados/19 ignorados; nesta continuação a suíte completa passou com 336 aprovados/19 ignorados e 54 arquivos (52 passaram, 2 ignorados); Deno 9/9; typecheck, build Vite, teste de segredos, Deno check/fmt, ESLint focal e git diff --check passaram. Os avisos de build já existentes (token Sentry ausente, import misto de notificationService e API CJS do Vite) permanecem.
- Não criei ou alterei transações, não apliquei migrations e não publiquei alterações. O histórico Supabase continua divergente (303 migrations locais, 289 remotas, 44 local-only, 30 remote-only; 259 timestamps em comum).
- Estimativa continua em aproximadamente **80% por verificar**. Faltam reconciliação semântica do histórico, release segura, aceite autenticado pós-release e fluxos completos de gravação/erro/rollback em todos os módulos, além da cobertura baixa de branches.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Continuação da auditoria - 18/10/2026 - reconciliação live de migrations

- Segui `equipe-elite-projetos` e preservei o worktree já modificado. Consultei novamente o histórico ligado e refiz `migration fetch` em diretório temporário isolado; a árvore continua com 303 migrations locais, 289 históricas remotas, 44 timestamps apenas locais, 30 apenas remotos e 259 coincidências.
- A revisão independente comparou os candidatos das 30 duplas por nome: nenhum par tem SQL idêntico por SHA-256. Os nomes parecidos não demonstram que os efeitos já estão aplicados. Não rodei `db push`, `migration repair` nem apliquei alterações remotas.
- Decisão técnica mantida: não reconciliar timestamps nem publicar em lote. O próximo passo concreto é comparar SQL e efeitos de catálogo/dados de cada dupla e dos 14 arquivos locais sem par; só então preparar uma sequência de release mínima e repetível.
- Estimativa do objetivo amplo: aproximadamente **80% ainda falta verificar**. A reconciliação continua sendo bloqueio para confirmar as correções de produção; UX autenticada de ponta a ponta, flows de importação/backup, pagamentos e pós-release permanecem fora do aceite completo.
- Nenhum registro financeiro foi criado ou alterado nesta continuação; nenhuma migration foi aplicada. Pendência familiar anterior permanece separada e sem alteração.

## Complemento da sessão - 18/10/2026 - convite de família sem enumeração

- Segui `equipe-elite-projetos`; estado anterior: preflights de segurança e DB passavam em rollback, migrations locais/remotas seguem divergentes e produção mantém falhas de segurança. Não publiquei migration.
- Removi consultas a `find_profile_for_family_link_v2` do diálogo, do convite e da inclusão de contato. Convite familiar agora grava somente `to_email` normalizado e deixa `to_user_id` nulo; a pessoa busca convites pelo próprio e-mail e responde pela RPC. A aceitação mantém o ID oculto na linha do convite. Revoguei a RPC de enumeração no candidato.
- O primeiro teste do fluxo revelou que `handle_family_invitation_change()` tentava notificar `NULL user_id`, quebrando o INSERT. Ajustei o trigger para pular a notificação direta para convites por e-mail e conservar aviso do resultado ao remetente.
- `BOLSO_AUDIT_PREFLIGHT_SECURITY=1 npm run test:db-security`: passou com sete migrations candidatas; testou INSERT sem ID, visibilidade só pelo e-mail do recipient, aceite e manutenção de `to_user_id IS NULL`. Transação externa revertida. A produção continua com grants e RPC expostos porque o candidato não foi aplicado.
- `BOLSO_AUDIT_PREFLIGHT_LOCAL_FIXES=1 npm run test:db-smoke`: 29 checks passaram; câmbio BRL→USD e USD→BRL validado; `testDataRestored:true`. O smoke descobriu colisão de descrição fixa com execuções anteriores; agora os registros sintéticos recebem nomes UUID únicos.
- `npm test -- --run`: 324 passaram, 19 ignorados. E2E isolado Chromium: 17/17; novo teste família: 2/2. Typecheck, lint focal, build local e `git diff --check` passaram. Build tem avisos de chunk/import, API CJS e token Sentry ausente.
- Estimativa do objetivo geral: cerca de **80% ainda falta verificar** (faixa 75–85%). Suites e preflights não comprovam publicação nem CRUD real. Falta reconciliação das migrations, release selecionado, teste autenticado pós-release, cobertura funcional de flows restantes (incluindo pagamento parcial, OFX, backup/restore) e confirmação das vulnerabilidades remanescentes.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Bloqueio pendente: drift histórico (43 local-only, 30 remote-only, 259 coincidentes no snapshot anterior) impede publicar as migrations candidatas com segurança; requer reconciliação explícita antes de alterar produção.
- Avanço desta continuação: estendi `scripts/test-database-smoke.mjs` para validar `pay_credit_card_invoice_atomic` usando conta e compra sintéticas. O fixture anterior retornava fatura vazia porque compra criada após o fechamento era atribuída à competência seguinte; defini fechamento no dia 28 para a data corrente ficar na fatura testada. A verificação real passou: total 100, total stale negado, 3 linhas exatas, retry retorna as mesmas linhas, cada chave aparece uma vez, origem 460 e cartão −60. O rollback confirmou restauração. Smoke agora combina pagamento parcial, câmbio, saldos, Dashboard e job; 29 checks base + asserts comportamentais especializados.
- Próximo passo concreto atualizado: reconciliar os pares local/remote-only do Supabase migration history e determinar lote mínimo de release; depois rodar harnesses na publicação e validar flows autenticados. Nenhuma migration foi aplicada permanentemente nesta sessão.

## Complemento da sessão - 18/10/2026 - preflight de segurança concluído em rollback

- Criei no `scripts/test-database-security.mjs` um modo explícito `BOLSO_AUDIT_PREFLIGHT_SECURITY=1`: aplica seis migrations candidatas dentro de uma transação externa, usa savepoints nos probes individuais e reverte tudo ao final, inclusive quando há falha.
- Resultado live com o modo candidato: **20 RPCs e verificações de ACL/RLS passaram**. O update do proprietário foi bloqueado com SQLSTATE `42501`; os casos de restore cross-user com pai soft-deleted e restore de registro ativo passaram. O teste cross-user prepara o estado apagado dentro do savepoint.
- Após revisão independente, acrescentei probes reais à policy de INSERT de `profiles`: inserir com o próprio ID passa pelo RLS e fica contido em savepoint (com `ON CONFLICT (id) DO NOTHING` para não depender da ausência de perfil); usar ID de outra pessoa precisa falhar com `42501`. Também o harness falha explicitamente se não houver dois usuários-fixture. O preflight candidate voltou a passar com essas provas.
- Query independente após o processo confirmou rollback: `authenticated` continua lendo email de `profiles`, `anon` continua com `TRUNCATE` em `profiles`, o trigger de owner guard não existe; o cron antigo continua ativo e o cron privado candidato não existe. Nenhuma mudança permanente no banco.
- O harness cobre a migração de shared split pelo caminho v2, que chama o RPC legado alterado. Ainda há risco de enumeração por `find_profile_for_family_link_v2`: a migration atual mantém busca por e-mail/nome e retorna ID/nome a qualquer autenticado. Isso não foi aprovado como solução final e exige redesenhar o convite.
- Progresso da meta continua aproximadamente **80% restante** (75–87,5% pela diferença entre aceitar preflight local/candidato e exigir fluxo autenticado em produção). Auditoria e preflight não são publicação nem aceite geral.
- Próximo passo: construir e testar uma alternativa de convite familiar sem enumeração, depois validar em ambiente autenticado isolado os fluxos de convite/aceite e pagamento parcial da fatura. Manter sem deploy enquanto o mapa de migrations tiver drift.

## Complemento da sessão - 18/10/2026 - preflight DB, regressões de auditoria e findings

- Seguindo `equipe-elite-projetos`, mantive o progresso por 8 frentes ponderadas; ~80% permanece por verificar. As suítes locais e E2E mockadas estão concluídas; as rotas autenticadas foram apenas lidas em sete áreas; dados ao vivo, segurança/RLS, gravações reais e release continuam pendentes.
- `BOLSO_AUDIT_PREFLIGHT_LOCAL_FIXES=1 npm run test:db-smoke` passou as 29 verificações SQL e pós-condições no Supabase com quatro migrations candidatas carregadas dentro da mesma transação: rotina/job de reconciliação, base caixa do Dashboard, pagamento parcial (migration aplicada mas RPC ainda não testada funcionalmente) e transferência cambial. Transferências BRL→USD e USD→BRL foram conferidas por valor, moeda, taxa, contas, tipo, saldo e linhas únicas; conversão incompatível foi recusada sem linha. Uma divergência sintética de R$ 17,19 no saldo foi reparada pela rotina privada. `testDataRestored:true`; todo DDL e escrita foram revertidos. Não se conclui que as correções estão publicadas.
- Reexecução de `test-database-security.mjs` contra baseline publicado voltou a encontrar **39 falhas**. O probe autenticado de alteração do proprietário ainda afetou 1 linha e foi revertido; `restore_transaction` publicado aceitou tanto a tentativa cross-user com fixture soft-deleted quanto restaurar fixture ativa. Portanto a migration local de restore segue candidata, não validada contra harness completo.
- Ajustei o teste de segurança para preparar fixture soft-deleted dentro do rollback antes de testar restauração cross-user. Corrigi também na migration candidata os filtros de restauração de splits e transações espelhadas para limitar a restauração às linhas do usuário proprietário. O preflight completo das seis migrations de segurança passou na sessão seguinte, com rollback confirmado por consulta independente.
- Revisores identificaram risco de enumeração de perfis por `find_profile_for_family_link_v2`: qualquer usuário autenticado consegue testar e-mail/nome e receber ID/nome de outra conta. A interface de convite usa o retorno para decidir convite versus contato; projetar uma alternativa que não revele existência antes de alterar essa RPC.
- O teste automatizado de pagamento parcial do cartão foi iniciado, mas o fixture sintético não entrou no cálculo da fatura (RPC retornou total 0), então removi a tentativa para não deixar smoke instável. Não contar `pay_credit_card_invoice_atomic` como funcionalmente verificado.
- Verificações do harness: `node --check`, Prettier e `git diff --check` passaram após os ajustes. A consulta independente pós-rollback confirmou a restauração do estado publicado para grants de perfil, trigger de ownership e cron de saldo.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Complemento da sessão - 18/10/2026 - harnesses DB ao vivo

- Carreguei temporariamente `POSTGRES_URL_NON_POOLING` de `.env.local` em `SUPABASE_DB_URL` sem imprimir a credencial e rodei os harnesses Node contra o banco conectado. As verificações com escrita usam transação e rollback.
- Na sessão autenticada já aberta no site publicado, conferi visualmente Dashboard, Transações, Contas, Cartões, Relatórios, Orçamentos e Viagens. As rotas carregaram; alterei o mês somente para conferir o refresh e restaurei dezembro. Não criei nem editei registros. Ao voltar para dezembro, a resposta antiga de outubro apareceu por um instante, mas após o fetch os valores de dezembro e estado vazio de atividade foram restaurados; não reproduzi dado stale persistente.
- `npm run test:db-security` reportou **39 falhas** no contrato de segurança. Categorias incluem grants de tabela/defaults excessivos; dados privados e campos de `profiles` acessíveis/editáveis; RPCs de perfil ausentes ou expostas incorretamente; restauração de transação cross-user/ativa; consulta de membership de terceiro; split soft-deleted visível. O probe de update da transação foi revertido; após rollback, o proprietário permaneceu original. Nenhuma correção foi aplicada permanentemente.
- `npm run test:db-smoke` concluiu 29 operações SQL, sem notices `[FAIL]`/`[SKIP]`, e `testDataRestored:true`, mas falhou em 3 pós-condições (saldos corrente/poupança e total do Dashboard em base caixa), 5 verificações de transferência cambial e 3 verificações da rotina/job de reconciliação diária. Conferi as fórmulas do fixture contra `get_account_balance_at_date` e as assinaturas/cálculos da migration cambial local: os asserts correspondem aos contratos pretendidos, e a RPC/job remotos ainda divergem deles. Classificar como defeitos do estado publicado a corrigir; as migrations locais são candidatas ainda não aplicadas.
- As migrations locais de segurança e lógica continuam não aplicadas. A divergência histórica (43 local-only, 30 remote-only e diferenças de conteúdo) impede `db push` ou `migration repair` em lote; preflight e harnesses foram revertidos. Não houve alteração permanente de lançamentos ou saldos.
- Próximo passo: reconciliar migration por migration os fixes locais de saldos, Dashboard, câmbio, job e segurança com o snapshot atual; revisar especificamente o teste de RLS para insert do próprio perfil e a autorização de `get_my_profile_v2`/`find_profile_for_family_link_v2`. Só depois de um plano de aplicação seguro, rerodar `test:db-smoke`/`test:db-security` ao vivo e obter evidência dos fluxos corrigidos. Manter sem deploy em lote enquanto o histórico divergir.

## Complemento da sessão - 18/10/2026 - reconciliação Supabase e privilégio MAINTAIN

- Confirmei o histórico remoto por `supabase migration list --linked`: 259 timestamps coincidentes, 43 apenas locais e 30 apenas remotos. `migration fetch` em checkout isolado recuperou 289 arquivos remotos sem alterar o repo.
- Entre os 259 timestamps coincidentes, 51 arquivos SQL são byte a byte idênticos. Normalizando CRLF e espaços externos, 75 ainda são idênticos e 155 divergem; 29 cópias remotas têm apenas 2 bytes. Os 30 arquivos remotos sem contraparte local têm nomes de mudança correspondentes a 30 migrations locais em timestamps distintos, mas os SQLs também diferem; 13 migrations locais não têm contraparte remota pelo nome. Não é seguro usar `db push` nem `migration repair` em lote.
- `supabase db pull --declarative --linked --schema public` exportou 258 arquivos de esquema para `%TEMP%\bolso-migration-reconcile-20261018`; a resposta declarou `remoteHistoryUpdated:false`. O snapshot confirmou grants PostgreSQL 17 de `MAINTAIN` para `anon` e `authenticated` em tabelas públicas e privilégios padrão para tabelas futuras.
- Corrigi localmente `20261018151952_revoke_unsafe_public_table_privileges.sql` para revogar `MAINTAIN` junto com `TRUNCATE`, `TRIGGER` e `REFERENCES` em relações atuais e privilégios padrão; `scripts/test-database-security.mjs` agora verifica todos os quatro grants globalmente.
- Preflight no Supabase vinculado dentro de `BEGIN/ROLLBACK` passou para todas as relações públicas e defaults. Leitura posterior confirmou rollback: **55 relações públicas** ainda mantêm ao menos um desses privilégios e os grants padrão seguem presentes. Nenhuma mudança permanente ou dado financeiro foi feito.
- `npm run test:db-smoke` e `npm run test:db-security` não iniciaram porque `SUPABASE_DB_URL`/`DATABASE_URL` com senha não estão configuradas; SQL equivalente foi validado pelo CLI vinculado. `node --check`, ESLint, Prettier e `git diff --check` do harness/migration passaram.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Complemento da sessão - 18/10/2026 - auditoria concorrente de transações

- Reproduzi um bug no bloqueio de envios de `useCreateTransaction`: a segunda chamada era rejeitada dentro de `mutationFn`, mas o `onSettled` dela liberava o lock enquanto a primeira ainda persistia; uma terceira chamada podia começar em paralelo.
- Corrigi para adquirir o lock sincronamente em `onMutate` antes do primeiro `await`; só o contexto da mutação proprietária libera o lock em `onSettled`. Falha ao cancelar queries também libera o lock.
- Adicionei regressão que mantém a primeira inserção pendente, tenta duas chamadas concorrentes (ambas rejeitadas sem nova inserção), conclui a primeira e comprova que um envio posterior é aceito. Suíte completa: **324 passaram, 19 ignorados**; typecheck, ESLint, Prettier e `git diff --check` passaram. Build de produção local também passou; avisos existentes: CJS do Vite, import misto de `notificationService`, chunks grandes e sem token Sentry para upload.
- Decisão da equipe para deploy: não aplicar migrations permanentemente enquanto houver divergência no histórico remoto/local. O preflight de segurança continua revertido e a exposição publicada segue pendente; nenhum dado financeiro foi alterado.
- Cobertura V8 atualizada com a nova regressão: statements **39,30%**, branches **34,15%**, funções **37,85%**, linhas **41,33%** (324 testes passaram/19 ignorados). Os fluxos de `TransactionForm` (20,75% linhas), `Transactions.tsx` (5,37%) e serviços de notificação (<1% para alguns módulos) seguem sem cobertura comportamental suficiente; a suíte verde não prova o conjunto completo do produto.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Complemento da sessão - 18/10/2026 - cobertura E2E, acessibilidade e DB ao vivo

- Reforcei testes que antes passavam sem interação quando controles não apareciam: cadastro, criação/cancelamento de conta, atalho de transação para Contas e troca de período dos relatórios agora exigem controles e resultados visíveis.
- O teste de cadastro revelou IDs duplicados em `FormField` ao envolver inputs em `<div>`; a label apontava ao wrapper e o campo ficava com nome acessível só pelo placeholder. Corrigido o clone para não aplicar o ID no wrapper; regressão de acessibilidade adicionada em `accessibility-contracts.test.tsx`.
- Verificação: 5 testes de contrato passaram, typecheck passou, lint/Prettier focais passaram e E2E completo passou **85/85** em Chromium, Firefox, WebKit, Mobile Chrome e Mobile Safari. Build via `npx vite build` passou; avisos atuais incluem API CJS do Vite, import misto de `notificationService`, bundle grande e ausência de token Sentry para upload.
- Smoke SQL estrito no Supabase vinculado passou com contexto authenticated e `BEGIN/ROLLBACK`; falhas antes tratadas como `NOTICE` foram convertidas em exceções no arquivo temporário. Dentro da transação houve 3 contas, 14 transações, 1 viagem, 1 orçamento e 1 meta; pós-rollback, contagens ativas `[TEST]` = 0.
- Consulta de segurança confirmou estado publicado ainda vulnerável: `anon` consegue SELECT em `profiles`; `authenticated` consegue ler `email` e `app_pin_hash`. O preflight da migration local `20261016154008_harden_profile_private_fields.sql` corrigiu todos esses privilégios dentro de rollback e manteve os acessos necessários; consulta posterior confirmou que a migration não foi aplicada permanentemente.
- Inventário dos 56 relations públicos: zero tabelas sem RLS, mas 47 concedem SELECT a `anon`, 37 concedem INSERT a `anon`, 55 concedem DELETE a `authenticated` e 54 concedem TRUNCATE a `authenticated`. RLS limita operações por linha, mas não protege TRUNCATE. Preflight de `20261018151952_revoke_unsafe_public_table_privileges.sql` confirmou a revogação de TRUNCATE/TRIGGER/REFERENCES dentro de rollback; nenhum privilégio foi alterado permanentemente.
- O teste Playwright de cadastro foi a fonte do defeito de label. E2E segue isolado com autenticação e REST simulados, portanto não substitui sessão autenticada no domínio publicado. Harnesses Node `test:db-smoke`/`test:db-security` continuam sem DSN com senha; smoke SQL foi executado pelo CLI vinculado.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Complemento da sessão - 18/10/2026 - acerto familiar e estornos

- O usuário esclareceu que os lançamentos de Fran/Jhonatan mencionados eram dados de teste. Saldos e splits desses registros ficam fora da auditoria funcional; nenhuma alteração financeira foi feita com base neles.
- Bug confirmado e corrigido localmente: estornos compartilhados eram gerados como débitos negativos, e o saldo `créditos - débitos` aumentava o valor a receber. Corrigi estorno para usar valor positivo e inverter o tipo do item (crédito/débito) nos caminhos com splits, despesas pagas por terceiros e registros `domain=SHARED` sem split.
- Teste de regressão cobre o saldo líquido 100 - 20 = 80 para credor e devedor. O teste Airbnb também reflete a confirmação informada: só 5/5 fica pendente depois que o status de 2/5 for reconciliado.
- Próximo passo: manter foco nos fluxos funcionais; não retomar reconciliação desses dados de teste.

## Complemento da sessão - 18/10/2026 - auditoria funcional ao vivo

- Suíte unitária: 322 aprovados e 19 ignorados; typecheck, lint focal e build passaram. Build local não confirma publicação.
- E2E isolado: 85/85 em Chromium, Firefox, WebKit, Mobile Chrome e Mobile Safari. O limite padrão de workers foi reduzido para 2 após falhas por concorrência com 8; script `test:e2e` adicionado. Cobertura continua restrita aos fluxos implementados nos 17 testes por projeto, com autenticação/API simuladas.
- Smoke SQL executado no projeto Supabase vinculado em transação revertida: 3 contas, 14 transações, 1 viagem, 1 orçamento e 1 meta existiram dentro da transação. Consulta posterior encontrou zero registros `[TEST]` ativos nessas tabelas. O CLI suprimiu `NOTICE` dos asserts internos, então isso comprova execução e rollback, mas não todos os resultados individuais dos asserts.
- `npm run test:secrets` passou. Não havia DSN configurada para rodar os scripts `test:db-smoke`/`test:db-security` com o driver `pg`; o smoke SQL via CLI não substitui esses harnesses nem valida RLS de ponta a ponta.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Complemento da sessão - 18/10/2026 - segurança do reset administrativo

- Consulta somente leitura ao esquema de produção confirmou `admin_users(user_id, granted_at, granted_by)` e incompatibilidades concretas nas rotinas de reset: tabelas/colunas antigas (`trip_participants`, `trip_checklist.user_id`, `trip_itinerary.user_id`, `trip_invitations.from_user_id/to_user_id`). O hook do frontend também sempre lançava erro por ausência de Edge Function.
- A purga do painel usava `accounts.deleted`, removido do esquema. FKs atuais incluem `transactions.account_id ON DELETE RESTRICT`, então trocar apenas o filtro por `deleted_at` não tornaria o delete direto seguro.
- Desativei os botões de reset individual, reset geral e purga no painel e adicionei explicação visível. Não executei nenhuma operação destrutiva e não alterei banco/migrations.
- Verificações: `npm run typecheck` passou; `npx eslint src/components/settings/AdminResetPanel.tsx` e `git diff --check` passaram. Prettier foi aplicado ao componente. Não há teste unitário próprio para `AdminResetPanel`; tentativa de executar esse caminho confirmou que o arquivo de teste não existe.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Complemento da sessão - 18/10/2026 - transferência entre moedas

- O lint e a leitura do fluxo ativo mostraram que `useTransfer` chama `transfer_between_accounts` para câmbio, mas a função publicada ignorava `p_exchange_rate` e criava duas linhas independentes (`EXPENSE` em BRL e `INCOME` em moeda estrangeira), sem taxa nem destino de moeda. Reproduzido em produção dentro de rollback: BRL 100 → USD 80 deixou saldo correto nos dois lados, mas produziu as duas categorias de linha e não persistiu a taxa.
- Migration local `20261018165341_fix_cross_currency_account_transfers.sql` troca o par de linhas por uma transação `TRANSFER` com `destination_amount`, `destination_currency` e `exchange_rate`; valida contas, saldo, taxa e conversão. O hook foi alinhado em comentário e `scripts/test-database-smoke.mjs` agora exercita ida/volta, valor incompatível, saldo e taxa.
- Preflight remoto em `BEGIN/ROLLBACK`, junto das migrations que corrigem cálculo de saldo, passou: R$ 100 → US$ 80 e US$ 40 → R$ 50 a 1,25 geraram duas linhas `TRANSFER`, taxa persistida, saldo final R$ 950/US$ 40; valor convertido errado foi rejeitado sem linha. Nenhum `INCOME`/`EXPENSE` foi criado pelo câmbio. Pós-rollback, zero fixtures desse fluxo. Produção ainda mantém o comportamento anterior até as migrations/frontend serem publicados.
- Rechecagem de limpeza também encontrou 3 contas antigas `ZZ_TESTE` ainda ativas, criadas em 03/10, saldo zero, sem transações ativas e 11 transações soft-deleted. Não foram criadas nesta sessão e ficaram intactas.
- Confirmei que o aviso do `db lint` sobre `_sdt_targets` é falso positivo: `soft_delete_transaction` criou a tabela temporária, marcou 1 transação sintética como apagada com `authenticated`, e o `ROLLBACK` restaurou o banco; a consulta geral continuou com zero `ZZ_TESTE` ativo.
- Typecheck, ESLint focal, Prettier focal, `node --check scripts/test-database-smoke.mjs`, `git diff --check` e a suíte completa (321 aprovados, 19 ignorados) passaram. O smoke DB depende de DSN com senha e não foi executado pelo driver `pg` neste ambiente.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Complemento da sessão - 18/10/2026 - criação de conta e lint do banco

- `supabase db lint --linked --schema public --level warning --fail-on none` revelou função legacy com coluna `transactions.category` removida e cleanup apontando para `public.pending_operations` inexistente. O RPC antigo de abertura (`create_account_with_initial_deposit`) ainda é executável por `authenticated` e foi reproduzido em produção dentro de rollback: retornou `success:false` com `column "category" ... does not exist`. O frontend atual usa `create_account_with_balance`, então a falha legacy não veio da tela ativa.
- O RPC ativo `create_account_with_balance` foi testado ao vivo: BRL criou uma linha de saldo inicial no valor esperado; conta internacional USD criou saldo e transação em USD. Uma combinação inválida USD/nacional foi normalizada para BRL na migration de teste, alinhada ao formulário que força BRL em conta nacional.
- Criada localmente `20261018164511_repair_legacy_account_creation_rpc_and_remove_orphan_cleanup.sql`: corrige a normalização de moeda no RPC ativo, mantém o RPC legacy como wrapper para o fluxo atômico, restringe grants do wrapper e remove o cleanup órfão sem caller ou cron. Preflight da migration passou para BRL, USD, entrada inválida e wrapper legacy; `ROLLBACK` posterior confirmou zero contas sintéticas e que as funções publicadas continuaram no estado antigo.
- `npm test -- --run` passou novamente: 49 arquivos, 321 testes aprovados, 19 ignorados; typecheck, Prettier focal e `git diff --check` passaram. A migration não foi publicada.
- O lint do banco ainda indica outras referências antigas a `financial_ledger`, `audit_logs` e tabelas/colunas de viagens/reset. Próximo passo: cruzar cada uma com grants, jobs e chamadores reais para decidir se corrigir ou remover sem quebrar uma função ativa. A contagem atual linked é 259 correspondentes, 43 local-only e 30 remote-only.
- A leitura do Admin Panel também mostrou reset de usuário/todos sempre falhando por falta da Edge Function que o próprio hook exige, além de purge de contas filtrando a coluna obsoleta `deleted` em vez de `deleted_at`. Não executei essas operações destrutivas. Próxima trilha após classificar os RPCs: definir endpoints server-side com autorização de admin e testar só em rollback.

## Complemento da sessão - 18/10/2026 - rechecagem live de rotas, segurança e drift

- Reabri o site publicado sem sessão. `/auth` e `/privacidade` carregam; `/reset-password` sem token volta a `/auth` com aviso de sessão expirada; rotas privadas testadas redirecionam a `/auth`. `/dashboard` retorna 404, mas não está declarada em `src/App.tsx`; o Dashboard usa `/`, então não é defeito de rota.
- A página de privacidade publicada afirma isolamento completo por RLS, em conflito com permissões de `profiles` e takeover de `transactions.user_id` já reproduzidos na auditoria. Atualizei o texto localmente para não prometer isolamento completo; o site publicado mantém o texto anterior até release.
- Reconsulta read-only em produção confirmou que `daily-balance-reconciliation` continua ativo com `SELECT public.recalculate_all_balances()`, mas não existe overload sem argumentos; suas 106/106 execuções seguem falhas. Também confirmou privilégios `SELECT` e `TRUNCATE` para `authenticated` em `profiles` e que `get_credit_card_invoice` publicado ainda contém `LIMIT 200`.
- `supabase migration list --linked` atual: 259 correspondentes, 41 local-only e 30 remote-only. O conteúdo/histórico segue divergente; não aplicar migrations em lote. A suíte completa local permanece em 321 aprovados e 19 ignorados; `npm run typecheck`, ESLint e Prettier focais passaram. Nenhum acesso autenticado, email de recuperação ou mutação financeira foi feito nesta rechecagem.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Complemento da sessão - 18/10/2026 - rotas públicas e política de privacidade

- Site publicado aberto ao vivo sem sessão: `/auth` renderiza login; as rotas protegidas testadas redirecionam para `/auth`; `/privacidade` abre e renderiza o conteúdo. `/reset-password` sem token mostra “Sessão expirada ou inválida. Solicite um novo link.”, comportamento esperado sem enviar email.
- Uma tentativa de abrir `/dashboard` retornou 404; conferi `src/App.tsx` e o Dashboard usa `/`, então `/dashboard` não é rota canônica e não foi tratado como defeito. O acesso anônimo à raiz vai para `/auth`.
- Encontrada divergência importante na política publicada: ela prometia que RLS garantia acesso de cada usuário apenas aos próprios dados, enquanto a auditoria já reproduziu ACLs amplas de `profiles` e alteração de proprietário de transação em produção. O texto local foi ajustado para mencionar HTTPS, permissões da conta e compartilhamentos por recurso, sem afirmar isolamento completo. Ainda não publicado.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Complemento da sessão - 18/10/2026 - pagamento parcial de fatura

- Reproduzido no banco de produção dentro de `BEGIN/ROLLBACK`: ao pagar R$ 60 de uma fatura sintética de R$ 100, a RPC publicada permitia que os dois self-transfers de saldo rotativo reduzissem o saldo do cartão; também atribuía o carryover à competência de outubro, e a consulta da fatura truncava linhas após 200. Resultado observado antes do rollback: saldo do cartão variava −R$ 120 quando deveria variar −R$ 40.
- Preparada localmente a migration `20261018162737_fix_atomic_credit_card_partial_payment.sql` e substituída no hook a sequência de até três mutações por uma RPC idempotente e transacional. A correção também ajusta self-transfers/saldo em moeda de destino e remove o limite de 200 itens da fatura. Nenhuma migration foi aplicada permanentemente.
- Preflight comportamental da migration em produção passou e foi revertido: pagamento parcial criou 3 linhas; repetição não duplicou; saldo do cartão variou −R$ 40, fonte −R$ 60; fatura anterior ficou em zero e o carryover foi para 01/11. Uma falha injetada no lançamento final deixou 0 linhas e saldos inalterados. Pós-rollback: 0 fixtures, gatilho de falha ausente e RPC publicada ainda mantém o estado antigo (`LIMIT 200`).
- Validação local: 7 testes focados passaram, typecheck, ESLint focal e Prettier passaram; `npm run build` terminou. Avisos de build: API CJS do Vite, chunk misto da notificationService e token Sentry ausente.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Complemento da sessão - 18/10/2026 - confirmação familiar e limpeza

- O usuário confirmou que Airbnb 2/5 do Jhonatan (R$ 910,38, 01/08/2026) foi recebida. A leitura live confirma o split ainda aberto, sem confirmação do credor e sem transação vinculada. Existem duas entradas de R$ 910,38 em outubro; não se deve associar nenhuma sem a data/conta informadas, pois o fluxo publicado de acerto exige esses dados e cria entrada de renda. Nenhuma alteração financeira foi feita. Próximo passo: confirmar se o recebimento é uma das entradas de 09/10 ou 16/10, ou pedir a data e a conta corretas.
- Na tela publicada `/compartilhados`, agosto mostra Jhonatan com 1 pendência de R$ 910,38 (2/5) e Fran com 31 itens somando R$ 1.578,79. Consulta de base já conferida no banco: Fran tem R$ 1.591,29 em créditos abertos e R$ 35,00 em débitos, líquido R$ 1.556,29; o valor anterior de R$ 1.575,54 não corresponde ao saldo atual. O site publicado continua filtrado por mês; consolidação all-time do cartão foi corrigida só localmente e ainda não publicada.
- Após autorização do usuário, os 7 lançamentos antigos `ZZ_TESTE` estão excluídos da lista ativa via soft-delete: consulta read-only confirmou 0 ativos e 14 históricos com `deleted_at`. Não houve hard-delete nem lançamento de teste novo nesta continuação.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Complemento da sessão - 18/10/2026 - saídas em regime de caixa no Dashboard

- Reproduzido em produção para out/2026, como Wesley: a RPC do Dashboard retorna R$ 11,00. A página de Transações lista R$ 128,32 de despesas; R$ 117,32 são duas compras no cartão e essa diferença é intencional pelo contrato cash-basis existente (`20260701000011_dashboard_cash_basis_credit_card.sql`). Não é correto somar essas compras ao Dashboard antes do pagamento da fatura.
- Bug confirmado: a RPC publicada também exclui todos os `TRANSFER`, inclusive pagamento efetivo de fatura. Três transferências da conta corrente para o cartão em 09/10 somam R$ 3.926,38 e têm competências em julho, agosto e setembro. Como o Dashboard usa competência para despesas normais, o filtro atual omite os pagamentos feitos em outubro. A saída cash-basis correta de outubro é R$ 3.937,38 (R$ 11,00 + pagamentos de R$ 3.926,38).
- Migration local `20261018160328_fix_dashboard_cash_basis_credit_card_payments.sql` foi ajustada para manter compras de cartão excluídas e incluir apenas transferências de conta não-cartão para conta cartão, usando a data real do pagamento. A assertion no smoke foi trocada para validar o contrato cash-basis contra uma soma SQL independente.
- Preflight remoto com a migration e um pagamento sintético de R$ 1,00 passou em `BEGIN/ROLLBACK`: a RPC corrigida retornou R$ 3.938,38, incluindo R$ 3.927,38 em pagamentos de fatura (R$ 3.926,38 já existentes + R$ 1,00 sintético) e R$ 11,00 de outras saídas. Após rollback, a RPC publicada voltou a R$ 11,00 e a consulta confirmou zero fixture sintético persistido. Uma tentativa anterior do preflight falhou por data de competência fora do primeiro dia do mês; rollback confirmou zero linhas persistidas.
- O teste automatizado do DB smoke ainda não foi executado via `pg`, pois `SUPABASE_DB_URL` e `DATABASE_URL` não existem no ambiente. `node --check scripts/test-database-smoke.mjs`, Prettier do script e `git diff --check` passaram; a regra foi exercitada diretamente com a RPC em produção e rollback.
- O risco do fluxo de pagamento parcial descrito no handoff foi reproduzido e corrigido localmente na migration `20261018162737_fix_atomic_credit_card_partial_payment.sql`, com RPC única/idempotente, e no hook `useCreditCardsDashboard.ts`. O preflight transacional comprovou rollback integral quando o terceiro insert falha. A correção ainda não está publicada; ver o complemento desta sessão acima.
- Migrations ligadas: 259 coincidentes, 40 só locais e 30 só remotas; dez migrations locais únicas aguardam reconciliação/release.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Complemento da sessão - 18/10/2026 - recálculo de saldo e cron

- Reaberta a divergência do cartão familiar no app publicado. `https://meupedemeia.vercel.app/version.json` respondeu HTTP 200 com buildTimestamp `1791564459008` (09/10/2026 16:47:39 UTC); o build local validado tem timestamp `1792339153547` (18/10/2026 15:59:13 UTC). O frontend local corrigido ainda não está publicado, portanto o resultado local não comprova correção no site ao vivo.
- Consulta read-only de `get_current_shared_debts_v2()` como o usuário da sessão Wesley (transação revertida) retornou Fran R$ 1.556,29 líquidos (R$ 1.591,29 créditos menos R$ 35,00 débitos) e Jhonatan R$ 1.820,76. Os splits do Airbnb estão em 2/5 e 5/5 abertos; 1/5, 3/5 e 4/5 confirmados pelo credor. Após registrar o recebimento confirmado de 2/5 pelo fluxo autenticado, o saldo esperado de Jhonatan será R$ 910,38. Não foi criada transação nem alterado split.
- Testes locais focados de `FamilyBalancePanel` e `generateInvoices`: 2 arquivos, 4 testes aprovados. Eles cobrem saldo consolidado entre meses e exclusão de parcelas marcadas como recebidas; não validam o bundle publicado nem a atualização do split ao vivo.
- Revalidação ampla local: `npm test -- --run` passou (49 arquivos, 318 testes; 2 arquivos/19 testes ignorados), `npm run typecheck`, ESLint focado, `npm run test:secrets` e `npm run build` passaram. `npm run format:check` global falha em 130 arquivos; os quatro arquivos do cartão/cálculos familiares passam no Prettier focado. O build emite avisos de API CJS do Vite, chunk da notificationService e token Sentry ausente, mas termina com sucesso.
- Consulta de limpeza ao vivo: 0 `ZZ_TESTE` ativos e 14 com `deleted_at`; nenhum lançamento foi criado por estas verificações desta sessão.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

- Consulta read-only em produção confirmou que `daily-balance-reconciliation` está ativo com comando `SELECT public.recalculate_all_balances()`; porém só existe `recalculate_all_balances(uuid)`, que exige JWT. O histórico do job contém **106/106 execuções falhas**, de 05/07/2026 a 18/10/2026, todas pelo overload sem argumentos inexistente.
- A RPC autenticada `recalculate_all_balances(uuid)` delega em `calculate_single_account_balance(uuid)`, que soma transações futuras e ignora `accounts.initial_balance`/a filtragem de `payer_id`. Isso diverge do contrato canônico `get_account_balance_at_date(account_id, CURRENT_DATE)`. Uma conta de cartão tem 7 transações futuras; seu saldo gravado (−R$ 117,32) coincide com o cálculo datado. Um recálculo all-time indevido deslocaria o valor para −R$ 238,56.
- Estado atual: 13 contas ativas, 0 com divergência contra `get_account_balance_at_date` e 0 linhas `[TEST]` ativas. Nenhuma alteração persistente ocorreu.
- Migration local `20261018153835_fix_daily_balance_reconciliation_job.sql` corrige `calculate_single_account_balance` delegando para `recalculate_account_balance` (que preserva saldo inicial, data atual e payer), cria um worker global em `private` sem execução por roles da API, e substitui o job via `cron.unschedule/schedule`. O worker só chama o recálculo canônico em contas com drift.
- Preflight do migration, do RPC autenticado de usuário e do worker privado passou em transação e rollback; verificação posterior confirmou o job antigo e `private.recalculate_all_account_balances()` ausente, provando que nada persistiu. O saldo do cartão segue −R$ 117,32.
- Corrigido feedback falso nos hooks `useAccountManagement`/`useAdminActions`: `recalculate_all_balances` retorna `void`, portanto a UI não deve reportar “undefined/0 contas atualizadas”. O texto agora só confirma que o recálculo terminou.
- Na revalidação de 18/10 após o fix de pagamento parcial: `npm test -- --run` passou com 49 arquivos, 321 testes aprovados e 19 ignorados (2 arquivos ignorados); typecheck, ESLint focal, Prettier e build passaram. O smoke DB atualizado não conseguiu conectar por faltar senha na URL temporária do pooler (`pg` exige senha string); falhou antes de abrir conexão, sem mutação.
- Migrations remoto/local naquela etapa: 259 correspondentes, 39 local-only e 30 remote-only. As 30 remotas têm contraparte de mesmo nome local sob outro timestamp; as duas sem arquivo foram restauradas localmente a partir do histórico remoto. Nove migrations locais únicas eram correções não publicadas naquele momento. Não aplicar o histórico local em lote.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Complemento da sessão - 18/10/2026 - revisão de perfil e saldo familiar

- Rechecados os contratos de `profiles`: produção concede hoje privilégios de tabela a `anon` e `authenticated`, incluindo `DELETE`, `TRUNCATE` e `TRIGGER` (RLS não protege `TRUNCATE`), além de leitura/escrita de todas as colunas. A migration local agora revoga todos os privilégios e concede apenas SELECT de campos de colaboração, INSERT de `id/email/full_name` e UPDATE de preferências; email/PIN/ID não são atualizáveis diretamente. `get_my_profile_v2()` retorna somente o perfil da sessão e remove `app_pin_hash`.
- `useUserProfile` tenta inserir um perfil quando a RPC retorna `null`, mas a baseline não tem política de INSERT. A migration local agora permite esse fallback só para `id`, `email` e `full_name`, com RLS amarrada ao `auth.uid()`. O harness de segurança verifica campos permitidos e operações destrutivas.
- Preflight remoto read-only antes da correção confirmou os privilégios amplos atuais. A migration e as assertions foram então executadas dentro de `BEGIN`/`ROLLBACK` via Supabase CLI; todas passaram, incluindo grants mínimos, RPCs, política de INSERT e negação de `TRUNCATE`/`DELETE`/`TRIGGER`. Consulta posterior confirmou que a produção foi restaurada sem as alterações transitórias.
- Revisão dos advisors Supabase identificou 54 funções `SECURITY DEFINER` executáveis por `authenticated`, 3 tabelas com políticas permissivas sobrepostas e proteção contra senha vazada desativada. ACLs confirmam que `anon`/`authenticated` não podem criar objetos em `public`; 20 das 54 functions usam `search_path=public` e ainda pedem revisão individual.
- A leitura e reprodução remota de `restore_transaction(uuid)` revelou IDOR: autenticado podia passar o ID de transação alheia e a função restaurava splits/espelhos sem verificar propriedade. Migration local `20261018150622_prevent_cross_user_transaction_restore.sql` valida usuário/dono, exige pai apagado, restaura só splits/espelhos apagados e bloqueia concorrência no pai com `FOR UPDATE`.
- A leitura e reprodução remota de `is_family_member_v2(family_id,user_id)` confirmou enumeração de vínculo: usuário autenticado passou um ID de outro membro e recebeu `true`. A migration `20261018150906_restrict_family_member_probe.sql` agora retorna `false` quando o ID consultado difere de `auth.uid()`; a chamada continua válida para as policies RLS existentes, que passam `auth.uid()`.
- Preflight dessa migration em produção (`BEGIN`/`ROLLBACK`) negou restauração cruzada com `42501` e pai ativo com `55000`; query posterior confirmou que a função publicada não reteve o fix e `anon` não executa a RPC. O harness `test-database-security.mjs` testa ambos os casos em rollback.
- Preflight da migration de vínculo em produção negou a consulta cruzada; uma reprodução read-only anterior retornou `true` no estado publicado. Query posterior ao rollback confirmou que a correção não ficou aplicada. O harness testa agora o caso de enumeração.
- A migration `20261016213450_exclude_deleted_shared_splits.sql` também passou preflight de comportamento em produção: marquei um split compartilhado como removido dentro da transação, chamei a RPC v2 sob `authenticated` e confirmei que o split removido não veio no JSON. `ROLLBACK` e query posterior confirmaram zero splits removidos persistentes. O mesmo caso foi adicionado ao harness de segurança.
- Varredura dos 54 corpos encontrou apenas `is_family_member_v2` sem referência a `auth.uid()`, `private.authenticated_uid()` ou `is_admin()`; ela foi reproduzida/corrigida acima. Os outros corpos têm referências de identidade/admin, mas isso não substitui revisar completamente a lógica de cada um.
- As três tabelas com políticas permissivas sobrepostas (`trip_bags`, `trip_journal_entries`, `trip_reservation_endpoints`) foram lidas: policies de SELECT permitem membros verem e policies ALL permitem editores gerirem. O acesso parece intencional; o advisor alerta custo de avaliação duplicada, sem evidência de leak. Proteção contra senha vazada do Supabase Auth continua desativada.
- A lista de migrations vinculada, recontada em 18/10, contém 259 correspondentes, 39 apenas locais e 30 apenas remotas. Duas migrations que estavam apenas no remoto foram recuperadas em arquivos locais; 30 remotas têm migration local de mesmo nome com timestamp diferente. Docker/Postgres local está indisponível (`dockerDesktopLinuxEngine` ausente); os preflights foram realizados contra produção com rollback explícito.
- `npm test -- --run src/components/dashboard/FamilyBalancePanel.test.tsx src/utils/sharedFinanceCalculations.test.ts src/hooks/useUserProfile.test.tsx`: 3 arquivos, 7 testes passaram. O teste do painel prova o cálculo local mensal com mocks, não reconcilia as linhas financeiras reais da conta.
- Site publicado aberto em `https://meupedemeia.vercel.app/auth`: página de login renderizou com título e campos esperados, sem erros/avisos no console. Navegação autenticada não foi executada; nenhum dado de conta foi enviado.
- A migration de perfil passou preflight remoto transacional; ainda não houve validação em Postgres local. O CLI Supabase via `npx` informou versão 2.121.0.
- Nenhuma alteração financeira foi feita. A confirmação de que Airbnb 2/5 foi recebida veio sem data/conta; não criar lançamento de recebimento nem marcar split por fora do fluxo que mantém o ledger coerente. A solicitação anterior sobre status sem lançamento continua pendente.
- Próximo passo: revisar semanticamente os 53 corpos restantes e decidir se consolida as policies sobrepostas; reconciliar as migrations divergentes antes de preparar publicação coordenada das correções de segurança. Em paralelo, obter data/conta do Airbnb 2/5 ou autorização explícita para marcar apenas o status. Correções de segurança ainda não foram publicadas; OFX e correções financeiras seguem pendentes.

## Complemento da sessão - 18/10/2026 - consolidação do saldo familiar

- Reconsulta read-only em produção confirma que o split Airbnb 2/5 do Jhonatan (R$ 910,38, agosto) segue aberto; 1/5, 3/5 e 4/5 estão confirmados pelo credor; 5/5 (R$ 910,38, novembro) está aberto. Total atualmente aberto no banco para ele: R$ 1.820,76. Após a confirmação de recebimento já dada pelo usuário, apenas 5/5 deve permanecer em aberto. Nenhuma alteração financeira foi feita.
- Fran: consulta de saldos-base vinculada ao usuário mostra 30 créditos abertos somando R$ 1.591,29 e 2 débitos somando R$ 35,00, net atual R$ 1.556,29. O painel informado pelo usuário exibe R$ 1.575,54; a diferença de R$ 19,25 ainda não foi reconciliada com uma sessão autenticada. Não assumir que o valor reportado bate com o banco.
- Corrigido localmente `FamilyBalancePanel`: usa as faturas completas em vez de `getFilteredInvoice`, pois “Saldo com a Família” deve representar o saldo em aberto de todos os meses. O teste usa fixture sintética de meses distintos, parcela recebida já excluída e débito líquido; 4 testes focados, ESLint no componente/teste e `npm run typecheck` passaram. Ainda sem publicação nem validação em navegador autenticado.
- Preflight ACL: `20261018151952_revoke_unsafe_public_table_privileges.sql` remove `TRUNCATE`, `TRIGGER` e `REFERENCES` das tabelas públicas existentes e dos defaults de `postgres`; preflight transacional passou e foi revertido. Defaults de `supabase_admin` permanecem amplos porque o papel de sessão não tem autorização para alterá-los; migration não resolve a criação futura de tabelas por esse papel.
- Consulta autenticada ao RPC de faturas via CLI não funcionou: Management API não preservou o claim de sessão entre os comandos compostos, retornando `Not authenticated`. Portanto, reconciliação do JSON do RPC com a sessão do dono permanece pendente; SQL-base read-only foi consultado diretamente como postgres.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Handoff da sessão - 18/10/2026 - E2E, acessibilidade e limpeza de registros

### Feito nesta sessão

- Corrigido o fixture Playwright: o RPC privado do perfil tem resposta controlada, todo `/rest/v1/**` passa a retornar coleções vazias determinísticas e o onboarding inicial fica dispensado. O JWT falso não é mais enviado ao Supabase. Os testes verificam páginas com dados vazios; não validam consultas reais do usuário nem mutations de backend.
- Atualizados seletores e expectativas E2E que estavam obsoletos em contas, orçamento, simuladores, cartões, Dashboard, metas, compartilhados, transações e viagens. A rodada final passou **85/85**: Chromium 17/17, Firefox 17/17, WebKit 17/17, Mobile Chrome 17/17 e Mobile Safari 17/17. Firefox foi executado após instalar o runtime ausente; os outros quatro projetos passaram na rodada anterior, com o mesmo código.
- Corrigido bug de acessibilidade reproduzido pelo Axe em Mobile Safari: o botão de filtros na tela de Transações escondia o texto visível em viewport móvel e ficava sem nome acessível. `TransactionFilters.tsx` agora anuncia “Mostrar filtros”/“Ocultar filtros” e informa `aria-expanded`. O teste focal em Mobile Safari passou.
- `npm test -- --run`: 49 arquivos passaram, 2 ignorados; 318 testes passaram, 19 ignorados. `npm run typecheck`, `npm run lint -- --quiet` e `npm run build` passaram. Build ainda alerta para importação mista de `notificationService` e API CJS do Vite; não há token Sentry.
- `npm run test:db-smoke`, conectado ao banco de produção: 29 operações, 0 falhas, 0 skips; o harness confirmou rollback e restauração dos dados de teste.
- `npm run test:db-security` repetido em produção: **8 falhas**. `authenticated` ainda lê `profiles.email` e `app_pin_hash`; `anon` lê nomes de perfil; RPCs `get_my_profile_v2` e `find_profile_for_family_link_v2` estão ausentes ou grants inseguros; UPDATE ainda permitiu transferir `transactions.user_id` em 1 linha. O probe ocorreu em transação com `ROLLBACK`; consulta posterior confirmou o dono original restaurado. Esses problemas seguem sem correção publicada.
- Limpeza ao vivo autorizada: sete transações ativas antigas com nomes `ZZ_TESTE` foram revalidadas (03/10/2026, conta/cartão de teste, sem settlements), testadas pelo RPC dentro de transação revertida e então removidas da lista ativa pelo `soft_delete_transaction` do app. Pós-verificação fora do papel `authenticated`: 0 ativas e 7 com `deleted_at`. O valor não é hard-deleted; o fluxo padrão do app é soft delete.
- Os checks RLS/perfil continuam pendentes de correção publicada: migrations locais de privacidade do perfil e imutabilidade do dono ainda não estão aplicadas no remoto. A matriz E2E de 85 casos é smoke de UI com banco mockado e não muda esse estado.

### Financeiro que aguarda informação

- Usuário confirmou que a parcela Airbnb 2/5 do Jhonatan (R$ 910,38, agosto) foi recebida. O split continua sem settlement e sem transação vinculada. Falta data e conta de entrada; perguntei se prefere somente o status sem novo lançamento. Nenhum saldo/registro financeiro foi alterado nesta sessão.
- Fran: confirmar se os 30 créditos abertos de julho foram recebidos. Painel Dashboard/Compartilhados ainda depende de publicação para validar ao vivo.

### Próximo passo concreto

- Ao receber data/conta (ou autorização explícita de somente status), confirmar a Airbnb 2/5 pelo fluxo adequado e verificar split, possível transação vinculada e saldo; não criar outro lançamento sem a data/conta.
- Publicar em conjunto a migration `20261016154008_harden_profile_private_fields.sql` e o frontend dependente; depois executar `npm run test:db-security` e validar perfil, PIN, convite de família, viagens e cartão compartilhado em sessão autenticada.
- Revisar/aplicar a migration `20261016170000_fix_transaction_update_rls.sql` por fluxo coordenado, então confirmar que a tentativa de trocar `transactions.user_id` é negada em produção.
- Revalidar no site publicado o saldo mensal da família, atualizar OFX e próximos fluxos ainda descobertos. Convite real por e-mail e backup/restore permanecem sem teste; nenhum restore foi executado.

### Bloqueios

- Entradas de produção não autorizadas para novas alterações: fluxo de recebimento Airbnb precisa da data e conta, exceto se o usuário confirmar que deseja somente marcar status.
- Corrigir vulnerabilidades de perfil/RLS e correções de Dashboard/OFX na produção depende de publicação coordenada, ainda não executada.

## Handoff da sessão - 16/10/2026 - Auditoria geral ao vivo (continua)

### Onde a auditoria parou

- Doze telas principais já tiveram smoke de renderização ao vivo; isso não cobre todos os fluxos funcionais.
- Revalidação do banco via Management API confirmou em leitura que `authenticated` ainda lê `profiles.email` e `profiles.app_pin_hash`, que `get_my_profile_v2` e `find_profile_for_family_link_v2` não existem no ambiente remoto, e que o gatilho de imutabilidade do dono da transação está ausente. Rodei as duas migrations locais dentro de transação como preflight: as assertions passaram (leitura dos campos privados negada, RPC segura disponível e troca de `user_id` bloqueada); `ROLLBACK` foi executado. Produção segue sem essas correções.
- `supabase migration list --linked`: 257 migrations coincidentes, 35 apenas locais e 32 apenas remotas. A história do banco divergiu; não aplicar pendências em lote sem reconciliar as migrations remotas manuais e as locais.
- Smoke autenticado após aguardar a consulta: `/familia` exibiu Fran como 1 membro e Jhonatan como 1 contato. As respostas de `family_members`, `family_invitations` e `shared_credit_cards` foram HTTP 200. Os primeiros snapshots ainda mostravam placeholders/contagens zeradas enquanto os dados carregavam; depois a página estabilizou corretamente, então não registrar isso como falha de dados.
- `/relatorios` também exibiu dados após carregar. Outubro mostra entradas de R$ 2.004,80 e saídas de R$ 140,32, igual ao resumo da lista de Transações; o RPC do Dashboard retorna entradas de R$ 2.004,80 e saídas de R$ 19,00 porque exclui compras de contas de cartão de crédito. A diferença observada tem suporte na regra SQL atual, então fica como diferença de definição/UX e não como erro confirmado.
- Continuação ao vivo em 16/10: em `/transacoes`, a produção ainda lista 7 lançamentos com descrição `ZZ_TESTE` (valores de R$ 2,00 a R$ 20,00). A exclusão abre aviso de ação irreversível; foi solicitado consentimento específico e nada foi apagado. A instrução anterior para remover lançamentos criados durante os testes permanece válida para novos registros, mas não foi tratada como autorização para purgar esses registros antigos.
- Comparação direta ao vivo, selecionando ago/26 nos dois lugares: o Dashboard publicado lista só Jhonatan por R$ 910,38 e omite Fran; `/compartilhados` lista Fran com R$ 1.578,79 (31 itens pendentes) e Jhonatan com R$ 910,38 (1 item). Isso confirma que o painel publicado não compartilha corretamente os critérios/lista da página Compartilhados; a correção local alinha o cálculo e inclusão por mês, mas ainda não está publicada.
- Revalidação ao vivo desta continuação: no Dashboard publicado em ago/26, Jhonatan continua em R$ 910,38 e Fran continua ausente; `/compartilhados?month=2026-08` confirma Fran R$ 1.578,79 (31 itens) e Jhonatan R$ 910,38 (1 item). A consulta read-only atual calcula Fran em agosto como créditos abertos de R$ 1.591,29 menos débitos abertos de R$ 12,50. Não reproduzi os valores exatos informados pelo usuário (Fran R$ 1.575,54/Jhonatan R$ 2.731,14) na sessão autenticada atual.
- Rechecagem ao vivo do RPC e das linhas-base: Dashboard em nov/26 mostra Jhonatan R$ 910,38, e a composição de novembro contém apenas “Airbnb (5/5)”. No all-time, o banco marca 1/5, 3/5 e 4/5 como confirmados pelo credor; 2/5 e 5/5 permanecem pendentes (duas parcelas de R$ 910,38), totalizando R$ 1.820,76. O usuário informou que apenas 5/5 em novembro não foi paga, então o estado de 2/5 contradiz essa informação e não tem settlement vinculado. O RPC e a soma independente das divisões abertas concordam; a diferença está no estado registrado da parcela, não em erro aritmético do RPC.
- Nesta continuação, os cinco splits Airbnb foram reconsultados diretamente: 1/5, 3/5 e 4/5 têm `settled_by_creditor=true`; 2/5 e 5/5 têm ambos os flags de confirmação falsos e R$ 910,38 cada. Como as transações não têm `account_id`, o Dashboard mensal em ago/26 e nov/26 mostra corretamente um item de R$ 910,38 por mês no estado atual. O total em aberto do banco é R$ 1.820,76; para corresponder ao relato de que só 5/5 falta pagar, o split 2/5 precisaria ser marcado como recebido pelo fluxo normal, sem inventar data ou lançamento bancário.
- Fran: rechecagem por mês e direção confirmou crédito all-time aberto de R$ 1.591,29, débitos abertos de R$ 35,00 e saldo líquido no RPC de R$ 1.556,29. Julho de competência tem 30 créditos de R$ 1.591,29 e 2 débitos de R$ 35,00 abertos; junho tem 37 créditos de R$ 1.078,00 e 6 débitos de R$ 422,00 confirmados; agosto/setembro têm créditos de R$ 25 cada confirmados. O cálculo do RPC bate com as linhas-base.
- Reproduzida divergência entre o Dashboard e `/compartilhados` para Fran: em julho, o Dashboard mostrava R$ 1.556,29 (data de competência), mas a tela compartilhada mostrava só R$ 22,50 a pagar porque as compras no cartão são exibidas no mês da fatura. Em agosto, a lista compartilhada exibe Fran com R$ 1.578,79 a receber (créditos de cartão R$ 1.591,29 menos R$ 12,50 de débito com vencimento em agosto). A tela antiga de R$ 1.575,54 corresponde exatamente ao saldo líquido de R$ 1.556,29 antes do acerto de 16/10: R$ 25,00 creditados a Fran menos R$ 5,75 de débito com outro membro = R$ 19,25. Não há split de R$ 3,25 para Fran; o restante de R$ 3,25 era comparar saldo de competência/all-time com o total da tela de fatura de agosto. A correção local em `FamilyBalancePanel.tsx` usa `useSharedFinances.getFilteredInvoice/getTotals`, a mesma regra de mês/fatura da tela compartilhada, e mantém moedas separadas. O teste do painel cobre Fran R$ 1.578,79 e Jhonatan R$ 910,38 em agosto.
- Jhonatan: novembro mostra a única parcela daquele mês, R$ 910,38, mas no all-time permanecem abertas a parcela 2/5 de agosto e a 5/5 de novembro (R$ 1.820,76). 1/5 está marcada paga. Receitas da aplicação em 09/10 e 16/10 de R$ 910,38 estão ligadas respectivamente aos splits 4/5 e 3/5; o split 2/5 continua sem settlement nem receita vinculada. O dado de agosto precisa de data/conta do recebimento para ser corrigido sem inventar histórico ou duplicar saldo.
- Outra falha defensiva confirmada: `get_shared_invoice_data` no Supabase retornava splits apagados logicamente. Não havia split soft-deleted para Fran/Jhonatan no banco; portanto, não causava os valores vistos agora. Adicionada correção local `20261016213450_exclude_deleted_shared_splits.sql` para excluir splits removidos da busca e resposta, além de filtro frontend. Preflight remoto com transação, split de teste apagado e `ROLLBACK` passou; consulta depois confirmou zero lançamento de teste persistido.
- Verificação local mais recente: suíte completa passou com 49 arquivos e 318 testes aprovados, 2 arquivos/19 testes ignorados; `npm run typecheck`, `npm run lint -- --quiet`, `npm run test:secrets`, ESLint focal, Prettier, `git diff --check` e `npm run build` passaram. O build não mostra mais o aviso CSS provocado pelo token OFX `[-3:BRT]`; ainda avisa que não há token Sentry e que `notificationService` tem import estático e dinâmico, além do aviso da API CJS do Vite.
- Testes adicionais de cálculo nesta continuação: `sharedFinanceCalculations.test.ts` agora prova que splits do cartão com competência em julho aparecem na fatura de agosto e que confirmações do credor excluem as parcelas pagas; a soma aberta das parcelas Airbnb é R$ 1.820,76. Os dois arquivos de teste focalizados passaram (4 testes); a suíte total passou com 318 aprovados/19 ignorados; ESLint e Prettier do arquivo passaram.
- Achado de segurança crítico no Supabase: role `authenticated` ainda pode ler `profiles.email` e `profiles.app_pin_hash`. A migration `20261016154008_harden_profile_private_fields.sql` passou em teste transacional com `ROLLBACK`, mas continua não aplicada. A verificação posterior confirmou que as permissões de produção continuam vulneráveis.
- Achado adicional crítico: política UPDATE de `transactions` permitia mudar `user_id` para outro usuário. Reproduzido ao vivo sob `authenticated`; a transação de teste foi revertida e a propriedade original confirmada. Migration local `20261016170000_fix_transaction_update_rls.sql` ajusta o `WITH CHECK` e adiciona trigger de imutabilidade para alterações feitas diretamente por `authenticated`.
- Preflight transacional da migration de RLS passou: tentativa de trocar proprietário foi negada com `42501`; `ROLLBACK` confirmou que produção ainda não tem o trigger e mantém a política vulnerável. Adicionado caso regressivo em `scripts/test-database-security.mjs`, protegido por `finally`/`ROLLBACK`. Produção tem zero transações vinculadas ativas no momento, por isso edição de parcela compartilhada não pôde ser exercitada com dados existentes.
- Frontend preparado para a migration: perfil próprio via `get_my_profile_v2`, busca restrita via `find_profile_for_family_link_v2`, relações de Família/convites/cartões/viagens sem email alheio, e PIN usando `has_pin`. PinWrapper também fecha o acesso durante carregamento/erro e respeita a exigência do servidor.
- Corrigida localmente a invalidação de cache após saque; teste garante atualização de contas, extrato, transações e Dashboard.
- Bug de transação futura reproduzido ao vivo: “Hotel - rodoviaria (7/12)” de 06/12/2026, R$ 17,32, estava na contagem de transações, mas não aparecia nem em “Lançadas” nem em “Próximas”. Causa: “Próximas” só combinava pendências e previsões recorrentes; parcelas futuras já confirmadas eram omitidas. Correção local inclui essas transações com ação para abrir detalhes; teste de regressão focado passou. Ainda falta validar a UI em produção após publicação.
- Revalidação atual: `npm test -- --maxWorkers=1` passou com 305 testes e 19 skips; `npm run test:secrets` passou; typecheck, lint e build passaram. `npm run test:db-security` inicialmente não encontrou variável no processo; executado com URL do `.env.local`, falhou como esperado porque `authenticated` ainda lê `profiles.email` (a migration não está aplicada). O preflight da migration dentro de transação removeu acesso a email/hash e concedeu RPCs; `ROLLBACK` restaurou exatamente os privilégios anteriores.
- Reexecução nesta continuação: 46 arquivos de teste passaram, 2 foram ignorados; 305 testes passaram e 19 foram ignorados. Typecheck, ESLint, scanner de segredos, Prettier do script/migration e `git diff --check` passaram. `npm run test:db-security` conectado ao PostgreSQL de produção parou na primeira falha conhecida: `profile email is directly readable by authenticated`. O teste novo de imutabilidade está com parâmetros SQL e `ROLLBACK` garantido; sua prova no preflight foi separada porque o script integrado aborta antes nessa falha de perfil.
- Revalidação atual do `npm run test:db-security` com `POSTGRES_URL_NON_POOLING` local: as mesmas 8 falhas permaneceram. Corrigi o harness para não classificar `UPDATE ... rowCount=0` como exploração; o resultado desta vez confirma `unsafe update affected 1 row(s)` sob `authenticated`, seguido de `ROLLBACK` e confirmação de que o dono original foi restaurado. Esse teste confirma exploração real, não um UPDATE filtrado sem alteração.
- Novo preflight transacional das migrations de privacidade e imutabilidade no schema remoto atual: ambas aplicaram dentro de `BEGIN`; email/hash ficaram inacessíveis, RPCs necessárias ficaram concedidas somente a authenticated e transferência do dono foi bloqueada por `42501`. `ROLLBACK` e pós-teste read-only confirmaram que permissões, função e trigger continuam no estado vulnerável original em produção.
- Reexecução atual de `npm run test:db-smoke` após o preflight: 29 operações aprovadas, zero falhas/skips, todas as 16 pós-condições comportamentais passaram e as contagens `[TEST]` antes/depois foram iguais; o rollback foi confirmado.
- Criado `scripts/test-database-smoke.mjs` e comando `npm run test:db-smoke`: executa `20260702140000_test_suite.sql` sem seus limites externos BEGIN/COMMIT, define os claims JWT do usuário que a suíte seleciona, substitui o antigo skip pelo teste real de `get_dashboard_summary_v2`, intercepta NOTICEs, verifica 16 pós-condições funcionais e garante rollback em `finally`. Execução ao vivo: 29 operações sem erro, 0 falhas operacionais ou comportamentais, 0 skips; contagens de contas/transações/viagens/orçamentos/metas `[TEST]` eram 0 antes e depois. Os saldos das contas corrente/poupança reconciliaram com as transações até hoje; lançamentos futuros foram corretamente excluídos do saldo atual. A primeira execução sem JWT havia falhado settlement por falta de `auth.uid()`; com contexto simulado, o fluxo passou.
- Reexecução da suíte nesta continuação: 49 arquivos passaram, 2 arquivos/19 testes ignorados; 316 testes passaram. Typecheck, lint e scanner de segredos também passaram.
- OFX ao vivo: arquivo inválido foi rejeitado com “Nenhuma transação encontrada no arquivo” e nenhum registro foi salvo. Um fixture sintético SGML válido com fechamento corrigido também foi rejeitado em produção com “Erro ao ler arquivo”; o modal foi fechado sem importar. A tela continuou com 21 registros, a consulta pós-teste encontrou zero linhas `ZZ_AUDIT_OFX_PREVIEW`, e o arquivo temporário foi removido. Isso evidencia divergência/defeito no OFX publicado, apesar do parser local corrigido e dos testes locais aprovados; requer publicar a correção e repetir validação da prévia. Não foi feita gravação financeira.
- OFX: reproduzido com fixture o defeito do parser para OFX SGML tradicional (múltiplos lançamentos eram aninhados em uma única transação), corrigido em `src/utils/ofxParser.ts`. Agora converte campos SGML abertos para XML, preserva FITID como string (inclusive números maiores que 2^53), rejeita datas/valores inválidos, compara descrição como fallback quando falta FITID e deduplica itens repetidos dentro do arquivo. O modal deixa de anunciar CSV que não aceitava, e singulariza mensagens. 7 testes do parser + 3 testes de integração do modal passaram; ESLint, typecheck, Prettier e `git diff --check` passaram. A importação real em produção segue sem teste E2E até preparar fixture mínima e verificar limpeza completa do registro.
- Ao vivo em 2026-10-16, produção autenticada: outubro não tem pendência na lista; novembro mostra Jhonatan R$ 910,38; agosto mostra Jhonatan R$ 910,38 e Fran R$ 1.578,79; julho mostra Fran R$ 22,50 a pagar. O Dashboard de julho antes da correção local divergia da tela Compartilhados por usar competência, enquanto a lista usa o mês da fatura de cartão. A tela `/familia` lista Fran como membro e Jhonatan como contato de despesas; a consulta inclui ambos por estarem vinculados a usuários. Nenhum pagamento foi alterado.
- Verificações: suíte completa passou com 303 testes e 19 skips; após o último ajuste do PIN, os 7 testes focados, typecheck, lint, build PWA, `git diff --check` e scanner de segredos passaram. Build ainda avisa sobre token Sentry ausente, import misto de `notificationService` e API CJS do Vite.

### Limpeza de teste ao vivo

- O saque `ZZ_TESTE saque auditoria 09-10` de R$ 0,02 foi excluído pela tela após autorização do usuário. Confirmação read-only no banco: uma linha correspondente com `deleted_at` preenchido (soft delete); o saldo da conta é restaurado pelo fluxo normal da aplicação. Nenhum outro lançamento foi criado nesta continuação.

### Próximo passo concreto

- Resolver a discrepância da Airbnb 2/5: o usuário informou que apenas 5/5 em novembro não foi pago, mas o banco ainda deixa 2/5 em aberto e não há movimentação correspondente. Confirmar conta e data antes de registrar o recebimento. Para Fran, confirmar se as 30 divisões abertas de julho foram recebidas.
- Preparar implantação coordenada do frontend e da migration de perfil; confirmar autorização e o fluxo de publicação antes de alterar produção, porque a migration isolada quebraria consultas de email ainda presentes no app publicado.
- Revisar e publicar a migration `20261016170000_fix_transaction_update_rls.sql` em conjunto com testes regressivos; em seguida executar `npm run test:db-security` numa produção já atualizada e validar a edição de parcela vinculada quando houver fixture legítima.
- Depois da publicação, rerodar `npm run test:db-security` e testar perfil, PIN, convite de família, convites de viagem e cartão compartilhado numa sessão autenticada fresca.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Convite real por e-mail e backup/restore permanecem pendentes; nenhum restore deve ser executado sobre os dados reais sem plano e confirmação específicos.
- Publicar a correção de `UpcomingTransactions` junto com as demais alterações locais e então confirmar no navegador que a parcela de dezembro aparece em “Próximas” e abre o modal de detalhes.

### Bloqueios

- Corrigir a vulnerabilidade em produção requer uma publicação coordenada; a migration não foi aplicada neste turno.
- Acertos financeiros dependem de confirmação dos pagamentos reais; as marcações existentes não comprovam pagamento externo.
- A remoção do saque temporário foi confirmada no banco; nenhum registro de teste financeiro criado nesta sessão continua ativo.

## Handoff da sessão - 03/10/2026 (noite 7) - Compartilhados, ativos, limpeza

### Corrigido e verificado ao vivo

- **Divisão de despesa de conta comum sumia do mês**: `calculateSharedDisplayDate` empurrava para o mês SEGUINTE qualquer despesa de conta que não fosse cartão (R$ 10 do dia 03/10 só aparecia em NOV/26). Agora só cartão desloca para o vencimento da fatura; conta comum fica no mês da competência. Itens antigos de conta corrente passam a aparecer no mês certo (podem "mudar de mês" na tela). Sem teste unitário dessa função.
- Excluir ativo: exclusão LÓGICA (`assets.deleted=true`, transações ligadas saem por `soft_delete_transaction`); a lista de ativos filtra `deleted`. Aporte em meta não oferece mais cartão de crédito. Texto do diálogo de excluir despesa compartilhada corrigido (não é permanente).
- Contato de despesa só com nome (sem e-mail) salva; e-mail inválido bloqueia. Excluir contato pede confirmação. Recuperação `/limpar-cache.html` verificada.
- Compartilhado com divisão testado ao vivo (contato fictício, 50/50): 2 splits corretos, nenhuma notificação enviada, exclusão restaura o saldo.

### Achados / UX

- O diálogo "Dividir" já abre com a pessoa vinculada (Fran, usuário real) pré-selecionada; quem salva sem reparar divide e notifica uma pessoa real. Sugestão: abrir sem ninguém selecionado.
- Avisos de saldo negativo (diálogo "Atenção") exigem "Continuar"; sair da tela sem confirmar descarta a transação sem aviso.

### Limpeza dos dados de teste

- Contato `ZZ_TESTE contato2` excluído; despesa `ZZ_TESTE compartilhada` excluída (lógica). Contas `ZZ_TESTE renomeada`, `ZZ_TESTE B` e cartão `ZZ_TESTE cartao editado` arquivados; exclusão definitiva fica com o usuário.

### Não testado ao vivo

- Convite real por e-mail, importação OFX, backup/restore (restaurar grava em massa nos dados reais).

## Handoff da sessão - 03/10/2026 (noite 6) - Metas, tipos, PWA

### Corrigido e verificado ao vivo

- **Aporte em meta com conta vinculada falhava SEMPRE** (`column "date" is of type date but expression is of type text`): `contribute_to_goal` declarava `v_today`/`v_competence` como TEXT. Migration `20261003210000_fix_contribute_to_goal_date_types.sql` (APLICADA em produção): variáveis DATE e data em America/Sao_Paulo (antes `NOW()` UTC). Verificado: aporte R$ 1,00 debita a conta, data/competência corretas.
- Excluir meta agora apaga os aportes por exclusão LÓGICA (`soft_delete_transaction`); verificado no banco (`deleted_at` preenchido, saldo da conta restaurado). Mesma troca em `useSharedExpensesActions` (excluir despesa compartilhada). Remover item de checklist de viagem pede confirmação.
- **Zero erros de `tsc`** (era 19): interfaces de exportação (`tripExport`, `exportCurrency`) aceitam `null` e sem index signature; `SplitInput` sem index signature; `useTransactionsQuery` tipado. Script `npm run typecheck`. De brinde: exportação de Compartilhados em CSV/PDF sempre mostrava "Sem categoria" (`item.category` é texto, o código lia `.name`).
- **PWA/deploy**: o pré-cache do service worker podia gravar HTML no lugar de JS/CSS durante a janela do deploy (tela "reading 'PrivateAppShell'", persistente até limpar cache). Defesas: `vercel.json` não reescreve `/assets/` nem arquivos com extensão para o index (agora 404), `sw.ts` recusa HTML em asset (runtime) e FALHA a instalação do SW se o pré-cache vier com HTML (`addPlugins`), `ErrorBoundary` recarrega sozinho em erro de chunk. Para testar um deploy neste painel: desregistrar SW e limpar caches.

### UX anotado

- Aporte em meta oferece cartão de crédito ("Azul infinite") como conta de débito.

### Ainda aberto

- Exclusão física: `useAssets.deleteAsset` (assets só tem coluna `deleted`; soft delete exige filtrar todas as leituras de ativos — não validado).
- Não testado ao vivo: Compartilhados com divisão, convite real por e-mail, OFX, backup/restore.

## Handoff da sessão - 03/10/2026 (noite 5) - Transferência, orçamento e família

### Corrigido e verificado ao vivo

- **Transferência pelo botão "Transferir" da conta** gravava uma DESPESA + uma RECEITA comuns (RPC `transfer_between_accounts`), inflando Entradas/Saídas, relatórios e orçamento. `useTransfer` agora cria um único lançamento `TRANSFER` (mesmo caminho do formulário "Transf." e do pagamento de fatura) para transferências na mesma moeda; com câmbio ainda usa a RPC (não testável com segurança). Sem transferências antigas no histórico do usuário.
- **Orçamento contava dívida importada**: migration `20261003200000_budget_ignore_accountless_expenses.sql` (APLICADA em produção) faz `get_user_budgets_progress` ignorar despesas sem conta (`account_id IS NULL`). Só as 5 parcelas "Airbnb (n/5)" (R$ 910,38, Jhonatan deve 100%, dívida importada) tinham conta nula em todo o banco. Orçamento global agora mostra só o gasto real. RISCO CONHECIDO: uma futura "despesa paga por outro" (conta nula) também ficará fora do orçamento; se quiser contar a parte do usuário, precisa de regra por split.
- Extrato rotula transferências como "Transferência" (antes "Outros").
- Contato de despesa: só o nome é obrigatório; e-mail opcional, mas validado quando informado. Excluir contato pede confirmação (`window.confirm`).
- Mensagem de excluir viagem corrigida (é exclusão lógica). Orçamento: modal de confirmar exclusão verificado.

### Ainda aberto

- Checklist de viagem remove item sem confirmação (baixo risco).
- ~19 erros de tipo antigos (exportações/Trips) e exclusão física de transações/ativos (useGoals, useSharedExpensesActions, useAssets).
- Compartilhados com divisão, convite real por e-mail, OFX, backup/restore, meta com aporte: não testados ao vivo.

## Handoff da sessão - 03/10/2026 (noite 4) - Despesa, transferência, fatura, viagens, família

### Corrigido e verificado ao vivo

- **Criar viagem estava quebrado em produção** ("new row violates row-level security policy for table trips"): `INSERT ... RETURNING` falha porque `private.can_view_trip` (STABLE, consulta `public.trips`) não enxerga a linha criada no mesmo comando. `useCreateTrip` agora gera o id no cliente, insere sem RETURNING e lê depois. Tabelas filhas (places, reservations, journal) não sofrem disso. Provável quebra desde a migration de RLS de 26/07.
- "Excluir viagem" no detalhe não abria a confirmação (dialog só existia na lista). Extraído para `deleteTripDialog` e renderizado nos dois ramos.
- Extrato da conta mostrava o dia anterior ("Ontem") por `new Date("YYYY-MM-DD")` (UTC) e saldo negativo sem sinal (`Math.abs`). Corrigido em `AccountDetail`, `AccountStatement`, `Accounts`, `AssetHistoryDialog`.
- Botão "Nova transação" do desktop sumia em Cartões/Família/Viagens/Simuladores/Configurações (estava dentro da barra do seletor de mês). `AppLayout` agora esconde só o seletor.
- Pagar fatura: aceitava valor acima do total e reabria no passo 2 com o valor antigo escondido. Agora bloqueia e reseta ao fechar.

### Fluxos testados ao vivo (itens ZZ_TESTE, todos arquivados/removidos)

- Despesa (aviso de saldo negativo OK), receita, transferência entre contas (bloqueio "Saldo insuficiente" OK), compra no cartão + pagamento da fatura, viagem (criar/editar/checklist/excluir), contato de despesa em Família (criar com e-mail `.invalid`/excluir).
- NÃO testado: Compartilhados com divisão (exige UI de split e geraria dados visíveis a terceiros), convite real por e-mail, importação OFX, backup/restore, metas com aporte.

### UX anotado (não corrigido)

- Excluir contato de Família e excluir item de checklist não pedem confirmação.
- Mensagem de excluir viagem diz "removidos permanentemente", mas é exclusão lógica (`deleted_at`).
- Extrato rotula transferências com categoria "Outros".
- Campo e-mail do contato parece opcional, mas "Salvar Contato" só habilita com e-mail; e-mail inválido não é rejeitado antes de salvar.

### Resíduos no banco do usuário

- Contas "ZZ_TESTE renomeada" e "ZZ_TESTE B" e cartão "ZZ_TESTE cartao editado" arquivados (com transações de teste preservadas). Exclusão permanente fica com o usuário.

## Handoff da sessão - 03/10/2026 (noite 3) - Cartões e Orçamentos

### Corrigido e verificado ao vivo (cartão ZZ_TESTE criado/editado/arquivado)

- "Arquivar Cartão" no menu do DETALHE não fazia nada: `ArchiveConfirmModal` só existia no ramo da lista de `CreditCards.tsx`. Agora existe nos dois, com `handleConfirmArchiveCard` (sem falso "arquivado com sucesso" em erro).
- Editar cartão: o detalhe ficava com o nome/dias antigos até recarregar (cópia em estado). `useCreditCardsDashboard` agora sincroniza `selectedCard` com `accounts`.
- Dias de fechamento/vencimento fora de 1-31 eram ajustados em silêncio pelo banco (45 -> 31, 0 -> 1). Agora há validação com mensagem (criar e editar).
- Botão de opções do cartão sem nome acessível: `aria-label="Opções do cartão"`.
- Orçamentos: exclusão pede confirmação; "Disponível total" mostra negativo em vermelho quando estoura.

### Resíduos no banco do usuário (itens de teste, arquivados)

- Conta "ZZ_TESTE renomeada" e cartão "ZZ_TESTE cartao editado". Exclusão permanente fica com o usuário.

### Ainda não testado ao vivo

- Despesa/transferência (criação), Família, Compartilhados e Viagens com escrita; pagamento de fatura.

## Handoff da sessão - 03/10/2026 (noite 2) - Testes ao vivo em produção (autorizados pelo usuário)

### Resultado dos fluxos (só itens "ZZ_TESTE", sem compartilhado/convite/e-mail)

- Orçamentos: criar, editar (1,00 -> 2,00) e excluir OK; exclusão é imediata, SEM confirmação nem desfazer (sugestão: confirmar/undo).
- Metas: criar, editar e excluir OK (excluir pede confirmação). Valores e "aportar/mês" conferem.
- Contas: criar (banco "Outro"), renomear e arquivar OK; saldo vai a R$ 10,00 ao lançar receita e volta a R$ 0,00 ao excluir (gatilho OK em INSERT e DELETE).
- Transações: criar receita OK; excluir OK (com confirmação). Resumo agora coerente com a lista (R$ 0 de saídas com 0 registros).
- Viagens, Simuladores, Configurações: só leitura; sem erro. Viagens sem estado vazio falso.

### CORRIGIDO E VERIFICADO AO VIVO — editar RECEITA abria com conta vazia (só na 1ª abertura após carregar a página)

- Correções em `useTransactionForm.ts` (guard no efeito do tripId + restauração da conta salva) e `AccountSelector.tsx` (ignora onValueChange vazio). Verificado com build novo: abre com a conta e salva (10,00 -> 25,00).
- ARMADILHA DE TESTE: o service worker serve o shell antigo; para testar um deploy é preciso desregistrar o SW e limpar os caches (senão o retest roda código velho). Usuários reais também podem ficar no build antigo até o SW atualizar; após o deploy apareceu uma vez "Cannot read properties of undefined (reading PrivateAppShell)" até recarregar (sugestão: ErrorBoundary recarregar sozinho em erro de chunk).
- Histórico da investigação (resolvido):
- Reproduzir: criar receita numa conta CHECKING, abrir pela lista > Editar > conta vazia; Salvar falha com "A conta de origem é obrigatória".
- A conta vazia desde o 1º render da edição; `initialData` traz `account_id` (select `*`), payer/trip nulos. Causa NÃO identificada. Aplicada proteção em `useTransactionForm.ts` (efeito do tripId não zera a conta ao editar), mas não é a causa deste caso. Próximo passo: instrumentar `store.setAccountId` (useTransactionStore) com console.trace e abrir a edição de uma receita; checar também o ramo `isPaidByOther`/`membersLoading` e o efeito de `filteredAccounts` (linhas ~496-566).

### DIVERGÊNCIA DE REGRA (banco) — Orçamento conta o valor INTEIRO de despesa compartilhada paga por outro

- `get_user_budgets_progress` (função só no banco) soma `transactions.amount` por competência, sem considerar `payer_id`/splits. As parcelas "Airbnb (n/5)" (SHARED, sem conta, R$ 910,38) entram no orçamento global (consumido R$ 910,38) e NÃO aparecem em Transações/Dashboard/Relatórios.
- Decisão de produto pendente: contar só a parte do usuário (transaction_splits), ou excluir despesas pagas por outros. Requer migration (a função não está nos arquivos de migration).

### Resíduos no banco do usuário

- Conta arquivada "ZZ_TESTE renomeada" (sem transações). A exclusão permanente fica com o usuário.

## Handoff da sessão - 03/10/2026 (noite) - Varredura de bugs

### Corrigido

- Transações: resumo (Entradas/Saídas) somava lançamentos futuros e a lista "Lançadas" não ("0 registros" com Saídas R$ 17,32). Agora a aba Lançadas soma o mesmo conjunto exibido.
- Transações: "hoje" usava `toISOString()` (UTC); após 21h em SP um lançamento de amanhã aparecia como lançado. Agora data local.
- Compartilhados: "Tudo em dia!" / "Nenhum membro ativo" apareciam por ~0,4 s antes dos dados (estado vazio falso). Agora aguardam o carregamento.
- `notificationGenerator`: removida a chamada do cliente a `send-bill-reminders` (sempre falhava: CORS + 401 por exigir CRON_SECRET). O push segue pelo cron.

### Bugs reais corrigidos (varredura de tsc)

- `aiAdvisorService.suggestTripItinerary`: `catch (_e)` usava `e` inexistente; se o Google Places falhasse, estourava ReferenceError em vez de cair no fallback de IA.
- Relatórios: o PDF recebia o total de entradas como nome do arquivo (download com nome numérico) e o CSV saía sem extensão. Agora `relatorio-<visão>.pdf|.csv`.
- `frontendFlows.isValidTripRouteTab`: `Object.hasOwn` quebra em Safari/iOS < 15.4; trocado por `hasOwnProperty`.
- Restam 19 erros de tipo preexistentes (Export*/Trip* aceitam `undefined` mas recebem `null`; `TransactionSplit` x `SplitInput`; `useTransactionsQuery`). Afrouxar os tipos de export gerou erros novos em `tripExport.ts`; fazer junto com o commit das alterações de export que seguem sem commit.

### Auditoria estática (sem leitura de produção) — também corrigido

- Datas UTC que gravavam dado financeiro: ajuste de saldo (`useAccounts.ts`; `competence_date` ia com a data inteira, violando o invariante dia 1), transferência, saque e despesas de viagem (`Trips.tsx`, `competence_date` pulava para o mês seguinte no último dia do mês após 21h). Agora `formatDateISO` (local).
- `useGoals.deleteGoal`: ignorava o erro ao apagar os aportes e marcava a meta como excluída mesmo assim.

### Achados NÃO corrigidos (decisão pendente)

- Mesmo padrão `toISOString().split("T")` ainda em `notificationGenerator.ts` (~15 pontos), `useAssets.ts:55`, `SharedSettleDialog.tsx:323`, `TripJournalTab`, `ExchangePurchaseDialog`, `Reports.tsx:55`.
- Exclusão física (`.delete()`) de transações em `useGoals.ts` e `useSharedExpensesActions.ts:330`, e de `assets` em `useAssets.ts:183`, contra o invariante de soft delete do blueprint. Confirmar no banco se há trigger/RLS antes de migrar.
- ~12 erros de `tsc` preexistentes (Accounts, CreditCards, Reports:118, SharedExpenses:205/207, Trips:388, useTransactionsQuery, useCreateTransaction); o build não roda `tsc`.

### Não testado (bloqueado pelo classificador de permissões ao ler produção)

- Contas, Relatórios, Orçamentos, Metas, Simuladores, Configurações, Viagens e todos os fluxos de criar/editar/excluir. Dashboard x Transações: conferir se Saídas de outubro batem depois da correção.

### Pendências

- Dashboard mostrava Saídas R$ 0,00 no mesmo mês em que Transações mostrava R$ 17,32; reconferir após o deploy.
- Erros de tsc preexistentes: `useCreditCardsDashboard.ts` (384/386) e `useCreateTransaction.ts` (295).

## Handoff da sessão - 03/10/2026 (tarde) - Valores que "pulavam" em Contas e Cartões

### Causa

- `PrivateAppShell` persistia TODO o cache do React Query (24h) no IndexedDB: ao abrir, saldos/faturas antigos apareciam e a rede os trocava segundos depois.
- `CreditCardsList` recebia `isLoading` e ignorava: faturas eram calculadas com `transactions = []` e depois saltavam para o valor real.

### Entrega

- Persistência só de dados sem valor monetário (whitelist `PERSISTED_QUERY_ROOTS`) + `buster` para descartar o cache antigo nos aparelhos.
- `CreditCardsList` mostra skeleton enquanto carrega.

### Pendências

- [x] QA ao vivo em produção (03/10, aberturas a frio): Cartões = esqueleto ~0,5 s e valores finais uma vez; Contas = valores finais uma vez; Dashboard = 4 totais estáveis, blocos de faturas/família entram ~200 ms depois (sem trocar valor).
- BUG NOVO: edge function `send-bill-reminders` bloqueada por CORS (preflight sem Access-Control-Allow-Origin) no console de produção. Investigar `supabase/functions/send-bill-reminders`.
- `tsc` acusa 2 erros em `useCreditCardsDashboard.ts` (384/386, `Transaction[]` x `ExportTransaction[]`) vindos das alterações de export ainda sem commit.
- Efeito colateral aceito: sem rede, saldos não aparecem mais do cache offline.
- S2 (fatura compartilhada em RPC) segue pendente.

## Handoff da sessão - 03/10/2026 - Regra única de fatura do cartão

### Entrega

- Regra decidida: compra no dia do fechamento vai para a próxima fatura (`>=`); mudar o dia de fechamento vale só para frente.
- Migration `20261003150000_card_invoice_single_rule.sql` (trigger com `>=`, trava de competência, parcelas pela âncora da série). **NÃO aplicada no banco.**
- `invoiceUtils`: fim da mistura UTC/local, `>=`, período `10/09 a 09/10`, `closing_date_override` só no mês dele.
- `useAccounts`: removido o recálculo em massa ao mudar `closing_day`.
- `useCreateTransaction`: parcelas = primeira competência + N meses (`addMonthsToCompetence`).
- Testes: `src/lib/invoiceCycle.test.ts`. Lista de revisão de dados antigos: `supabase/diagnostics/cartao_compras_dia_fechamento.sql`.

### Aplicado e verificado (03/10/2026)

- Migration aplicada no Supabase de produção (`vrrcagukyfnlhxuvnssp`).
- Diagnóstico de dados: só 2 compras à vista no dia do fechamento (cartão Azul infinite, dia 28). A de 28/06 (R$ 76) é de fatura antiga e foi deixada como está; a de 28/08 (R$ 11,50) tem override de fechamento e já está correta. Nenhum dado alterado.

### Próximo passo concreto

S3 corrigido (filtro de período compara strings YYYY-MM-DD). Pendente apenas S2: fatura da pessoa no compartilhado é montada no JS (`generateInvoices`); mover para RPC é um refactor próprio, não um bug.

## Handoff da sessão - 28/07/2026 - Restauração visual e checklist pré-viagem

### Entrega

- O redesign global do commit `1be69206` foi revertido; a árvore restaurada foi comparada com o backup `a3861806` e publicada na `main`.
- Datas de viagem `YYYY-MM-DD` deixaram de ser convertidas para UTC antes da formatação; `01/08/2026` permanece `01/08/2026` no fuso de São Paulo.
- Resumo e visão detalhada agora contam partida e chegada, portanto `01/08 → 29/08` corresponde a 29 dias de viagem.
- Resumo, cards, dashboard, convites e prompt de checklist consomem o período originado em `trips.start_date/end_date` no Supabase pelo helper compartilhado.
- `TripChecklist` preserva a identidade visual anterior e ganhou hierarquia própria para listas longas: resumo de progresso acessível, categorias em cartões responsivos e responsável visível.
- O formulário de novo item agora permite selecionar um membro da viagem como responsável e oferece as nove categorias do checklist pré-viagem.
- Os 83 itens de `checklist_viagem_portatil.html` foram inseridos na viagem `Liverpol` de Wesley, em nove categorias e atribuídos ao membro Wesley. Os sete itens anteriores foram preservados.
- Leitura posterior no Supabase confirmou 90 itens totais, 83 atribuídos ao Wesley e zero pares exatos duplicados de categoria/item.

### Verificação

- [x] `npx tsc --noEmit`.
- [x] `npm run lint -- --quiet`.
- [x] `npm run build`.
- [x] `git diff --check`.
- [x] Teste de regressão de fuso e contagem inclusiva: 9 testes aprovados em `dateUtils.test.ts`.
- [ ] QA visual autenticado em 390 px e 1440 px após o deploy.

### Próximo passo concreto

Abrir a viagem `Liverpol` e confirmar no Resumo `01 de ago → 29 de ago` e `29 dias de viagem`; depois acessar `Preparar > Checklist` e conferir os cartões com 90 itens em 390 px e 1440 px.

## Handoff da sessão - 26/07/2026 - Formulários distintos para lugares e paradas

### Entrega

- `Buscar lugares` não reutiliza mais o formulário de atividade. O novo fluxo de descoberta filtra por categoria, pesquisa nome/endereço próximo ao destino, mostra endereço completo e permite guardar como ideia ou encaminhar ao dia.
- `Adicionar parada` manteve a capacidade da referência, mas ganhou composição própria: cabeçalho contextual, conteúdo rolável, rodapé fixo, ações claras e funcionamento móvel.
- Selecionar um resultado agora preenche automaticamente título quando vazio, endereço, latitude, longitude e link canônico do Google Maps.
- Colar uma URL longa válida do Maps prioriza as coordenadas exatas do estabelecimento, extrai o nome e faz geocodificação reversa; títulos personalizados não são sobrescritos.
- Links clicáveis são restritos a HTTPS e hosts conhecidos do Google Maps.
- Combobox ganhou resultado ativo, setas, Enter, Escape, `aria-activedescendant`, estado vazio e proteção contra respostas assíncronas antigas.
- Horário de fim anterior ou igual ao início bloqueia o envio com erro acessível.
- `Buscar lugares` também passou a ficar disponível no mobile.

### Verificação

- [x] 271 testes aprovados, 19 ignorados.
- [x] 9 testes focados dos formulários e helpers de mapas.
- [x] `npx tsc --noEmit`.
- [x] ESLint sem erros nos arquivos alterados; dois warnings antigos permanecem fora das linhas novas.
- [x] Build PWA de produção aprovado.
- [ ] QA visual autenticado: o navegador local disponível abriu apenas a tela de login, sem sessão de teste.

### Próximo passo concreto

Com uma sessão autenticada, abrir uma viagem em 390 px e 1440 px e conferir `Buscar lugares` e `Adicionar parada`. Depois decidir se links curtos `maps.app.goo.gl` serão resolvidos por Edge Function autenticada; eles não podem ser expandidos com segurança e confiabilidade apenas no navegador por causa de redirects/CORS.

## Handoff da sessão - 26/07/2026 - Identidade visual verde-petróleo

### Entrega

- A identidade roxa genérica foi substituída nos tokens globais `primary`, `accent` e `ring` pelo verde-petróleo já presente no ícone do Pé de Meia.
- Tema claro usa `#0F766E`; tema escuro usa `#2DD4BF` com foreground `#042F2E`, preservando contraste WCAG AA.
- Verde de entrada/sucesso, vermelho de saída/erro e cores escolhidas pelo usuário para avatar, cartão ou categorias permanecem semanticamente separados.
- Componentes com foreground branco hardcoded foram migrados para os tokens adaptativos e o manifesto `.claude/commands/design-review.md` foi atualizado para impedir regressão ao violeta.

### Verificação

- [x] Compilação isolada do Tailwind.
- [x] ESLint sem erros nos arquivos alterados; apenas warnings antigos.
- [x] `DashboardHero.test.tsx`: 3 testes aprovados e snapshots atualizados.
- [x] `git diff --check`.
- [ ] Suíte global: 266 testes aprovados, 19 ignorados e 2 falhas em `TripItinerary.test.tsx` causadas pelas mudanças paralelas ainda não commitadas no planejador.
- [ ] Typecheck global: 5 erros preexistentes e fora da troca de identidade.
- [ ] Build completo: sandbox bloqueou a leitura do caminho pai; execução externa foi recusada porque o plugin do Sentry poderia enviar sourcemaps.

### Próximo passo concreto

Abrir o dashboard autenticado em 390 px e 1440 px e conferir botões, item ativo da navegação, foco por teclado, calendários, badges e cartões nos temas claro e escuro. As mudanças paralelas de viagens e as skills untracked continuam fora deste commit.

---

## Handoff da sessão - 26/07/2026 - Paridade operacional de viagens e correção do deploy

### Entrega

- Benchmark completo do TREK (código, README e imagens) usado apenas como referência funcional; nenhum código/asset AGPL foi copiado.
- Formulário de viagem substituído por um fluxo unificado de criação/edição: nome e destino independentes, notas, capa HTTPS com prévia/erro, datas, moeda, orçamento opcional e convites.
- Cards e header ganharam capa, estados financeiros honestos (loading/erro/sem orçamento/excedido), status cancelado correto, semântica acessível e layout móvel reforçado.
- `Planejar` agora tem biblioteca persistente de lugares separada da agenda: salvar ideia, listar e agendar no dia. As 19 paradas existentes foram migradas e vinculadas sem perda.
- Painel contextual de reservas adicionado para voo, hospedagem, transporte, carro, restaurante, evento e atividade; confirmação e período ficam separados da fonte financeira `transactions`.
- Encurtar datas é bloqueado quando esconderia atividades ou reservas existentes.
- PR Dependabot que misturava React 19 com React DOM 18 foi fechado; majors coordenados de React passaram a ser ignorados para não repetir o `ERESOLVE` da Vercel.

### Banco de produção

- Aplicadas `harden_trip_permissions` e `add_trip_places_and_reservations` no projeto `vrrcagukyfnlhxuvnssp`.
- RLS e grants de viagens/membros/checklist foram endurecidos; `trip_places`, `trip_reservations`, endpoints e vínculos financeiros usam isolamento por viagem, FKs compostas e identidades imutáveis.
- Backfill confirmado: 19 lugares e 19 itens do roteiro vinculados; ordem final dos triggers de `trips` confirmada com `zz_guard_trip_protected_update` por último.
- Tipos TypeScript regenerados do schema real.

### Verificação

- [x] 263 testes aprovados, 19 ignorados.
- [x] `npx tsc --noEmit`.
- [x] Prettier nos arquivos alterados.
- [x] `npm install --dry-run` sem conflito React/React DOM.
- [x] `npm run build` PWA aprovado.
- [ ] QA visual autenticado em 390 px e 1440 px.

### Próximo passo concreto

Abrir uma viagem autenticada e validar visualmente: criar/editar com capa, salvar um lugar sem data, adicioná-lo ao roteiro, criar uma reserva e conferir o bloqueio ao encurtar o período. Depois implementar documentos privados (`trip_resources` + bucket privado) e colaboração avançada (notas/chat/enquetes) como próxima fase.

### Observações

- Advisors de segurança ainda listam avisos antigos de funções `SECURITY DEFINER` e proteção de senha vazada desativada; não foram introduzidos por estas migrations.
- `.agents/skills/humanizar-design/` e `.agents/skills/mentor-tecnico-senior/` permanecem untracked e intocados.

## Handoff da sessão - 26/07/2026 - Planejador de viagens centrado no mapa

### Objetivo

Incorporar o melhor do benchmark `liketrek/TREK` — mapa como área de trabalho, roteiro manipulável e experiência móvel específica — sem copiar código AGPL e preservando o diferencial financeiro do Resumo.

### Entrega

- A navegação da viagem passou a `Resumo | Planejar | Gastos | Preparar`. Despesas/Câmbio ficaram em Gastos; Checklist/Compras em Preparar. `TripDetailSummary` aparece apenas no Resumo.
- `Planejar` usa três áreas no desktop (dias/roteiro, mapa, lugares/sugestões), e no mobile alterna Mapa/Roteiro com navegação anterior/próximo dia.
- Mapa limitado ao dia ativo por padrão, com opção de todos os dias, pins numerados na mesma ordem da lista, seleção sincronizada, distância/duração OSRM, traçado aproximado em falha e estado offline.
- Roteiro reordenável por drag-and-drop/teclado, botões subir/descer e seletor de outro dia. O cache é otimista e volta ao snapshot anterior em erro; conflito `40001` refaz a consulta sem sobrescrever outra sessão.
- Busca, inclusão manual, inclusão tocando o mapa, IA, edição de conteúdo e ajuste de coordenadas foram preservados. Sugestões de IA agora usam um único insert em lote.
- A edição comum não envia mais `date/order_index`; movimento estrutural passa exclusivamente pela RPC.
- `TripItinerary` e Leaflet são carregados sob demanda ao abrir Planejar.

### Banco de produção

- Aplicada a expansão de categorias pendente (`20260716120000_expand_itinerary_categories.sql`) sem alterar o arquivo original.
- Aplicada `20260726180103_atomic_trip_itinerary_reorder.sql`: `itinerary_order_version`, `updated_at`, normalização, constraint única deferrable, guards, policies autenticadas e `reorder_trip_itinerary_v1`.
- Aplicada `20260726182038_restrict_itinerary_reorder_grant.sql`: execução da RPC restrita a `authenticated` (sem `anon`/`service_role`).
- Pós-migration: 19 itens, zero posições negativas, duplicadas ou descontínuas; quatro policies somente para `authenticated`; tipos TypeScript regenerados do schema real.
- Prova real em transação com `ROLLBACK`: owner reordenou snapshot completo, versão subiu exatamente uma vez, versão antiga recebeu `40001`, e `transactions`/`trip_members.personal_budget` permaneceram idênticos.
- Advisor: nenhum alerta de performance ligado aos novos objetos. O aviso de RPC `SECURITY DEFINER` executável por autenticados é intencional; a função valida `auth.uid()`, status, papel, snapshot, versão e locks internamente.

### Verificação

- [x] `npx tsc --noEmit`
- [x] `npm run lint` — 0 erros; warnings antigos do repositório permanecem.
- [x] `npm test` — 249 aprovados, 19 ignorados.
- [x] `npm run build` — build PWA de produção aprovado.
- [x] Boot local em Edge headless: HTTP 200, redirecionamento esperado para `/auth`, zero erros de console/runtime.
- [ ] QA visual autenticado com dados reais em desktop e celular.

### Próximo passo concreto

Entrar em uma viagem real, abrir `Planejar` e validar: arrastar uma parada, mover entre dias, recarregar a página, alternar Dia atual/Todos e conferir rota/pins em viewport 390 px e 1440 px. Depois criar `trip_places` e o painel de Ideias em uma migration/feature separada.

### Bloqueios e observações

- A inspeção local não tinha sessão autenticada, então não fotografou o planner com dados reais.
- O histórico remoto de migrations já estava divergente da pasta local antes desta sessão; `supabase db push --dry-run` recusou operar. Não foi feito `migration repair`. As migrations foram aplicadas pelo canal transacional do projeto e verificadas ao vivo.
- `.agents/skills/humanizar-design/` e `.agents/skills/mentor-tecnico-senior/` continuam untracked e foram preservadas sem alteração.

## Handoff da sessão - 16/07/2026 - Abertura instantânea (app shell precache) + splash único

### Objetivo

Usuário reportou que o app demora muito pra abrir no celular e no computador e que o logo aparece duas vezes antes de abrir. Pediu comportamento de app nativo.

### Causas raiz encontradas

1. **Logo duas vezes**: o `#native-splash` do `index.html` ficava DENTRO de `#root` — o React o destruía na primeira montagem, mostrava o skeleton do `PageLoader`, e aí o `ProtectedRoute` renderizava uma SEGUNDA tela de splash idêntica (mesmo logo + "pé de meia") enquanto `supabase.auth.getSession()` resolvia. Sequência real: logo → skeleton → logo → skeleton → app.
2. **Lentidão**: o service worker só pré-cacheava `index.html` + manifest (7 entradas, 17 KB). Todo JS/CSS usava `NetworkFirst` com timeout de 3–4 s — toda abertura, mesmo do PWA instalado, esperava a rede baixar ~1 MB de JS do caminho crítico. App "nativo" era na verdade um site.

### Decisões e alterações

- **Splash único** (`index.html`): `#native-splash` movido para FORA de `#root` (sobrevive à montagem do React) com fade-out via classe `.hide`. Novo util `src/utils/splash.ts` (`hideNativeSplash()`), chamado por: `ProtectedRoute` quando a sessão resolve (e não renderiza mais o segundo splash — retorna `null`), wrapper `PublicPage` no `App.tsx` (rotas `/auth`, `/reset-password`, `/privacidade`, `*`) e `ErrorBoundary.componentDidCatch` (erro de boot não pode ficar escondido atrás do splash). O script de recuperação de chunk do `index.html` continua funcionando (anexa botão ao splash, que agora persiste até o app estar pronto).
- **App shell precache** (`vite.config.ts` + `src/sw.ts`): precache completo de JS/CSS/HTML/ícones do PWA (143 entradas, ~4,1 MB; logos de banco/avatares/bandeiras ficam fora — são ~530 arquivos — e caem na nova rota runtime `CacheFirst` de imagens, cacheadas na primeira exibição). Navegação agora é `createHandlerBoundToURL("index.html")` direto do precache (era `NetworkFirst` 3 s). Scripts/styles fora do precache: `CacheFirst` (nomes com hash = imutáveis; guarda `denyHtmlForAssets` mantida). Sem risco de chunk morto: index.html e chunks entram no precache do MESMO SW de forma atômica — o SW novo só ativa depois de baixar tudo.
- **Modelo de atualização**: deploys novos não chegam mais no mesmo load; chegam via atualização do SW em background (`autoUpdate` + `skipWaiting`) e via `VersionGuard` (poll de `version.json` a cada 5 min + toast "Atualizar Agora" — já existia e foi verificado compatível: o fetch dele não passa pelas rotas do SW). `version.json` deliberadamente fora do precache. Fallbacks de erro de chunk (`vite:preloadError` no `main.tsx` + recovery script no `index.html`) mantidos como rede de segurança.
- `.claude/launch.json`: adicionada config `preview` (vite preview, porta 4173) para testar o build com SW real.

### Verificação (build de produção servido via `vite preview`, browser real)

- [x] `tsc --noEmit` 0 erros, `npm run lint` 0 erros, `npm test -- --run` 239/239, `npm run build` verde, `format:check` verde.
- [x] SW ativo com 138+ entradas de precache populadas; rota runtime `app-images` cacheando logos.
- [x] Recarga da página: `index.html` com `transferSize = 0` (servido pelo SW), 70/70 assets do cache, asset mais lento 13 ms, **DOMContentLoaded em 47 ms**.
- [x] Splash removido do DOM após o boot; tela de login renderizada sem segundo logo; zero erros de console.
- [ ] QA em dispositivo real (iPhone instalado como PWA): confirmar abertura instantânea na 2ª abertura em diante e splash único. A 1ª abertura após este deploy ainda baixa o precache em background.

### Próximo passo

- QA no celular após o deploy (ver item acima).
- Opcional (primeira visita/instalação): o chunk principal tem 615 KB (182 KB gzip) — dá para dividir vendors com `manualChunks` se a primeira carga em 4G ainda incomodar. Aberturas repetidas já não dependem disso.
- Pendências herdadas: QA visual do fix de toasts (sessão anterior), billing do GitHub Actions.

---

## Handoff da sessão - 16/07/2026 - Faxina de código morto + fix do toast duplicado

### Objetivo

Usuário pediu auditoria "de verdade" do código (não achismo, não elogio vago): quanto do projeto era gordura de sessões de IA sem convenção, e quanto dava pra deletar com segurança. Depois de apresentar o relatório (achados abaixo), usuário pediu para a "equipe" decidir e executar, incluindo revisar um por um os exports/tipos não usados e deletar o que desse.

### Metodologia

`knip` (análise estática do grafo de imports) rodado no projeto inteiro. Todo achado de "código morto" foi cross-checado manualmente (grep pelo nome em todo o repo, leitura do arquivo inteiro) antes de deletar — vários achados do knip eram falso-positivo porque a função era usada _internamente_ no mesmo arquivo (ex.: `dateUtils.formatDateUTC` é chamado só via `dateUtils.formatDate` dentro do próprio módulo; deletar teria quebrado `useTransactionMutations.ts`). Só foi apagado o que ficou provado sem nenhum uso, interno ou externo.

### Achado principal: bug real, não só sobra

8 arquivos (`useGoals`, `useBudgets`(import morto), `useAssets`, `useSyncAssetPrices`, `useTripExchange`, `TripItinerary`, `TripChecklist`) chamavam `useToast()`/`toast()` do sistema antigo do shadcn (`src/hooks/use-toast.ts` + `src/components/ui/toast.tsx` + `toaster.tsx`). O `<Toaster/>` desse sistema **nunca foi montado em `App.tsx`** desde que o app migrou pro `sonner` (só `<Sonner/>` está lá, confirmado lendo `App.tsx` inteiro). Resultado: toda mensagem de sucesso/erro de metas, orçamentos, ativos, câmbio de viagem e checklist/itinerário de viagem era criada em memória e nunca aparecia pro usuário — falha silenciosa em produção, possivelmente há muito tempo. Corrigido: todos os 8 arquivos migrados pro `toast` do `sonner` (usando `toastMessages.ts`/`goalToasts` quando já existia helper equivalente, ou `toast.success`/`toast.error` direto seguindo o padrão dos outros 54 arquivos do projeto). Sistema antigo apagado por completo.

### Duplicações reais encontradas (não é só "sobra", é "duas implementações da mesma coisa")

- `supabaseHelpers.ts`: um CRUD genérico (`fetchUserData`, `insertRecord`, `updateRecord`, `deleteRecord`, `countRecords` etc., 10 funções) construído mas nunca adotado — todo hook real chama `supabase.from()` direto. Só `callRPCWithRetry`/`insertRecords` sobreviveram (usados de verdade).
- `errorHandling.ts`: mesma coisa — um error-handler genérico (`handleQueryError`, `safeErrorHandler`, `withErrorHandling` etc., 10 funções) nunca adotado; o projeto usa `logger.error()` direto em todo lugar. Só `handleSupabaseError`/`retryWithBackoff` sobreviveram (usados internamente pelo `supabaseHelpers.ts`).
- `notificationService.ts`: 14 funções mortas (CRUD de notificação + 5 helpers de notificação específica tipo `createFamilyInviteNotification`, `createSettlementRequestNotification`) — o centro de notificações real (`NotificationButton.tsx`) usa os hooks de `useNotifications.ts`, não este service. Ou seja: quando alguém pede acerto de despesa compartilhada ou envia convite de família, a notificação correspondente **nunca foi implementada de fato** apesar do código existir — gap de produto real, não só código morto. Não mexi na feature, só removi o código morto; fica registrado aqui caso queiram implementar de verdade.
- `queryConfig.ts`: 4 configs de cache alternativas (`cachedQueryConfig`, `realtimeQueryConfig` etc.) e 3 factories nunca adotadas — todo hook usa `defaultQueryConfig` direto.
- `currencyFormatter.ts` vs `exchangeCalculations.ts`: duas implementações de `getCurrencySymbol` — a de `exchangeCalculations.ts` (15 moedas, usada em 11+ lugares) é a real; a de `currencyFormatter.ts` (9 moedas) nunca foi importada por ninguém.
- Hooks de "adicionar/remover membro de viagem" duplicados 3x (`useTrips.ts`, `useTripMembers.ts`) — o fluxo real de convite passa direto por `supabase.from("trip_members")` em `InviteMemberDialog.tsx`.
- "Antecipar parcelas" implementado 2x: a versão morta em `useTransactionMutations.ts`, a real em `useAnticipateInstallments.ts` (usada por `AnticipateInstallmentsDialog.tsx`).

### O que foi decidido manter apesar do knip flagar

- Componentes primitivos do shadcn/radix (`dialog.tsx`, `select.tsx`, `dropdown-menu.tsx` etc.) — exports não usados hoje fazem parte do kit de design, convenção do shadcn é manter o conjunto completo.
- `src/integrations/supabase/types.ts` — gerado automaticamente pelo Supabase CLI, nunca editar manualmente.
- Tipos de domínio colocados junto do hook (`Family`, `TripMember`, `Installment` etc.) — custo de manter é zero, risco de deletar sem necessidade é real.
- `supabase/functions/*` marcadas como "não usadas" pelo knip — falso positivo confirmado (chamadas via `supabase.functions.invoke("nome")`, string, invisível pra análise estática).
- 271 migrations do banco — decisão já registrada na sessão de 13/07 (trilha de auditoria pós-baseline), não mexi.

### Arquivos e limpeza de repositório

- 25 scripts de debug em `scripts/` apagados (81% da pasta) — nenhum referenciado em `package.json`/CI.
- `eslint-report.json`/`eslint-report-utf8.json` (8,1 MB commitados por engano) e `playwright-report/`/`test-results/` (já no `.gitignore` mas ainda rastreados) removidos do git; padrão adicionado ao `.gitignore` pra não voltar.
- `CLAUDE_HANDOFF.md` (handoff paralelo parado em 02/07, sobrevivência de antes da convenção de um único `HANDOFF.md`) e os 6 relatórios de auditoria pontual de 30/06 movidos para `docs/archive/` — raiz do repo agora só com os 3 documentos vivos.
- 3 dependências não usadas removidas do `package.json`: `@radix-ui/react-separator`, `@radix-ui/react-toast`, `sharp` (dev). `package-lock.json` resincronizado.

### Números

- Antes: 357 arquivos / 84.680 linhas em `src/` + 33 arquivos / 4.820 linhas em `scripts/` = 390 arquivos / 89.500 linhas.
- Depois: 350 arquivos / 81.549 linhas em `src/`+`scripts/` combinados.
- ~7.950 linhas de código morto confirmado removidas (script de debug + duplicações + sistema de toast morto), zero mudança de comportamento além do fix do bug do toast.

### Verificação

- [x] `npx tsc --noEmit -p tsconfig.app.json` = 0 erros (rodado a cada bloco de mudança, não só no final).
- [x] `npm run lint` = 0 erros (warnings pré-existentes de `any`/unused mantidos, mesmos de antes).
- [x] `npm run format:check` = verde (Prettier rodado nos arquivos tocados).
- [x] `npm test -- --run` = 239/239 passam, 19 skipped (mesmo baseline de antes da sessão) — nenhuma regressão.
- [x] `npm run build` = verde, incluindo geração do service worker PWA.
- [x] `npm run test:secrets` = verde.
- [ ] **Não verificado em navegador real**: sem credencial de login disponível nesta sessão para conferir visualmente que os toasts de metas/orçamentos/ativos/câmbio agora aparecem. Recomendo QA manual no próximo acesso — criar/editar uma meta e um orçamento e confirmar que a notificação de sucesso aparece na tela (antes não aparecia).

### Próximo passo

- QA visual manual do fix do toast (ver item acima) — é o único item desta sessão que muda comportamento visível pro usuário.
- Decidir se vale implementar de verdade as notificações de convite de família/solicitação de acerto (gap de produto encontrado em `notificationService.ts`, ver seção acima) ou deixar como está.
- Resolver o billing travado do GitHub Actions (ver sessões anteriores) — segue sendo o único bloqueador real de CI.

### Commit desta sessão

Pendente de commit + push para `main` (ver regra de push obrigatório).

---

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

**Causa raiz real, confirmada após o push do fix**: o run #150 (do próprio fix) falhou nos 6 jobs em ~5s, 0 steps executados. O usuário abriu a página do run no GitHub e confirmou o texto exato exibido: _"The job was not started because your account is locked due to a billing issue."_ — bloqueio de nível de **conta pessoal** do GitHub (não é config do repositório: "Actions permissions" já estava em "Allow all actions and reusable workflows", a opção mais permissiva). Isso explica todo o histórico de falhas desde 12/07, independente de qualquer coisa no código. O fix de Prettier continua correto e necessário, só não vai aparecer verde em CI até o billing ser resolvido.

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

## Handoff da sessao - 19/07/2026 - Periodo personalizado em Relatorios

### Objetivo

Permitir que a pessoa gere relatorios financeiros por qualquer intervalo de datas, alem dos modos mensal e anual.

### Decisoes e alteracoes

- Adicionado o modo `Personalizado` no cabecalho dos relatorios, com campos nativos de data para inicio e fim.
- O intervalo e inclusivo e valida que a data final nao seja anterior a inicial.
- A consulta de transacoes usa o intervalo escolhido quando o modo personalizado esta ativo; nao e apenas um filtro visual sobre um recorte fixo.
- Totais, categorias, listas, exportacao, parcelas compartilhadas e a media diaria usam o mesmo contrato de periodo.
- Em cartoes, a selecao continua respeitando `competence_date`, como nos modos existentes.

### Arquivos

- `src/pages/Reports.tsx`.
- `src/pages/reports/ReportsHeader.tsx`.
- `src/pages/reports/useReportsData.ts`.
- `src/pages/reports/reportPeriod.ts` e `reportPeriod.test.ts`.

### Verificacao

- [x] Teste unitario: limites inclusivos, query por intervalo e intervalo invertido.
- [x] `npx vitest run src/pages/reports/reportPeriod.test.ts` (3 testes aprovados).
- [x] `npx tsc --noEmit -p tsconfig.app.json --pretty false`.
- [x] ESLint nos arquivos alterados, sem avisos introduzidos.
- [x] `git diff --check`.
- [ ] QA visual autenticado: o navegador isolado desta sessao recusou conexao com o localhost, apesar do Vite iniciar fora do sandbox. Precisa ser repetido no navegador do usuario antes de considerar o item visual concluido.

### Proximo passo

- Validar os tres modos de relatorio com dados reais em desktop e celular e continuar a reducao de consultas amplas/paginacao do checklist de performance.

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

## Continuação da auditoria ao vivo - 18/10/2026 - navegação autenticada sem mutações

- O usuário confirmou que os dados existentes são de teste e autorizou testar. Abri `https://meupedemeia.vercel.app` em sessão autenticada e percorri Dashboard, Transações, Contas, Cartões, Compartilhados, Família e Relatórios. Não submeti gravações nem removi/alterei registros; portanto, não houve necessidade de limpeza.
- Formulário de transação vazio: Salvar exibiu validação `O valor da transação deve ser maior que zero` e `Informe o valor`, sem gravação. Formulário de nova conta iniciou com `Criar Conta` desabilitado; fechei sem salvar.
- Cartões carregou após estado transitório `Carregando faturas`, exibindo Azul Infinite e R$ 117,32. Compartilhados e Família renderizaram dados da sessão. Relatórios exibiu a mesma saída mensal da lista de transações (R$ 128,32), enquanto Dashboard segue mostrando R$ 11,00; a divergência da base de caixa continua sem correção publicada.
- Esta rodada não comprovou CRUD autenticado, fluxos que gravam, restauração/rollback no banco, nem as demais rotas. Estimativa heurística atual: cerca de 75% ainda por verificar; continua sem denominador exato.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Nenhum registro financeiro criado, apagado ou alterado nesta rodada. Não aplicar migrations nem publicar build enquanto reconciliação do histórico remoto/local segue pendente.

## Continuação da auditoria ao vivo - 18/10/2026 - rotas secundárias e módulos de viagem

- Revalidei o site publicado autenticado sem gravar dados: Metas e Investimentos (abas metas, carteira e IRPF), Orçamentos, viagem Liverpol (resumo, gastos, câmbio, roteiro, checklist, diário, comunidade), Simuladores (renda fixa/IPCA) e Configurações (perfil, segurança, backup). As páginas principais carregaram e navegaram sem bloqueios. Nenhuma gravação, download ou exclusão foi executada.
- Renda fixa: cenário padrão mostra R$ 31.000 investidos, saldo bruto R$ 40.291,99, líquido R$ 38.898,19 e IR R$ 1.393,80 (15% do rendimento), aritmeticamente coerente. Poder de compra: R$ 10.000 a 4,5% por 5 anos mostra R$ 12.461,82 necessários e R$ 8.024,51 de poder real, coerente com capitalização anual. `PUXAR DO BCB` segue desabilitado em produção.
- O checklist de uma viagem exibiu 90 itens e duas seções com rótulo “Eletrônicos” (8 e 2 itens); há possível duplicação legada de categorias no dado da viagem, sem confirmação de que seja regra global. Título da viagem tem grafia “Liverpol”, embora o destino esteja “Liverpool, UK”. Não alterei dados existentes.
- O painel de configurações chegou a Segurança e Backup. Não alterei PIN/senha e não exportei dados privados. O painel do Supabase abriu em sessão do navegador, mas o botão de download CA permanece desabilitado e a seção de logs reporta `No access token provided`; a CA oficial não ficou acessível.
- Estimativa heurística atual: aproximadamente **70% ainda falta verificar**; a estimativa não é cobertura medida. Fluxos de CRUD de produção, políticas/rollback do banco por conexão direta validada, fluxos de importação/backup e as rotas ainda não navegadas seguem sem aceite completo.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Nenhum dado criado, removido ou alterado nesta rodada. Migrations não aplicadas e build não publicado.

## Continuação da auditoria ao vivo - 19/10/2026 - migrations, CRUD e bundle publicado

- O usuário autorizou resolver as migrations. Reconciliei o histórico remoto/local e apliquei as migrations pendentes; uma migração cujo efeito já existia foi registrada como aplicada após verificação das tabelas, políticas, constraints e grants. `supabase db push --linked --include-all --skip-vault --dry-run` confirmou `upToDate` e lista vazia.
- Testei ao vivo um lançamento de despesa de R$ 0,01, confirmei o efeito na lista e saldo, excluí pela interface e então limpei fisicamente o lançamento e os dois registros de auditoria associados, conforme instrução persistente do usuário. Consulta final: zero linhas de teste. Saldo e totais voltaram ao estado anterior.
- Após as migrations, as verificações de segurança confirmaram negação de leitura anônima de `profiles.app_pin_hash`, negação de update autenticado de `profiles.id`/`app_pin_hash`, ausência da RPC removida `find_profile_for_family_link_v2` e grants esperados para reorder de viagens. O `db lint` ainda aponta erros legados em funções antigas/inativas; não identificou problema nas migrations aplicadas.
- A navegação autenticada cobriu Dashboard, Transações, Contas, Cartões, Compartilhados, Relatórios, Metas/Investimentos, Orçamentos, Viagens, Simuladores e Configurações. O bundle publicado ainda faz consultas antigas a `profiles` e recebe 403 em convites, cartões compartilhados e perfil; a busca BCB também falha em produção. Há correções locais para esses fluxos, ainda sem publicação.
- No código local, ajustei os rótulos de despesas/saídas de caixa no Dashboard, Transações e Relatórios e atualizei snapshots. Testes do Dashboard (3/3), typecheck, lint dos componentes e `git diff --check` passaram. A suíte Vitest completa passou anteriormente com 337 aprovados e 19 ignorados; E2E anterior passou 90/90 cross-browser e 18/18 Chromium.
- **Próximo passo concreto:** após autorização explícita para publicar, enviar o frontend corrigido e a Edge Function `get-currency-quote` se ainda necessária, conferir a versão servida e repetir as leituras de perfil/convites/cartões e chamadas BCB em produção. Em seguida concluir fluxos autenticados restantes de escrita, importação e backup com dados descartáveis e limpeza verificada.
- **Pendências/bloqueios:** não há migrations pendentes. Publicação/deploy ainda requer autorização do usuário. Aceite de CRUD/importação/backup ainda incompleto; os achados do bundle antigo permanecem ativos no site publicado. O lint do Supabase lista avisos/erros antigos em funções legadas e requer triagem separada.
- Cobertura restante estimada: aproximadamente **40%** (estimativa heurística, sem denominador formal), principalmente publicação e pós-publicação, fluxos de escrita/importação/backup e classificação dos avisos legados do banco.

## Continuação da auditoria - 19/10/2026 - backup e escopo de viagens

- Revisor independente avaliou os diffs ativos: não encontrou novos defeitos nos hooks de perfil, fallback BCB, rótulos de despesas/caixa ou cálculos do painel familiar. Testes focados ligados a esses fluxos e importação OFX passaram (26/26 em 8 arquivos).
- O teste do modal OFX expôs um aviso ARIA de descrição ausente. Substituí o parágrafo comum por `DialogDescription`; o subconjunto OFX voltou a passar (10/10), sem aquele aviso. Typecheck e lint dos arquivos afetados serão revalidados após a alteração final de escopo.
- A revisão de `BackupManager.tsx` confirmou defeito P1: a restauração filtrava `trips` por coluna inexistente `user_id`, e `trip_itinerary`, `trip_checklist` também não têm essa coluna. A sequência podia apagar tabelas financeiras antes de falhar. Corrigi seleção/exclusão de viagens por `owner_id` e exclusão de registros filhos por `trip_id` das viagens próprias, antes de remover as viagens. O revisor confirmou que filtros e ordem correspondem ao esquema e às policies RLS.
- Corrigi também a exportação para incluir apenas viagens próprias e filhos dessas viagens; isso evita trazer linhas visíveis de viagens compartilhadas que o usuário não consegue restaurar como proprietário. Ajustei o texto da tela: o arquivo é parcial, não criptografado e pode não restaurar por completo.
- **Pendência P1 ainda aberta:** o restore continua usando múltiplas chamadas REST, sem transação atômica. Falha de rede, dados inválidos ou erro de inserção após a limpeza pode deixar os dados atuais parcialmente removidos. A cobertura também omite `family_members`, `shared_credit_cards` e `credit_card_invoices`. Não executei nem recomendarei restauração ao vivo antes de implementar e validar a transação e definir o inventário suportado.
- O `db lint --linked` foi reexecutado. Além de variáveis não usadas, ainda aponta referências inexistentes em RPCs legadas `confirm_settlement`/`reject_settlement_request` (`audit_logs`), `calculate_balance_between_users`/`settle_balance_between_users` (`financial_ledger`) e rotinas administrativas antigas (`trip_participants`, coluna inexistente em `trip_checklist`). `soft_delete_transaction` continua com o falso positivo conhecido da tabela temporária. Essas RPCs não apareceram como chamadas do frontend na busca local; falta confirmar ACL/cron/consumidores antes de desativar ou remover.
- Próximo passo: finalizar typecheck/lint desta edição, desenhar e implementar restauração atômica via RPC invoker com whitelist e validação de propriedade; inventariar as entidades que o produto promete incluir; cobrir rollback e importação no banco local/isolado. Depois, com autorização para publicar, validar as correções de frontend/Edge Function em produção e continuar CRUD/importação/backup sem executar restore destrutivo até o gate ser aprovado.
- Estimativa heurística atual: cerca de **45% ainda falta verificar**. A auditoria não está concluída: há a pendência P1 do restore, triagem de RPCs legadas, aceites autenticados de escrita/importação/backup e publicação/pós-publicação.

### Revalidação posterior do mesmo dia

- Typecheck após as mudanças de escopo do backup passou. ESLint dos componentes tocados, testes focados (8 arquivos/26 testes), `test:secrets` e `git diff --check` também passaram.
- `test:db-connection` passou 6/6. `test:db-security` e `test:db-smoke` não iniciaram: nem o ambiente de processo nem `.env`/`.env.local` contêm `SUPABASE_DB_URL`/`DATABASE_URL`; não relaxei TLS. O banco segue sem essa verificação direta nesta rodada.
- Tentei build para uma pasta temporária isolada para preservar `public/version.json`, mas a execução do comando foi rejeitada pela política automática de execução; o build completo já havia passado antes das mudanças apenas de rótulos/backup nesta rodada anterior, então este build não está verificado após os últimos ajustes.
- Cobertura restante revisada para aproximadamente **50%**, devido aos riscos P1 descobertos no backup, RPCs antigas com referências quebradas, falta dos testes diretos de DB e do deploy/pós-deploy.

## Continuação da auditoria - 19/10/2026 - acesso direto ao Supabase

- Acesso ao banco remoto foi confirmado via `npx supabase db query --linked`, sem credenciais impressas nem gravações. A consulta ocorreu em 2026-10-19 10:41 UTC como `postgres`.
- Estado verificado por consultas read-only: 46/46 tabelas públicas com RLS; `anon` e `authenticated` têm zero privilégios efetivos `TRUNCATE`, `TRIGGER`, `REFERENCES` e `MAINTAIN` nas relações públicas; privilégios padrão para objetos criados por `postgres` também não concedem esses quatro privilégios.
- Há ACLs padrão para esses privilégios associadas a `supabase_admin`, mas esse papel atualmente não possui tabelas, views ou sequências em `public`. Isso não prova que serão usadas para objetos futuros; confirmar a função desse papel antes de alterar ACLs do sistema. Nenhuma migration ou dado foi alterado nesta continuação.
- O painel web do projeto redirecionou para `sign-in`; portanto o acesso direto realizado foi pelo CLI ligado ao projeto, que permite consultas ao catálogo. A tela do Dashboard não foi autenticada.
- `supabase migration list --linked` falhou neste turno por `password authentication failed` do usuário temporário `cli_login_postgres`. Uma consulta read-only confirmou que as três migrations recentes de hardening/restore/revogação estão registradas, mas o inventário completo de versões não foi revalidado agora. O harness `test:db-smoke`/`test:db-security` também não foi executado nesta conexão, pois requer DSN PostgreSQL e TLS verificado.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.

## Continuação da auditoria - 19/10/2026 - purga autorizada do teste live

- O usuário confirmou explicitamente a exclusão permanente de `ZZ_TESTE_AUDIT_LIVE_1792405089050`. No Supabase vinculado, confirmei que havia um tombstone de R$ 0,01 com `deleted_at`, zero vínculos com splits/reversões/transações relacionadas e saldo Nubank de R$ 3.078,79.
- A exclusão foi executada em uma transação direcionada pelo UUID e pela descrição; o trigger inseriu mais uma linha de auditoria, então a mesma transação removeu as linhas de `audit_log` para aquele ID. Consulta independente posterior confirmou 0 transações com esse ID/descrição, 0 logs vinculados e saldo inalterado em R$ 3.078,79.

## Continuação da auditoria - 19/10/2026 - risco de cascata no restore

- Inspeção do schema remoto confirmou que o restore anterior apagava contas, categorias e viagens antes de várias chamadas REST separadas. A falta de transação torna uma falha intermediária parcialmente destrutiva.
- As cascatas de FK ampliam o impacto além do arquivo: apagar `trips` também apaga transações vinculadas de outros membros e entidades como reservas, diário, bagagem, locais e comunidade, muitas ausentes do export; apagar contas também remove `credit_card_invoices`, `shared_credit_cards` e outras relações não exportadas; apagar categorias remove `category_keywords` e `user_category_learning` não incluídos.
- Contenção local: desliguei o seletor de arquivo e o handler de restore para evitar gravações até criar uma rotina transacional que cubra ou preserve corretamente todas as entidades relacionadas. Especifiquei no texto da tela o escopo real do export (viagens próprias; somente itinerário, checklist, membros e compras de câmbio). O build publicado não foi alterado.
- Revisão independente aprovada para a contenção; incorporei correções de texto sobre o escopo das viagens e a indisponibilidade temporária. `BackupManager.test.tsx` passou 1/1, typecheck passou, ESLint e Prettier focais passaram, `git diff --check` passou e `npx vite build --outDir C:\Users\Wesley\AppData\Local\Temp\bolso-audit-build-1019` passou.
- O build mantém avisos existentes: API CJS do Vite, import misto de `notificationService`, falta de token Sentry para release/source maps e chunks grandes.
- A documentação oficial do Supabase descreve grants padrão de `supabase_admin` como parte do modelo da plataforma; os privilégios efetivos atuais nas 46 tabelas estão limpos e as 46 têm RLS. Não alterar ACL do papel interno sem necessidade provada ([proteção da API](https://supabase.com/docs/guides/api/securing-your-api), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)).
- Próximo passo: criar desenho e migration RPC transacional de restauração, com contrato estrito do payload e ownership por tabela; antes de reativar, testar atomicidade/rollback em banco isolado e decidir se o backup deve incluir ou preservar cada entidade relacionada. O recurso permanece temporariamente indisponível no código local.

- Reexecutei a suíte completa após a contenção: **341 testes passaram e 19 foram ignorados, em 56 arquivos**. Isso prova regressões cobertas em código local, não o fluxo live de restore nem as áreas sem teste automatizado.
- Estimativa heurística do objetivo completo segue em **aproximadamente 45–50% ainda por verificar**. Há ampla cobertura local e verificações live parciais; restore correto, harnesses DB diretos, fluxos reais restantes e aceite pós-publicação seguem abertos.

## Continuação da auditoria - 19/10/2026 - escopo de restauração compartilhada

- O usuário definiu que um restore deve substituir também viagens e cartões compartilhados. O arquivo de backup atual não contém cartões compartilhados, viagens em que o usuário é apenas participante, nem várias tabelas colaborativas de viagem (diário, bagagem, reservas e comunidade). Portanto, o escopo escolhido ainda não é representado pelo formato atual.
- A restauração permanece desativada localmente: não existe operação atômica cobrindo todas as dependências, e cascatas podem apagar transações de outros participantes, acertos e outros dados fora do JSON. Nenhum restore foi executado.
- Teste focal de BackupManager: 1/1 passou. `git diff --check` passou. A CLI Supabase confirmou, em leitura remota, zero linha restante para `ZZ_TESTE_AUDIT_LIVE_1792405089050`; a listagem de migrations não mostrou divergência local/remota na saída completa e o estado previamente revalidado era 303/303 alinhadas.
- Próximo passo concreto: preparar uma publicação isolada do ajuste do topbar e da correção do parser OFX, sem incluir o restante do working tree; aguardar deployment/preview, verificar topbar em desktop e largura intermediária e então repetir o upload OFX sintético com limpeza confirmada.
- Estimativa heurística da auditoria global: **aproximadamente 45–50% ainda falta verificar**. A escolha de escopo esclarece o objetivo, mas deixa o restore complexo pendente.

## Continuação da auditoria - 19/10/2026 - Supabase advisors e autorização admin

- `supabase db advisors --linked --type all --level info` retornou 55 avisos de funções SECURITY DEFINER executáveis por authenticated, 1 configuração de proteção a senhas vazadas desativada, 2 policies RLS com avaliação repetida de auth context, 3 pares de policies permissivas duplicadas, 20 FKs sem índice e 61 índices sem uso observado. O alerta SECURITY DEFINER é genérico: revisei chamadas críticas com `user_id`; as funções de gestão de contas e acesso a splits vinculam o argumento a `auth.uid()`, `get_admin_user_dossier` exige `is_admin()`, e `is_family_member_v2` impede sondagem de outro usuário. Os avisos de índice são candidatos para investigação, não instrução automática para apagar.
- Identifiquei que o usuário não-admin não conseguia recalcular saldos de outra conta pelo painel de administração: `recalculate_all_balances(p_user_id)` permitia apenas `auth.uid()`, embora a ação administrativa envie um usuário-alvo. Migration `20261019155823_allow_admin_recalculate_target_balances.sql` agora permite self-service ou admin verificado e usa o recalculador interno, cuja ACL live foi conferida como anon=false, authenticated=false, PUBLIC=false e service_role=true.
- Revisor independente aprovou a versão final. Preflight em transação reversível testou recálculo do admin para outro usuário com contas, recálculo próprio e rejeição de usuário comum; o mesmo teste pós-aplicação live passou com `ROLLBACK`. `db push --linked` aplicou somente essa migration. Consulta `supabase_migrations.schema_migrations` confirmou a migration aplicada. Uma nova tentativa de `db push --dry-run` falhou após a aplicação porque a credencial efêmera `cli_login_postgres` retornou password authentication failed; a verificação por catálogo funcionou.
- Conforme pedido, a conta `wesley.diaslima@gmail.com` foi cadastrada em `admin_users`; consulta confirmou 1 vínculo. Sessão simulada authenticated verificou `is_admin()` e acesso à RPC de estatísticas. Isso habilita o painel para essa conta; os botões de reset continuam suspensos no frontend.
- Próximo passo: revisar políticas permissivas e initplan, tratar a configuração de proteção a senhas vazadas no Dashboard autenticado e continuar fluxos CRUD live sem uso de dados reais. Backup/restore abrangente permanece bloqueado até o formato cobrir cartões compartilhados e relações completas de viagens.
- Estimativa heurística global mantida: aproximadamente **45–50% ainda falta verificar**.

## Continuação da auditoria - 19/10/2026 - otimização RLS de convites

- Advisors antes da migration mostravam 2 `auth_rls_initplan` em `family_invitations`. Leitura do catálogo live mostrou `auth.jwt() ->> 'email'` sem subconsulta nas policies de INSERT/SELECT; os demais checks usavam `(SELECT auth.uid())`.
- Migration `20261019160917_optimize_family_invitation_auth_claims.sql` envolve somente o acesso ao JWT em `(SELECT auth.jwt())`, preservando as condições de propriedade, e-mail, vínculo/role de família e destinatário. A documentação oficial atual do Supabase recomenda esse padrão para cache per-statement quando o valor não depende da linha: https://supabase.com/docs/guides/database/postgres/row-level-security. Revisor independente não achou mudança semântica; preflight catalogou ambas as expressões dentro de transação revertida.
- Migration aplicada ao Supabase. Pós-condição live: ambas policies têm `SELECT auth.jwt()`; advisor de performance agora não retorna avisos `auth_rls_initplan` (0, antes 2). Restam 3 grupos de permissões SELECT sobrepostas de viagens; são políticas de leitura para membros + gestão para editores e ficaram pendentes de benchmark/consolidação por equivalência.
- Próximo passo: avaliar a policy combinada de viagens e proteção a senha vazada, continuar os fluxos autenticados de CRUD; `db push --dry-run` segue sem conexão PostgreSQL confiável por erro de senha efêmera do CLI após o push, então use catálogo remoto como verificação até resolver o CA/DSN.
