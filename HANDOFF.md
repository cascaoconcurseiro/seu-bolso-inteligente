# HANDOFF.md — Ponto de Continuidade

> Última atualização: 2026-10-25

## Estado confirmado

- Repositório em `C:\Users\Wesley\.codex\worktrees\rpc-audit-release\seu-bolso-inteligente`, branch `codex/audit-release-20261024`, commit `b9a2622c` enviado em fast-forward para `main`. Vercel `dpl_DTvm8PhrUdBorUaQaQ8LVDMjFZS6` está `READY` e no alias `https://meupedemeia.vercel.app`; `version.json=1792935615231`; `/`, `/transacoes`, `/familia` e `/configuracoes` responderam HTTP 200. GitHub combined status: Vercel success.
- Divisão financeira: percentuais usam alocação com precisão de centavos e resíduo final; o modal bloqueia total zero, fatia zero/subcentavos, excesso e o caso de pagador terceiro + usuário 100% quando falta `currentUserMemberId`. Revisão independente final aprovou; testes cobrindo os casos.
- Backup: restore está removido/desativado porque o fluxo antigo apagava/inseria sequencialmente, sem atomicidade e com risco de cascata em dados compartilhados. Export continua disponível, informa que o JSON é parcial/sem criptografia/sem snapshot e pode conter dados compartilhados e identificadores de terceiros. Teste do export valida as 14 consultas, JSON, download e revogação da URL; restore precisa ser reimplementado conforme `docs/BACKUP_RESTORE_V2_CONTRACT.md`, incluindo a decisão do usuário de substituir também os dados compartilhados.
- React Router foi atualizado de 6 para 7.18.4; snapshots foram ajustados. `npm test`: 345 passaram/19 ignorados (51 arquivos passaram, 2 ignorados). Playwright: 114/115 passaram em Chromium, Firefox, WebKit, Chrome móvel e Safari móvel; 1 skip esperado no viewport desktop em Safari móvel. `npm run typecheck`, build, ESLint (0 erros, 218 warnings), formato focal, secret scan e `git diff --check` passaram. O teste do itinerário usa `fireEvent.change` para evitar timeout artificial por digitação caractere a caractere.
- `npm audit`: três findings moderados restantes, todos no encadeamento Tailwind 3/PostCSS. Revisão de migração recomenda decidir primeiro o piso suportado de iOS/Safari; Tailwind 4 muda diretivas CSS, configuração e plugin.
- Três migrations foram aplicadas no Supabase e pós-verificadas: `20261025110222_revoke_legacy_undo_shared_settlements_for_clients.sql` (sem execução por `anon`/`authenticated`, disponível a `service_role`); `20261025124500_revoke_client_access_to_invoice_stub.sql` (stub de faturas sem cliente e sem job `pg_cron`); `20261025133000_disable_legacy_admin_reset_rpcs.sql` (funções destrutivas de reset sem execução por `anon`, `authenticated` e `service_role`, conforme decisão do usuário de manter painel admin desativado). O dry-run reporta remoto up-to-date; 325 migrations locais e remotas.
- `db lint` live reporta seis erros reais em RPCs antigas (`confirm_settlement`, `reject_settlement_request`, referências antigas a `financial_ledger` e resets) e um falso positivo de tabela temporária em `soft_delete_transaction`, além de warnings. As funções legadas não têm callers conhecidos no repo, mas não foram removidas sem excluir consumidores externos; as duas funções de reset agora estão inacessíveis a todos os papéis de API.
- Checklist: 364/398 caixas concluídas (34 abertas; 8,5% das caixas); grupo AUDIT 189/212 (23 abertas; 10,8%). Percentuais contam caixas, não esforço ou cobertura.

## Bloqueios e pendências

1. **OFX live:** a permissão da extensão Brave foi confirmada pelo usuário, mas a ferramenta de computador não conseguiu identificar com confiança a URL da janela ativa (estava em MyClaw.ai). Nenhum arquivo foi enviado. Retomar somente quando a origem de `meupedemeia.vercel.app` for identificada pela ferramenta; não contornar a barreira com outro mecanismo.
2. **Harness DB:** o job CI não tem `SUPABASE_DB_URL`; a auditoria live de isolamento precisa DSN/CA TLS validado e fixtures não-admin pré-provisionadas. Não considerar o gate aprovado por catálogos/queries isoladas.
3. **RPCs legadas:** revisar possibilidade de consumidores externos/service-role antes de remover/corrigir `confirm_settlement`, `reject_settlement_request` e as duas RPCs antigas de saldo, depois limpar os erros restantes do `db lint`. As duas RPCs de reset admin estão sem EXECUTE para todos os papéis de API.
4. **Backup/restore:** snapshot ainda não consistente e restauração desativada; implementar staging e RPC transacional com rollback, vínculos/PII compartilhados e teste em banco isolado.
5. **Outras lacunas:** validação autenticada pós-deploy, upload OFX, auditoria de CRUDs e cálculos financeiros ainda não cobertos por comportamento real, warnings do `db lint`, e advisories Tailwind. Reconciliar itens históricos no `CHECKLIST.md` sem transformar contagem de caixas em cobertura total.

## Próximo passo concreto

Consultar o catálogo/lista de Edge Functions e `cron.job` para confirmar consumidores não-repositório das quatro RPCs legadas que ainda causam erro de lint. Em seguida decidir por função entre remoção exata ou reparo compatível, criar migration e preflight transacional; não tocar nos dados financeiros reais. Depois voltar ao harness DB/OFX live conforme os bloqueios acima.
