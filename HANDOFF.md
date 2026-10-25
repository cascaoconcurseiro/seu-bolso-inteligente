# HANDOFF.md — Ponto de Continuidade

> Última atualização: 2026-10-25

## Estado confirmado

- Repositório em `C:\Users\Wesley\.codex\worktrees\rpc-audit-release\seu-bolso-inteligente`, branch `codex/audit-release-20261024`, base `d06b9bb7`. Correções da sessão estão no worktree, ainda sem commit/push; produção não recebeu as mudanças de frontend.
- Divisão financeira: percentuais usam alocação com precisão de centavos e resíduo final; o modal bloqueia total zero, fatia zero/subcentavos, excesso e o caso de pagador terceiro + usuário 100% quando falta `currentUserMemberId`. Revisão independente final aprovou; testes cobrindo os casos.
- Backup: restore está removido/desativado porque o fluxo antigo apagava/inseria sequencialmente, sem atomicidade e com risco de cascata em dados compartilhados. Export continua disponível, informa que o JSON é parcial/sem criptografia/sem snapshot e pode conter dados compartilhados e identificadores de terceiros. Teste do export valida as 14 consultas, JSON, download e revogação da URL; restore precisa ser reimplementado conforme `docs/BACKUP_RESTORE_V2_CONTRACT.md`, incluindo a decisão do usuário de substituir também os dados compartilhados.
- React Router foi atualizado de 6 para 7.18.4; snapshots foram ajustados. `npm test`: 345 passaram/19 ignorados (51 arquivos passaram, 2 ignorados). Playwright: 114/115 passaram em Chromium, Firefox, WebKit, Chrome móvel e Safari móvel; 1 skip esperado no viewport desktop em Safari móvel. `npm run typecheck`, build, ESLint (0 erros, 218 warnings), formato focal, secret scan e `git diff --check` passaram. O teste do itinerário usa `fireEvent.change` para evitar timeout artificial por digitação caractere a caractere.
- `npm audit`: três findings moderados restantes, todos no encadeamento Tailwind 3/PostCSS. Revisão de migração recomenda decidir primeiro o piso suportado de iOS/Safari; Tailwind 4 muda diretivas CSS, configuração e plugin.
- Três migrations foram aplicadas no Supabase e pós-verificadas: `20261025110222_revoke_legacy_undo_shared_settlements_for_clients.sql` (sem execução por `anon`/`authenticated`, disponível a `service_role`); `20261025124500_revoke_client_access_to_invoice_stub.sql` (stub de faturas sem cliente e sem job `pg_cron`); `20261025133000_disable_legacy_admin_reset_rpcs.sql` (funções destrutivas de reset sem execução por `anon`, `authenticated` e `service_role`, conforme decisão do usuário de manter painel admin desativado). O dry-run reporta remoto up-to-date; 325 migrations locais e remotas.
- `db lint` live reporta seis erros reais em RPCs antigas (`confirm_settlement`, `reject_settlement_request`, referências antigas a `financial_ledger` e resets) e um falso positivo de tabela temporária em `soft_delete_transaction`, além de warnings. As funções legadas não têm callers conhecidos no repo, mas não foram removidas sem excluir consumidores externos; as duas funções de reset agora estão inacessíveis a todos os papéis de API.
- Checklist: 364/398 caixas concluídas (34 abertas; 8,5% das caixas); grupo AUDIT 189/212 (23 abertas; 10,8%). Percentuais contam caixas, não esforço ou cobertura.

## Bloqueios e pendências

1. **Release frontend:** código local ainda não foi publicado. O último bloqueio documentado foi incompatibilidade entre email do autor do commit e uma conta Git/Vercel reconhecida. Confirmar identidade/autoria aceita, concluir revisão local e cumprir o push autorizado para `main`; depois validar deployment e comportamento autenticado.
2. **OFX live:** a permissão da extensão Brave foi confirmada pelo usuário, mas a ferramenta de computador não conseguiu identificar com confiança a URL da janela ativa (estava em MyClaw.ai). Nenhum arquivo foi enviado. Retomar somente quando a origem de `meupedemeia.vercel.app` for identificada pela ferramenta; não contornar a barreira com outro mecanismo.
3. **Harness DB:** o job CI não tem `SUPABASE_DB_URL`; a auditoria live de isolamento precisa DSN/CA TLS validado e fixtures não-admin pré-provisionadas. Não considerar o gate aprovado por catálogos/queries isoladas.
4. **RPCs legadas:** revisar possibilidade de consumidores externos/service-role antes de remover as quatro RPCs antigas de acerto/saldo e limpar os erros restantes do `db lint`. O preflight da última tentativa de `db push --dry-run` falhou uma vez por autenticação da role temporária; retry do push aplicou a migration com sucesso e dry-run posterior ficou up-to-date.
5. **Backup/restore:** snapshot ainda não consistente e restauração desativada; implementar staging e RPC transacional com rollback, vínculos/PII compartilhados e teste em banco isolado.
6. **Outras lacunas:** upload OFX, verificação autenticada de CRUDs e cálculos financeiros, warnings do `db lint`, e advisories Tailwind. Reconciliar itens históricos no `CHECKLIST.md` sem transformar contagem de caixas em cobertura total.

## Próximo passo concreto

Revisar o diff final (incluindo os snapshots de Router), confirmar que `public/version.json` gerado foi restaurado, executar o status/diff/log e verificar `git config user.email`; depois concluir a entrega autorizada em `main` sem contornar proteção ou identidade do Vercel. Em seguida, validar o deployment e retomar pelo OFX com origem reconhecida ou pelo contrato de backup atômico.
