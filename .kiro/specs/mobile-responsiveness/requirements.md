# Requirements Document: Responsividade Mobile Completa

## Introduction

Ajustar todo o sistema para funcionar perfeitamente em dispositivos móveis (Chrome e Safari), corrigindo problemas de layout, espaçamento, overflow, tamanho de fonte, botões e interações touch.

## Glossary

- **Sistema**: Aplicação Pé de Meia (gerenciador financeiro)
- **Mobile**: Dispositivos com largura de tela < 768px
- **Chrome_Mobile**: Navegador Chrome em dispositivos móveis
- **Safari_Mobile**: Navegador Safari em dispositivos iOS
- **Viewport**: Área visível da tela do dispositivo
- **Touch_Target**: Área clicável/tocável de um elemento (mínimo 44x44px)
- **Overflow**: Conteúdo que ultrapassa os limites do container

## Requirements

### Requirement 1: Layout e Containers

**User Story:** Como usuário mobile, quero que todo o conteúdo caiba na tela sem scroll horizontal, para que eu possa navegar facilmente.

#### Acceptance Criteria

1. WHEN visualizando qualquer página em mobile, THE Sistema SHALL garantir que não haja scroll horizontal
2. WHEN o conteúdo exceder a largura da tela, THE Sistema SHALL quebrar linhas ou empilhar elementos verticalmente
3. THE Sistema SHALL usar padding responsivo (px-4 em mobile, px-6 em tablet, px-8 em desktop)
4. WHEN em mobile, THE Sistema SHALL reduzir gaps entre elementos (gap-2 ao invés de gap-4)

### Requirement 2: Tipografia e Legibilidade

**User Story:** Como usuário mobile, quero que os textos sejam legíveis sem zoom, para que eu possa ler confortavelmente.

#### Acceptance Criteria

1. THE Sistema SHALL usar tamanho mínimo de fonte de 14px para texto corpo em mobile
2. WHEN exibindo títulos em mobile, THE Sistema SHALL reduzir tamanhos (text-2xl ao invés de text-4xl)
3. THE Sistema SHALL garantir contraste mínimo de 4.5:1 entre texto e fundo
4. WHEN exibindo valores monetários, THE Sistema SHALL usar fonte mono legível (min 16px)

### Requirement 3: Botões e Touch Targets

**User Story:** Como usuário mobile, quero que todos os botões sejam fáceis de tocar, para que eu não clique no elemento errado.

#### Acceptance Criteria

1. THE Sistema SHALL garantir que todos os botões tenham tamanho mínimo de 44x44px
2. WHEN exibindo múltiplos botões, THE Sistema SHALL manter espaçamento mínimo de 8px entre eles
3. THE Sistema SHALL usar botões full-width em mobile quando apropriado
4. WHEN em mobile, THE Sistema SHALL aumentar padding interno dos botões (px-6 py-3)

### Requirement 4: Cards e Listas

**User Story:** Como usuário mobile, quero que cards e listas sejam compactos mas legíveis, para que eu veja mais informação sem scroll excessivo.

#### Acceptance Criteria

1. WHEN exibindo cards em mobile, THE Sistema SHALL usar layout de coluna única (grid-cols-1)
2. THE Sistema SHALL reduzir padding interno de cards em mobile (p-3 ao invés de p-6)
3. WHEN exibindo listas, THE Sistema SHALL usar altura de linha adequada (leading-relaxed)
4. THE Sistema SHALL truncar textos longos com ellipsis quando necessário

### Requirement 5: Formulários e Inputs

**User Story:** Como usuário mobile, quero que formulários sejam fáceis de preencher, para que eu possa inserir dados rapidamente.

#### Acceptance Criteria

1. THE Sistema SHALL usar inputs full-width em mobile
2. WHEN exibindo labels, THE Sistema SHALL posicioná-los acima dos inputs em mobile
3. THE Sistema SHALL usar teclado apropriado para cada tipo de input (numeric, email, etc)
4. WHEN em mobile, THE Sistema SHALL aumentar altura dos inputs (h-12 ao invés de h-10)

### Requirement 6: Navegação e Menu

**User Story:** Como usuário mobile, quero que o menu seja acessível e não ocupe muito espaço, para que eu possa navegar facilmente.

#### Acceptance Criteria

1. WHEN em mobile, THE Sistema SHALL usar menu hamburguer ao invés de menu horizontal
2. THE Sistema SHALL garantir que o menu mobile seja acessível com uma mão
3. WHEN o menu mobile está aberto, THE Sistema SHALL permitir fechar tocando fora dele
4. THE Sistema SHALL manter botões de ação principais sempre visíveis

### Requirement 7: Tabelas e Dados Tabulares

**User Story:** Como usuário mobile, quero que tabelas sejam legíveis, para que eu possa ver informações importantes.

#### Acceptance Criteria

1. WHEN exibindo tabelas em mobile, THE Sistema SHALL converter para cards verticais
2. THE Sistema SHALL priorizar informações mais importantes no topo
3. WHEN necessário, THE Sistema SHALL permitir scroll horizontal apenas na tabela
4. THE Sistema SHALL ocultar colunas menos importantes em mobile

### Requirement 8: Modais e Dialogs

**User Story:** Como usuário mobile, quero que modais ocupem a tela toda, para que eu possa interagir facilmente.

#### Acceptance Criteria

1. WHEN exibindo modal em mobile, THE Sistema SHALL usar fullscreen ou quase fullscreen
2. THE Sistema SHALL garantir que botões de ação estejam sempre visíveis (sticky footer)
3. WHEN modal tem scroll, THE Sistema SHALL manter header fixo
4. THE Sistema SHALL permitir fechar modal com gesto de swipe down

### Requirement 9: Imagens e Ícones

**User Story:** Como usuário mobile, quero que imagens e ícones sejam proporcionais, para que a interface seja harmoniosa.

#### Acceptance Criteria

1. THE Sistema SHALL reduzir tamanho de ícones em mobile (h-4 w-4 ao invés de h-6 w-6)
2. WHEN exibindo logos de bancos, THE Sistema SHALL usar tamanho apropriado (32px em mobile)
3. THE Sistema SHALL garantir que imagens sejam responsivas (max-w-full)
4. THE Sistema SHALL usar lazy loading para imagens

### Requirement 10: Performance e Animações

**User Story:** Como usuário mobile, quero que o app seja rápido e fluido, para que eu tenha boa experiência.

#### Acceptance Criteria

1. THE Sistema SHALL reduzir ou desabilitar animações complexas em mobile
2. WHEN em conexão lenta, THE Sistema SHALL priorizar conteúdo essencial
3. THE Sistema SHALL usar transições CSS ao invés de JavaScript quando possível
4. THE Sistema SHALL garantir que scroll seja suave (scroll-smooth)

### Requirement 11: Orientação e Viewport

**User Story:** Como usuário mobile, quero que o app funcione em portrait e landscape, para que eu possa usar como preferir.

#### Acceptance Criteria

1. THE Sistema SHALL funcionar corretamente em orientação portrait
2. THE Sistema SHALL funcionar corretamente em orientação landscape
3. WHEN mudando orientação, THE Sistema SHALL manter estado da aplicação
4. THE Sistema SHALL usar viewport meta tag correta

### Requirement 12: Gestos e Interações Touch

**User Story:** Como usuário mobile, quero usar gestos naturais, para que a interação seja intuitiva.

#### Acceptance Criteria

1. THE Sistema SHALL suportar swipe para voltar em navegação
2. WHEN apropriado, THE Sistema SHALL suportar pull-to-refresh
3. THE Sistema SHALL suportar long-press para ações secundárias
4. THE Sistema SHALL prevenir zoom acidental em inputs

### Requirement 13: Páginas Específicas - Dashboard

**User Story:** Como usuário mobile, quero que o dashboard seja compacto e informativo, para que eu veja meu resumo financeiro rapidamente.

#### Acceptance Criteria

1. WHEN em mobile, THE Sistema SHALL empilhar cards de resumo verticalmente
2. THE Sistema SHALL reduzir tamanho de fonte do saldo principal (text-4xl ao invés de text-6xl)
3. THE Sistema SHALL usar grid de 2 colunas para saldos em moedas estrangeiras
4. THE Sistema SHALL manter gráficos legíveis em telas pequenas

### Requirement 14: Páginas Específicas - Transações

**User Story:** Como usuário mobile, quero que a lista de transações seja fácil de ler e interagir, para que eu possa gerenciar minhas finanças.

#### Acceptance Criteria

1. WHEN em mobile, THE Sistema SHALL usar layout compacto para itens de transação
2. THE Sistema SHALL empilhar filtros verticalmente
3. THE Sistema SHALL usar botões de ação menores mas tocáveis
4. THE Sistema SHALL truncar descrições longas com ellipsis

### Requirement 15: Páginas Específicas - Viagens

**User Story:** Como usuário mobile, quero que a página de viagens seja navegável, para que eu possa acompanhar gastos de viagem.

#### Acceptance Criteria

1. WHEN em mobile, THE Sistema SHALL usar grid de 2 colunas para cards de resumo
2. THE Sistema SHALL empilhar botões de ação verticalmente
3. THE Sistema SHALL reduzir padding do header da viagem
4. THE Sistema SHALL usar tabs scrolláveis horizontalmente

### Requirement 16: Páginas Específicas - Compartilhados

**User Story:** Como usuário mobile, quero que a página de compartilhados seja clara, para que eu veja quem me deve e quem eu devo.

#### Acceptance Criteria

1. WHEN em mobile, THE Sistema SHALL usar cards full-width para membros
2. THE Sistema SHALL empilhar informações de saldo verticalmente
3. THE Sistema SHALL usar botões de acerto full-width
4. THE Sistema SHALL agrupar itens de forma compacta

### Requirement 17: Safari iOS Específico

**User Story:** Como usuário iOS, quero que o app funcione perfeitamente no Safari, para que eu tenha a mesma experiência que no Chrome.

#### Acceptance Criteria

1. THE Sistema SHALL usar -webkit-prefixes quando necessário
2. THE Sistema SHALL prevenir bounce scroll indesejado
3. THE Sistema SHALL garantir que inputs não causem zoom automático (font-size >= 16px)
4. THE Sistema SHALL usar safe-area-inset para notch/home indicator
