# Auditoria de produto e engenharia - 12/07/2026

## Veredito executivo

O produto tem amplitude funcional acima de um MVP: contas, cartões, compartilhamento,
viagens, metas, investimentos, relatórios, PWA, notificações e exportações já formam uma
proposta real. Porém, ele ainda não deve ser tratado como pronto para público geral. O
principal risco não é visual; é a falta de um contrato financeiro estável, segurança de RPCs
privilegiadas e uma suíte de regressão confiável.

Status honesto: **beta privada**, não lançamento público.

## Evidências verificadas

- Build de produção: aprovado (4.932 módulos).
- Estado inicial auditado: 249 testes aprovados, 45 falharam e 19 foram ignorados.
- Estado final após integrar a `main`: 239 aprovados, 19 ignorados e nenhuma falha.
- Lint global: 1 erro e 889 avisos antes desta intervenção.
- Supabase: 36/36 tabelas públicas com RLS.
- Advisors Supabase: 131 achados de segurança e 90 de performance.
- Funções privilegiadas executáveis por `anon`: 57 no início; as duas RPCs de criação de
  transações foram corrigidas nesta entrega, mas o restante exige revisão por função.
- Dependências: 4 vulnerabilidades conhecidas (1 alta, 3 moderadas). A alta está no Vite de
  desenvolvimento; a correção automática exige salto de versão principal e teste dedicado.
- Bundle: `page-shared` ~575 kB e `page-trips` ~313 kB antes de gzip; ambos merecem divisão.
- Runtime: foi encontrado e corrigido um import duplicado de `Label` que impedia o app de
  carregar, apesar de o build finalizar.

## P0 - bloqueia lançamento

### 1. Contrato numérico financeiro - estabilizado nesta entrega

No estado inicial, `SafeFinancialCalculator` retornava instâncias de `Decimal`, enquanto
testes e consumidores esperavam `number`. Isso respondia por grande parte das 45 falhas.
Os commits integrados da `main` estabilizaram o contrato e a suíte voltou a ficar verde. A
decisão deve permanecer única e explícita:

- domínio usa centavos inteiros ou `Decimal`;
- bordas de API fazem serialização/deserialização;
- UI recebe tipos formatáveis, nunca mistura `Decimal` e `number` silenciosamente;
- testes de propriedade validam soma de parcelas, arredondamento e liquidação.

Este item deixa de ser bloqueio imediato, mas continua sendo uma regra arquitetural para não
regredir, especialmente quando o cliente Swift for criado.

### 2. Superfície privilegiada do Supabase

Os advisors ainda reportam 56 RPCs `SECURITY DEFINER` executáveis por `anon` e 71 executáveis
por `authenticated`. Executar como autenticado pode ser legítimo; executar como anônimo em
operações financeiras/admin não é. Cada função precisa de:

- `REVOKE ... FROM PUBLIC, anon` por padrão;
- identidade derivada de `auth.uid()`, nunca confiada a um `p_user_id` do cliente;
- validação de ownership/participação no banco;
- `search_path` fixo e nomes de objetos qualificados;
- teste negativo para usuário A tentando alterar dados do usuário B.

As RPCs `create_transaction_with_splits` e `create_installment_series` já foram corrigidas.

### 3. Pipeline de regressão - parcialmente resolvido

A suíte unitária está verde e a `main` integrada adicionou CI. O lint global ainda acumula
centenas de avisos e o pipeline precisa evoluir para:

1. typecheck;
2. lint sem erros;
3. testes unitários e de propriedade;
4. testes de integração contra branch Supabase descartável;
5. smoke E2E de login, criar/editar/excluir transação, compartilhar e liquidar dívida.

## P1 - necessário para beta pública

### Front-end e arquitetura

- 211 componentes TSX e uso disseminado de `any` reduzem a proteção oferecida pelo TypeScript.
- `TripItinerary` ainda concentra consulta, mutações, formulário, serialização legada e tela;
  separar em repositório/hook, formulário, mapa e lista.
- O fallback da RPC compartilhada faz escrita direta em duas etapas. Depois da RPC estável,
  remover esse fallback para não reintroduzir transação órfã ou contornar regras do servidor.
- Padronizar erros de domínio com códigos estáveis; textos de toast não devem ser usados como
  lógica de controle.
- Instrumentar Sentry no deploy. O build atual não publica release nem source maps por falta
  de token.
- Dividir bundles de compartilhados, viagens, gráficos e exportações sob demanda.

### Banco e performance

- Há 64 índices reportados como não utilizados. Não remover em lote: medir em produção por
  pelo menos um ciclo de uso e eliminar apenas redundâncias comprovadas.
- Existem 26 casos de políticas permissivas múltiplas. Consolidar por operação reduz custo e
  torna autorização auditável.
- `admin_users` tem RLS sem policy; confirmar se a intenção é acesso exclusivo por função
  privada ou criar política administrativa explícita.
- `pg_trgm` está em `public`; mover para schema de extensões numa migração planejada.
- Ativar proteção contra senhas vazadas e oferecer MFA forte antes de armazenar dados
  financeiros de público real.

### UX e acessibilidade

- A navegação cobre muitas áreas, mas a arquitetura de informação expõe complexidade cedo.
  Definir jornadas primárias: registrar, entender o mês, pagar fatura, dividir e acertar.
- Há alerta de nesting inválido (`div` dentro de `p`) no dashboard e snapshots obsoletos.
- Fazer auditoria WCAG com teclado, leitores de tela, foco em modais, contraste e alvos de 44px.
- Estados vazios, carregamento, offline, erro e conflito precisam ser consistentes em cada
  jornada financeira; PWA sem clareza de sincronização pode gerar dupla submissão.

### Design e direção de arte

O sistema tem identidade, mas usa decoração como padrão: 186 ocorrências de `rounded-2xl`,
291 de caixa alta, 138 de espaçamento largo, 71 de blur, 57 de gradientes e 233 de animação.
Isso diminui hierarquia e densidade em um produto de uso recorrente.

Direção recomendada:

- superfícies operacionais mais planas, com raio de 6-8px;
- caixa alta apenas para rótulos curtos, sem tracking excessivo;
- animação reservada a transições de estado e confirmação;
- cor semântica para receita, despesa, alerta e seleção, não como decoração;
- tipografia e espaçamento com escala pequena e previsível;
- gráficos e saldos com acessibilidade e comparação antes de impacto visual.

## Viagens e mapa

Foi criada a primeira fundação correta:

- mapa OpenStreetMap dentro do roteiro;
- marcadores numerados e linha na ordem das atividades;
- enquadramento automático;
- geocodificação ao salvar o local;
- `latitude`, `longitude` e `maps_url` estruturados no Supabase;
- compatibilidade de leitura com metadados antigos embutidos na descrição.

Limite atual: a linha conecta pontos em ordem, mas ainda não calcula rota por ruas nem tempo de
deslocamento. A próxima etapa deve usar um provedor de roteamento (OSRM/Mapbox/Google Routes),
persistir modo de transporte e permitir reordenação por arrastar. Geocodificação pública do
Nominatim deve receber cache/proxy e respeitar limites antes de escala comercial.

## Preparação para iPhone

O Supabase pode ser a base do app nativo, mas a regra de negócio não deve viver apenas no
React. O alvo arquitetural é:

- regras críticas em RPCs seguras e idempotentes;
- DTOs versionados e tipos gerados para TypeScript e Swift;
- valores monetários com contrato único (centavos/decimal + moeda ISO 4217);
- datas com semântica explícita de data civil versus instante UTC;
- autenticação, RLS e autorização testadas sem confiar no cliente;
- observabilidade por `request_id`, versão do app e chave de idempotência;
- migrações forward-only verificadas em branch antes da produção.

## Sequência recomendada

1. Semana 1: fechar RPCs anônimas e transformar avisos críticos de lint em bloqueios.
2. Semana 2: E2E das cinco jornadas críticas, CI obrigatório e observabilidade.
3. Semana 3: simplificar UX/navegação e consolidar sistema visual.
4. Semana 4: beta com grupo pequeno, métricas de erro, retenção e suporte.
5. Após estabilidade: API/DTO v1 e protótipo Swift usando o mesmo Supabase.

Critério de saída da beta: zero P0, testes críticos 100% verdes, nenhuma RPC financeira
anônima, restauração de backup testada e duas semanas sem erro financeiro confirmado.
