# HANDOFF.md — Ponto de Continuidade

> Última atualização: 2026-10-25

## Estado confirmado

- `0e9f8431` está em `main`. Vercel deployment `dpl_3hU5dZ6REkNHrNNEgbhRryBg1eSU` está `Ready`, ligado ao mesmo SHA; o alias `https://meupedemeia.vercel.app/version.json` serve `buildTimestamp=1792881708678`.
- Revisão semântica de 55 RPCs `SECURITY DEFINER` autenticadas reconciliou corpos e callers por domínio (catálogo: 131 definers, zero grants `anon`, zero sem `search_path`). Quatro achados comprovados foram corrigidos em migrations aplicadas: saldo de viagem/notificações de convite; integridade e remoção lógica de parcelas; membership/admin/resumo compartilhado; projeção mensal e saldo histórico. O ledger remoto contém as quatro e `db push --linked --dry-run` reporta up-to-date. Fixtures sintéticas foram exercitadas em `BEGIN/ROLLBACK`; nenhum fixture permaneceu.
- Rechecagem em 24/10: consulta direta ao catálogo remoto confirmou as quatro versões no ledger. As 11 RPCs corrigidas amostradas mantêm `SECURITY DEFINER`, `search_path` definido e nenhum grant de execução a `anon`; três funções internas não são executáveis por `authenticated`, como esperado. Em 25/10, `supabase migration list --linked` confirmou 322/322 migrations locais/remotas sem divergência, embora o dry-run ainda não tenha autenticado a role temporária `cli_login_postgres`.
- Continuação em 25/10: rechecagem independente não encontrou RPC adicional executável por `authenticated` fora das 55 revisadas. Foi identificado apenas um defeito no painel admin legado: limpeza de logs envia argumento de senha que a RPC atual não aceita; interface permanece explicitamente desabilitada, conforme decisão do usuário, então não é fluxo ativo. `npm audit` atual confirma cinco findings moderados: Tailwind 3/PostCSS selector parser e React Router 6; correções indicadas são majors e precisam de migração/testes próprios.
- Corrigidos nesta sessão dois problemas dos harnesses: DB e gerador de baseline agora reutilizam `getVerifiedDbConnectionConfig` em vez de `rejectUnauthorized:false`; o gate não pula mais os probes de isolamento quando faltam fixtures, falhando com mensagem explícita. Validações finais: seis testes do helper, ESLint, Prettier, sintaxe Node, typecheck, Vitest completo (332 passaram/19 ignorados) e build passaram. O primeiro Vitest paralelo teve timeout de 5 s por contenção; o rerun isolado da suíte passou. O harness não foi executado contra o banco; o CI continua sem `SUPABASE_DB_URL` e precisa de um ambiente com conta ativa, usuário atacante e não-admin pré-provisionados. Nenhum dado remoto foi alterado.
- Benchmark live de `/configuracoes`: mediana de 3 navegações com cache/service worker desativados, load 363 ms, TTFB 43 ms, DOMContentLoaded 331 ms, FCP 324 ms, 397.079 bytes. Load histórico era 535,6 ms, mas as condições não são idênticas. Imagens iniciais caíram de 30 para 2 (94% menos bytes codificados na captura); restante carrega sob demanda.
- Dependências: Vite 7.3.7, Vitest/UI/coverage 4.1.12. `npm ci`, Vitest 332/19 ignorados, Playwright cross-browser 114/115 (1 skip esperado), typecheck, build e `test:secrets` passaram. `npm audit`: zero altos/críticos, cinco moderados em Tailwind/PostCSS e React Router. Revisão independente do diff não encontrou incompatibilidade.
- CI #40139639302: Build Check, Lint & Type Check, Vitest, Security Audit e E2E Chromium passaram. `Database Security Contract` falhou porque `SUPABASE_DB_URL` não está configurada; o gate de isolamento live foi pulado. Não inserir secret no GitHub sem decisão/autorização própria; harnesses locais devem continuar com TLS estrito.
- Cron `daily-balance-reconciliation` está ativo `0 4 * * *`; execução live confirmada em 24/10/2026 às 04:00 UTC.

## Bloqueio e pendências do objetivo

1. **OFX live:** Wesley confirmou que “Permitir acesso a URLs de arquivo” está habilitado no Brave. Em 25/10, a nova tentativa encontrou uma janela do Brave em MyClaw.ai e a ferramenta Computer Use encerrou porque não conseguiu determinar a URL com confiança suficiente. Não foi enviado arquivo. Não contornar essa barreira com outra interface; repetir quando a ferramenta conseguir validar a origem de `meupedemeia.vercel.app`. A suíte local do parser/modal passou 13/13.
2. **Contrato DB live:** falta `SUPABASE_DB_URL` seguro no CI e DSN/CA oficial no worktree para o harness estrito. O job #40139639302 não provou o isolamento live.
3. **Dependências:** cinco findings moderados restantes; decidir/migrar Tailwind 4 e React Router 7 com compatibilidade e regressões cobertas.
4. **Backup:** export não garante snapshot consistente; restore permanece desabilitado até cobrir dados compartilhados, staging transacional, rollback e testes abrangentes em banco isolado.
5. **Escopo amplo da auditoria:** ainda há aceites de CRUDs live, cobertura dos cálculos financeiros prioritários, avisos de db lint/migration drift e itens antigos de dashboard/reset/admin a reconciliar. Nenhum dado financeiro deve ser alterado sem autorização específica.

## Próximo passo concreto

Manter a pendência OFX visível e, numa sessão com URL do Brave reconhecida pela ferramenta Computer Use, observar a rota atual, confirmar o domínio `meupedemeia.vercel.app`, anexar somente o arquivo OFX sintético, validar prévia/duplicidade/importação e remover pelo próprio app todo registro sintético, conferindo saldo/lista ao baseline. Se a ferramenta continuar sem reconhecer a URL, parar sem upload. Em paralelo, obter o resultado de harness DB com credenciais e CA via mecanismo aprovado, sem TLS inseguro.

## Progresso

`CHECKLIST.md`: 363/398 caixas concluídas (35 abertas; 8,8% abertas). Grupo `AUDIT`: 188/212 (24 abertas; 11,3% abertas). Percentuais contam caixas, não esforço ou cobertura. O goal permanece ativo enquanto OFX e lacunas acima não estiverem encerrados.
