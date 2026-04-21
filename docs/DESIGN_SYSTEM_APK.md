# 🎨 DESIGN SYSTEM COMPLETO - APK PÉ DE MEIA

**Data:** 21/04/2026  
**Versão:** 1.0  
**Objetivo:** Documentação completa do design system para desenvolvimento do APK Android

---

## 📋 ÍNDICE

1. [Filosofia de Design](#filosofia-de-design)
2. [Paleta de Cores](#paleta-de-cores)
3. [Tipografia](#tipografia)
4. [Espaçamentos e Grid](#espaçamentos-e-grid)
5. [Componentes UI](#componentes-ui)
6. [Animações e Transições](#animações-e-transições)
7. [Ícones](#ícones)
8. [Layout e Navegação](#layout-e-navegação)
9. [Estados e Feedback](#estados-e-feedback)
10. [Acessibilidade](#acessibilidade)
11. [Responsividade Mobile](#responsividade-mobile)

---

## 🎯 FILOSOFIA DE DESIGN

### Conceito: **Minimal Finance**

O design do Pé de Meia segue uma filosofia minimalista e elegante:

- **Simplicidade**: Interface limpa, sem elementos desnecessários
- **Contraste**: Uso de preto e branco como cores principais
- **Clareza**: Hierarquia visual clara e objetiva
- **Elegância**: Tipografia sofisticada e espaçamentos generosos
- **Funcionalidade**: Cada elemento tem um propósito claro

### Princípios de Design

1. **Content First**: O conteúdo financeiro é sempre a prioridade
2. **Minimal Distractions**: Sem cores vibrantes que distraiam
3. **Clear Hierarchy**: Hierarquia tipográfica bem definida
4. **Smooth Interactions**: Animações suaves e naturais
5. **Consistent Patterns**: Padrões consistentes em toda aplicação

---

## 🎨 PALETA DE CORES

### Sistema de Cores HSL

O sistema usa HSL (Hue, Saturation, Lightness) para facilitar temas light/dark.

### Light Mode (Modo Claro)

```css
/* Cores Base */
--background: 0 0% 100%        /* #FFFFFF - Branco puro */
--foreground: 0 0% 8%          /* #141414 - Quase preto */

/* Cards e Superfícies */
--card: 0 0% 99%               /* #FCFCFC - Off-white sutil */
--card-foreground: 0 0% 8%     /* #141414 */

/* Popover e Modais */
--popover: 0 0% 100%           /* #FFFFFF */
--popover-foreground: 0 0% 8%  /* #141414 */

/* Primária (Preto) */
--primary: 0 0% 8%             /* #141414 - Preto como primária */
--primary-foreground: 0 0% 100% /* #FFFFFF */

/* Secundária (Cinza Claro) */
--secondary: 0 0% 96%          /* #F5F5F5 */
--secondary-foreground: 0 0% 8% /* #141414 */

/* Muted (Elementos desabilitados) */
--muted: 0 0% 94%              /* #F0F0F0 */
--muted-foreground: 0 0% 45%   /* #737373 */

/* Accent (Destaque) */
--accent: 0 0% 96%             /* #F5F5F5 */
--accent-foreground: 0 0% 8%   /* #141414 */

/* Bordas e Inputs */
--border: 0 0% 90%             /* #E6E6E6 */
--input: 0 0% 90%              /* #E6E6E6 */
--ring: 0 0% 8%                /* #141414 - Focus ring */

/* Estados Semânticos */
--destructive: 0 72% 51%       /* #E11D48 - Vermelho */
--destructive-foreground: 0 0% 100% /* #FFFFFF */

--success: 142 71% 45%         /* #16A34A - Verde */
--success-foreground: 0 0% 100% /* #FFFFFF */

--warning: 38 92% 50%          /* #F59E0B - Âmbar */
--warning-foreground: 0 0% 8%  /* #141414 */

/* Cores Financeiras */
--positive: 142 71% 45%        /* #16A34A - Verde (receitas) */
--negative: 0 72% 51%          /* #E11D48 - Vermelho (despesas) */
--neutral: 0 0% 45%            /* #737373 - Cinza (neutro) */
```

### Dark Mode (Modo Escuro)

```css
/* Cores Base */
--background: 0 0% 4%          /* #0A0A0A - Quase preto */
--foreground: 0 0% 95%         /* #F2F2F2 - Off-white */

/* Cards e Superfícies */
--card: 0 0% 7%                /* #121212 */
--card-foreground: 0 0% 95%    /* #F2F2F2 */

/* Popover e Modais */
--popover: 0 0% 7%             /* #121212 */
--popover-foreground: 0 0% 95% /* #F2F2F2 */

/* Primária (Branco) */
--primary: 0 0% 100%           /* #FFFFFF - Branco como primária */
--primary-foreground: 0 0% 4%  /* #0A0A0A */

/* Secundária (Cinza Escuro) */
--secondary: 0 0% 12%          /* #1F1F1F */
--secondary-foreground: 0 0% 95% /* #F2F2F2 */

/* Muted */
--muted: 0 0% 15%              /* #262626 */
--muted-foreground: 0 0% 60%   /* #999999 */

/* Accent */
--accent: 0 0% 15%             /* #262626 */
--accent-foreground: 0 0% 95%  /* #F2F2F2 */

/* Bordas e Inputs */
--border: 0 0% 18%             /* #2E2E2E */
--input: 0 0% 18%              /* #2E2E2E */
--ring: 0 0% 100%              /* #FFFFFF */

/* Estados Semânticos */
--destructive: 0 62% 55%       /* #EF4444 */
--destructive-foreground: 0 0% 100% /* #FFFFFF */

--success: 142 61% 50%         /* #22C55E */
--success-foreground: 0 0% 4%  /* #0A0A0A */

--warning: 38 82% 55%          /* #FBBF24 */
--warning-foreground: 0 0% 4%  /* #0A0A0A */

/* Cores Financeiras */
--positive: 142 61% 50%        /* #22C55E */
--negative: 0 62% 55%          /* #EF4444 */
--neutral: 0 0% 60%            /* #999999 */
```

### Uso das Cores

#### Cores Primárias
- **Preto (#141414)**: Botões primários, textos principais, ícones
- **Branco (#FFFFFF)**: Backgrounds, textos em botões escuros

#### Cores Secundárias
- **Cinza Claro (#F5F5F5)**: Botões secundários, backgrounds alternativos
- **Cinza Médio (#737373)**: Textos secundários, placeholders

#### Cores Semânticas
- **Verde (#16A34A)**: Receitas, sucesso, confirmações
- **Vermelho (#E11D48)**: Despesas, erros, exclusões
- **Âmbar (#F59E0B)**: Avisos, alertas, pendências

---

## ✍️ TIPOGRAFIA

### Fontes

O sistema usa 3 famílias tipográficas:

#### 1. Space Grotesk (Display/Títulos)
- **Uso**: Títulos, headings, logo, destaques
- **Características**: Geométrica, moderna, alta legibilidade
- **Pesos**: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
- **Fallback**: system-ui, sans-serif

#### 2. Inter (Corpo/UI)
- **Uso**: Textos de corpo, labels, botões, UI geral
- **Características**: Humanista, otimizada para telas
- **Pesos**: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
- **Fallback**: system-ui, sans-serif

#### 3. JetBrains Mono (Números/Valores)
- **Uso**: Valores monetários, números, códigos
- **Características**: Monospace, tabular nums, alta legibilidade
- **Pesos**: 400 (Regular), 500 (Medium), 600 (Semibold)
- **Fallback**: monospace

### Escala Tipográfica

```css
/* Headings */
h1, .h1 {
  font-family: 'Space Grotesk';
  font-weight: 600;
  font-size: 2.25rem;      /* 36px */
  line-height: 1.2;
  letter-spacing: -0.02em;
}

@media (min-width: 768px) {
  h1, .h1 {
    font-size: 3rem;       /* 48px */
  }
}

h2, .h2 {
  font-family: 'Space Grotesk';
  font-weight: 600;
  font-size: 1.5rem;       /* 24px */
  line-height: 1.3;
  letter-spacing: -0.01em;
}

@media (min-width: 768px) {
  h2, .h2 {
    font-size: 1.875rem;   /* 30px */
  }
}

h3, .h3 {
  font-family: 'Space Grotesk';
  font-weight: 500;
  font-size: 1.25rem;      /* 20px */
  line-height: 1.4;
}

@media (min-width: 768px) {
  h3, .h3 {
    font-size: 1.5rem;     /* 24px */
  }
}

h4, .h4 {
  font-family: 'Inter';
  font-weight: 600;
  font-size: 1.125rem;     /* 18px */
  line-height: 1.5;
}

/* Body Text */
body {
  font-family: 'Inter';
  font-weight: 400;
  font-size: 1rem;         /* 16px */
  line-height: 1.6;
}

/* Valores Financeiros */
.value-display {
  font-family: 'JetBrains Mono';
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

/* Tamanhos de Texto */
.text-xs { font-size: 0.75rem; }    /* 12px */
.text-sm { font-size: 0.875rem; }   /* 14px */
.text-base { font-size: 1rem; }     /* 16px */
.text-lg { font-size: 1.125rem; }   /* 18px */
.text-xl { font-size: 1.25rem; }    /* 20px */
.text-2xl { font-size: 1.5rem; }    /* 24px */
.text-3xl { font-size: 1.875rem; }  /* 30px */
.text-4xl { font-size: 2.25rem; }   /* 36px */
```

### Classes Utilitárias de Texto

```css
/* Cores de Texto */
.text-positive { color: hsl(var(--positive)); }
.text-negative { color: hsl(var(--negative)); }
.text-neutral { color: hsl(var(--neutral)); }
.text-muted { color: hsl(var(--muted-foreground)); }

/* Pesos */
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }

/* Alinhamento */
.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }

/* Truncate */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

---

## 📐 ESPAÇAMENTOS E GRID

### Sistema de Espaçamento (8px base)

```css
/* Escala de Espaçamento */
0: 0px
1: 0.25rem  /* 4px */
2: 0.5rem   /* 8px */
3: 0.75rem  /* 12px */
4: 1rem     /* 16px */
5: 1.25rem  /* 20px */
6: 1.5rem   /* 24px */
8: 2rem     /* 32px */
10: 2.5rem  /* 40px */
12: 3rem    /* 48px */
16: 4rem    /* 64px */
20: 5rem    /* 80px */
24: 6rem    /* 96px */

/* Espaçamentos Customizados */
18: 4.5rem  /* 72px */
88: 22rem   /* 352px */
```

### Border Radius

```css
--radius: 0.75rem;  /* 12px - Base */

.rounded-sm: calc(var(--radius) - 4px)  /* 8px */
.rounded-md: calc(var(--radius) - 2px)  /* 10px */
.rounded-lg: var(--radius)              /* 12px */
.rounded-xl: 1rem                       /* 16px */
.rounded-2xl: 1.5rem                    /* 24px */
.rounded-full: 9999px                   /* Círculo */
```

### Container e Breakpoints

```css
/* Container */
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* Breakpoints */
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1400px /* Extra large */
```

### Grid System

```css
/* Grid de 12 colunas */
.grid {
  display: grid;
  gap: 1.5rem;
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
.grid-cols-12 { grid-template-columns: repeat(12, 1fr); }

/* Responsive */
@media (min-width: 768px) {
  .md:grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
  .md:grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
}
```


---

## 🧩 COMPONENTES UI

### 1. Botões (Button)

#### Variantes

**Primary (Padrão)**
```css
background: hsl(var(--primary))
color: hsl(var(--primary-foreground))
padding: 0.5rem 1rem
border-radius: var(--radius)
font-weight: 500
```

**Secondary**
```css
background: hsl(var(--secondary))
color: hsl(var(--secondary-foreground))
```

**Destructive**
```css
background: hsl(var(--destructive))
color: hsl(var(--destructive-foreground))
```

**Outline**
```css
background: transparent
border: 1px solid hsl(var(--border))
color: hsl(var(--foreground))
```

**Ghost**
```css
background: transparent
color: hsl(var(--foreground))
hover:background: hsl(var(--accent))
```

**Link**
```css
background: transparent
color: hsl(var(--primary))
text-decoration: underline
```

#### Tamanhos

```css
sm: height: 2.25rem (36px), padding: 0 0.75rem, text: 0.875rem
md: height: 2.5rem (40px), padding: 0 1rem, text: 1rem (padrão)
lg: height: 2.75rem (44px), padding: 0 1.5rem, text: 1.125rem
icon: width: 2.5rem, height: 2.5rem, padding: 0
```

#### Estados

- **Hover**: Escurece 5% (light) ou clareia 5% (dark)
- **Active**: Scale 0.95
- **Disabled**: Opacity 0.5, cursor not-allowed
- **Focus**: Ring 2px offset 2px

#### Exemplo de Uso
```jsx
<Button variant="default" size="md">
  Salvar
</Button>

<Button variant="destructive" size="sm">
  Excluir
</Button>

<Button variant="ghost" size="icon">
  <Icon />
</Button>
```

---

### 2. Cards

#### Estrutura Base

```css
background: hsl(var(--card))
color: hsl(var(--card-foreground))
border: 1px solid hsl(var(--border))
border-radius: var(--radius)
padding: 1.5rem
box-shadow: 0 1px 3px rgba(0,0,0,0.1)
```

#### Variantes

**Card Padrão**
- Background: --card
- Border: --border
- Padding: 1.5rem

**Card com Status**
- Border-left: 4px solid (cor do status)
- Cores: success (verde), warning (âmbar), danger (vermelho)

**Card Hover**
```css
transition: all 0.3s ease
hover:transform: translateY(-4px)
hover:box-shadow: 0 12px 30px rgba(0,0,0,0.15)
```

**Card Clickable**
```css
cursor: pointer
transition: all 0.2s ease
active:transform: scale(0.98)
```

#### Componentes do Card

```jsx
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descrição</CardDescription>
  </CardHeader>
  <CardContent>
    Conteúdo principal
  </CardContent>
  <CardFooter>
    Rodapé com ações
  </CardFooter>
</Card>
```

---

### 3. Inputs

#### Input de Texto

```css
height: 2.5rem (40px)
padding: 0.5rem 0.75rem
border: 1px solid hsl(var(--input))
border-radius: calc(var(--radius) - 2px)
background: hsl(var(--background))
font-size: 0.875rem
transition: all 0.2s

focus:outline: none
focus:ring: 2px hsl(var(--ring))
focus:border: hsl(var(--ring))

disabled:opacity: 0.5
disabled:cursor: not-allowed
```

#### Input de Moeda (Currency Input)

```jsx
<CurrencyInput
  value={1000.50}
  onChange={(value) => setValue(value)}
  placeholder="R$ 0,00"
/>
```

Características:
- Formatação automática: R$ 1.000,50
- Font: JetBrains Mono (monospace)
- Alinhamento: direita
- Aceita apenas números
- Máscara de moeda brasileira

#### Textarea

```css
min-height: 5rem (80px)
padding: 0.75rem
resize: vertical
```

#### Select

```css
height: 2.5rem
padding: 0.5rem 2.5rem 0.5rem 0.75rem
background-image: chevron-down icon
background-position: right 0.75rem center
```

---

### 4. Modais e Dialogs

#### Dialog (Modal)

```css
/* Overlay */
background: rgba(0, 0, 0, 0.5)
backdrop-filter: blur(4px)
z-index: 50

/* Content */
background: hsl(var(--background))
border-radius: var(--radius)
max-width: 32rem (512px)
padding: 1.5rem
box-shadow: 0 25px 50px rgba(0,0,0,0.25)
```

Estrutura:
```jsx
<Dialog>
  <DialogTrigger>Abrir</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título</DialogTitle>
      <DialogDescription>Descrição</DialogDescription>
    </DialogHeader>
    <DialogBody>
      Conteúdo
    </DialogBody>
    <DialogFooter>
      <Button>Cancelar</Button>
      <Button>Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Sheet (Drawer Lateral)

```css
position: fixed
top: 0
right: 0 (ou left: 0)
height: 100vh
width: 100% (mobile) ou 400px (desktop)
background: hsl(var(--background))
box-shadow: -4px 0 15px rgba(0,0,0,0.1)
z-index: 50
```

Animação:
- Entrada: slide from right
- Saída: slide to right
- Duração: 300ms ease-out

---

### 5. Badges

#### Variantes

**Default**
```css
background: hsl(var(--primary))
color: hsl(var(--primary-foreground))
padding: 0.125rem 0.625rem
border-radius: 9999px
font-size: 0.75rem
font-weight: 500
```

**Secondary**
```css
background: hsl(var(--secondary))
color: hsl(var(--secondary-foreground))
```

**Outline**
```css
background: transparent
border: 1px solid hsl(var(--border))
color: hsl(var(--foreground))
```

**Destructive**
```css
background: hsl(var(--destructive))
color: hsl(var(--destructive-foreground))
```

**Success**
```css
background: hsl(var(--success))
color: hsl(var(--success-foreground))
```

**Warning**
```css
background: hsl(var(--warning))
color: hsl(var(--warning-foreground))
```

#### Uso Financeiro

```jsx
<Badge variant="success">Receita</Badge>
<Badge variant="destructive">Despesa</Badge>
<Badge variant="secondary">Pendente</Badge>
```

---

### 6. Tabs

#### Estrutura

```jsx
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    Conteúdo 1
  </TabsContent>
  <TabsContent value="tab2">
    Conteúdo 2
  </TabsContent>
</Tabs>
```

#### Estilos

**TabsList**
```css
background: hsl(var(--muted))
border-radius: var(--radius)
padding: 0.25rem
display: inline-flex
gap: 0.25rem
```

**TabsTrigger**
```css
padding: 0.5rem 1rem
border-radius: calc(var(--radius) - 2px)
font-weight: 500
transition: all 0.2s

active:background: hsl(var(--background))
active:box-shadow: 0 1px 3px rgba(0,0,0,0.1)
```

---

### 7. Toast (Notificações)

#### Variantes

**Default**
```css
background: hsl(var(--background))
border: 1px solid hsl(var(--border))
color: hsl(var(--foreground))
```

**Success**
```css
background: hsl(var(--success))
color: hsl(var(--success-foreground))
```

**Error**
```css
background: hsl(var(--destructive))
color: hsl(var(--destructive-foreground))
```

**Warning**
```css
background: hsl(var(--warning))
color: hsl(var(--warning-foreground))
```

#### Posicionamento

```css
position: fixed
bottom: 1rem
right: 1rem
z-index: 100
max-width: 420px
```

#### Animação

- Entrada: slide-in from right + fade-in
- Saída: slide-out to right + fade-out
- Duração: 300ms ease-out
- Auto-dismiss: 5 segundos

---

### 8. Dropdown Menu

#### Estrutura

```jsx
<DropdownMenu>
  <DropdownMenuTrigger>
    <Button>Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Item 1</DropdownMenuItem>
    <DropdownMenuItem>Item 2</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Item 3</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

#### Estilos

**Content**
```css
background: hsl(var(--popover))
border: 1px solid hsl(var(--border))
border-radius: var(--radius)
padding: 0.25rem
min-width: 8rem
box-shadow: 0 10px 25px rgba(0,0,0,0.15)
```

**Item**
```css
padding: 0.5rem 0.75rem
border-radius: calc(var(--radius) - 4px)
cursor: pointer
transition: background 0.15s

hover:background: hsl(var(--accent))
focus:background: hsl(var(--accent))
```

---

### 9. Checkbox e Radio

#### Checkbox

```css
width: 1.25rem
height: 1.25rem
border: 2px solid hsl(var(--primary))
border-radius: 0.25rem
transition: all 0.2s

checked:background: hsl(var(--primary))
checked:border-color: hsl(var(--primary))
```

#### Radio

```css
width: 1.25rem
height: 1.25rem
border: 2px solid hsl(var(--primary))
border-radius: 9999px
transition: all 0.2s

checked:background: hsl(var(--primary))
checked:border-color: hsl(var(--primary))
```

---

### 10. Switch (Toggle)

```css
width: 2.75rem
height: 1.5rem
background: hsl(var(--input))
border-radius: 9999px
position: relative
transition: background 0.2s

checked:background: hsl(var(--primary))

/* Thumb */
width: 1.25rem
height: 1.25rem
background: white
border-radius: 9999px
transition: transform 0.2s

checked:transform: translateX(1.25rem)
```

---

### 11. Progress Bar

```css
height: 0.5rem
background: hsl(var(--muted))
border-radius: 9999px
overflow: hidden

/* Fill */
height: 100%
background: hsl(var(--primary))
border-radius: 9999px
transition: width 0.5s ease
```

Variantes de cor:
- Success: verde
- Warning: âmbar
- Danger: vermelho

---

### 12. Skeleton (Loading)

```css
background: linear-gradient(
  90deg,
  hsl(var(--muted)) 25%,
  hsl(var(--muted-foreground) / 0.1) 50%,
  hsl(var(--muted)) 75%
)
background-size: 200% 100%
animation: shimmer 1.5s infinite
border-radius: var(--radius)
```

Tamanhos comuns:
- Texto: height 1rem
- Título: height 1.5rem
- Card: height 8rem
- Avatar: width/height 2.5rem, border-radius 9999px

---

### 13. Avatar

#### Tamanhos

```css
xs: 1.5rem (24px)
sm: 2rem (32px)
md: 2.5rem (40px)
lg: 3rem (48px)
xl: 4rem (64px)
```

#### Estrutura

```jsx
<Avatar>
  <AvatarImage src="url" alt="Nome" />
  <AvatarFallback>AB</AvatarFallback>
</Avatar>
```

#### Fallback

- Usa iniciais do nome (2 letras)
- Background: cor aleatória baseada no ID
- Cores disponíveis: 10 opções (verde, azul, roxo, rosa, etc.)
- Ícones alternativos: 12 opções de avatares

---

### 14. Calendar (Calendário)

```css
background: hsl(var(--popover))
border: 1px solid hsl(var(--border))
border-radius: var(--radius)
padding: 1rem
```

Características:
- Navegação mês/ano
- Seleção de data única ou range
- Dias desabilitados
- Destaque de hoje
- Suporte a locale pt-BR

---

### 15. Accordion

```jsx
<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Título</AccordionTrigger>
    <AccordionContent>
      Conteúdo expansível
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

Animação:
- Expansão: height 0 → auto (200ms ease-out)
- Colapso: height auto → 0 (200ms ease-out)
- Ícone: rotate 0deg → 180deg

---

### 16. Table (Tabela)

```css
/* Table */
width: 100%
border-collapse: collapse

/* Header */
background: hsl(var(--muted))
font-weight: 600
text-align: left
padding: 0.75rem 1rem
border-bottom: 1px solid hsl(var(--border))

/* Row */
border-bottom: 1px solid hsl(var(--border))
transition: background 0.15s

hover:background: hsl(var(--muted) / 0.5)

/* Cell */
padding: 0.75rem 1rem
```

---

### 17. Popover

```css
background: hsl(var(--popover))
border: 1px solid hsl(var(--border))
border-radius: var(--radius)
padding: 1rem
box-shadow: 0 10px 25px rgba(0,0,0,0.15)
z-index: 50
```

Posicionamento:
- top, bottom, left, right
- Auto-ajuste se não couber na tela
- Arrow (seta) opcional

---

### 18. Tooltip

```css
background: hsl(var(--foreground))
color: hsl(var(--background))
padding: 0.5rem 0.75rem
border-radius: 0.375rem
font-size: 0.875rem
max-width: 16rem
z-index: 50
```

Animação:
- Fade-in: 150ms
- Delay: 400ms
- Posicionamento: top (padrão), bottom, left, right


---

## 🎬 ANIMAÇÕES E TRANSIÇÕES

### Princípios de Animação

1. **Suavidade**: Todas animações usam easing natural (ease-out)
2. **Rapidez**: Durações curtas (150-300ms) para não atrasar UX
3. **Propósito**: Cada animação tem um objetivo claro
4. **Performance**: Preferência por transform e opacity (GPU-accelerated)

### Durações Padrão

```css
fast: 150ms
normal: 300ms
slow: 500ms
```

### Easing Functions

```css
ease-out: cubic-bezier(0, 0, 0.2, 1)      /* Padrão */
ease-in: cubic-bezier(0.4, 0, 1, 1)
ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
spring: cubic-bezier(0.34, 1.56, 0.64, 1) /* Bounce suave */
```

### Animações Principais

#### 1. Fade In
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
animation: fadeIn 0.3s ease-out;
```

#### 2. Fade In Up (Slide + Fade)
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
animation: fadeInUp 0.5s ease-out;
```

#### 3. Scale In
```css
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
animation: scaleIn 0.4s ease-out;
```

#### 4. Slide Down (Menus)
```css
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
animation: slideDown 0.2s ease-out;
```

#### 5. Shimmer (Loading)
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
animation: shimmer 1.5s infinite;
```

#### 6. Soft Pulse (Atenção)
```css
@keyframes softPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
animation: softPulse 2s ease-in-out infinite;
```

#### 7. Wiggle (Erro)
```css
@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-3deg); }
  75% { transform: rotate(3deg); }
}
animation: wiggle 0.5s ease-in-out;
```

#### 8. Shake (Erro Crítico)
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}
animation: shake 0.5s ease-in-out;
```

#### 9. Heartbeat (Notificação)
```css
@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  14% { transform: scale(1.1); }
  28% { transform: scale(1); }
  42% { transform: scale(1.1); }
  70% { transform: scale(1); }
}
animation: heartbeat 1.5s ease-in-out infinite;
```

#### 10. Float (Hover)
```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
animation: float 3s ease-in-out infinite;
```

### Animações de Hover

```css
/* Lift (Cards) */
.hover-lift {
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
}
.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
}

/* Scale (Botões) */
.hover-scale {
  transition: transform 0.2s ease-out;
}
.hover-scale:hover {
  transform: scale(1.03);
}

/* Glow (Destaque) */
.hover-glow {
  transition: box-shadow 0.3s ease-out;
}
.hover-glow:hover {
  box-shadow: 0 0 20px hsl(var(--primary) / 0.3);
}
```

### Animações de Click

```css
/* Scale Down (Feedback tátil) */
.active-scale:active {
  transform: scale(0.95);
}

/* Press (Botões) */
.active-press:active {
  transform: translateY(2px);
}
```

### Stagger Animation (Listas)

```css
/* Aplicar em itens de lista */
.animate-stagger {
  opacity: 0;
  animation: staggerFadeIn 0.5s ease-out forwards;
}

/* Delays incrementais */
.stagger-1 { animation-delay: 0.05s; }
.stagger-2 { animation-delay: 0.1s; }
.stagger-3 { animation-delay: 0.15s; }
.stagger-4 { animation-delay: 0.2s; }
.stagger-5 { animation-delay: 0.25s; }
```

### Transições de Página

```css
/* Entrada de página */
.page-enter {
  animation: fadeInUp 0.5s ease-out;
}

/* Saída de página */
.page-exit {
  animation: fadeOut 0.3s ease-out;
}
```

### Reduced Motion

```css
/* Respeitar preferência do usuário */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 🎯 ÍCONES

### Biblioteca: Lucide React

**Características:**
- 1000+ ícones
- Consistentes e minimalistas
- Otimizados para SVG
- Customizáveis (tamanho, cor, stroke)

### Tamanhos Padrão

```jsx
xs: 12px (0.75rem)
sm: 16px (1rem)
md: 20px (1.25rem)
lg: 24px (1.5rem)
xl: 32px (2rem)
```

### Ícones Principais do App

#### Navegação
- `LayoutDashboard` - Dashboard/Início
- `ArrowLeftRight` - Transações
- `Wallet` - Contas
- `CreditCard` - Cartões
- `Users` - Compartilhados
- `Plane` - Viagens
- `UsersRound` - Família
- `BarChart3` - Relatórios
- `PiggyBank` - Orçamentos
- `Settings` - Configurações

#### Ações
- `Plus` - Adicionar
- `Pencil` - Editar
- `Trash2` - Excluir
- `Check` - Confirmar
- `X` - Fechar/Cancelar
- `Save` - Salvar
- `Download` - Baixar
- `Upload` - Enviar
- `Copy` - Copiar
- `Share2` - Compartilhar

#### Financeiro
- `TrendingUp` - Receita/Crescimento
- `TrendingDown` - Despesa/Queda
- `DollarSign` - Moeda
- `Receipt` - Recibo
- `Calculator` - Calculadora
- `Percent` - Porcentagem

#### Status
- `CheckCircle` - Sucesso
- `AlertCircle` - Aviso
- `XCircle` - Erro
- `Info` - Informação
- `Clock` - Pendente

#### UI
- `ChevronDown` - Expandir
- `ChevronUp` - Colapsar
- `ChevronLeft` - Voltar
- `ChevronRight` - Avançar
- `Menu` - Menu mobile
- `Search` - Buscar
- `Filter` - Filtrar
- `MoreVertical` - Mais opções
- `Eye` - Visualizar
- `EyeOff` - Ocultar

#### Tema
- `Sun` - Light mode
- `Moon` - Dark mode

### Uso

```jsx
import { Plus, Trash2, Check } from 'lucide-react';

<Plus className="h-4 w-4" />
<Trash2 className="h-5 w-5 text-destructive" />
<Check className="h-6 w-6 text-success" />
```

### Customização

```jsx
<Icon
  size={24}
  color="currentColor"
  strokeWidth={2}
  className="custom-class"
/>
```

---

## 📱 LAYOUT E NAVEGAÇÃO

### Estrutura do Layout

```
┌─────────────────────────────────────┐
│         TopBar (Header)             │
│  Logo | Nav | Actions | User        │
├─────────────────────────────────────┤
│      Month Selector + Actions       │
├─────────────────────────────────────┤
│                                     │
│         Main Content Area           │
│         (max-width: 1400px)         │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

### TopBar (Header)

**Desktop:**
```css
height: 4rem (64px)
padding: 0 2rem
background: hsl(var(--background) / 0.95)
backdrop-filter: blur(8px)
border-bottom: 1px solid hsl(var(--border))
position: sticky
top: 0
z-index: 50
```

**Mobile:**
```css
height: 3.5rem (56px)
padding: 0 0.75rem
```

Elementos:
1. Logo (esquerda)
2. Navegação horizontal (desktop)
3. Notificações
4. Toggle tema
5. Configurações
6. Avatar do usuário
7. Menu hamburger (mobile)

### Navegação Mobile

**Menu Lateral (Drawer):**
```css
position: fixed
top: 0
left: 0
width: 100%
height: 100vh
background: hsl(var(--background))
z-index: 100
```

Animação:
- Overlay: fade-in 200ms
- Menu: slide-in from top 300ms

Itens:
- Altura mínima: 44px (touch target)
- Padding: 1rem
- Ícone + Label
- Estado ativo destacado

### Month Selector

```css
height: 3.5rem (56px)
display: flex
justify-content: space-between
align-items: center
padding: 0.5rem 1.5rem
border-bottom: 1px solid hsl(var(--border))
```

Elementos:
1. Seletor de mês/ano (centro)
2. Botão "Nova transação" (direita)

### Main Content

```css
max-width: 1400px
margin: 0 auto
padding: 2rem (desktop) | 0.75rem (mobile)
```

### Grid de Cards

**Desktop:**
```css
display: grid
grid-template-columns: repeat(3, 1fr)
gap: 1.5rem
```

**Tablet:**
```css
grid-template-columns: repeat(2, 1fr)
gap: 1rem
```

**Mobile:**
```css
grid-template-columns: 1fr
gap: 0.75rem
```

### Navegação entre Páginas

**Transições:**
- Fade-in: 300ms
- Scroll to top automático
- Loading state durante navegação

**Breadcrumbs:**
```jsx
<Breadcrumb>
  <BreadcrumbItem>Início</BreadcrumbItem>
  <BreadcrumbSeparator />
  <BreadcrumbItem>Transações</BreadcrumbItem>
</Breadcrumb>
```

---

## ✅ ESTADOS E FEEDBACK

### Estados de Componentes

#### 1. Default (Padrão)
- Estado inicial do componente
- Cores normais
- Sem interação

#### 2. Hover
- Mouse sobre o elemento
- Mudança sutil de cor/sombra
- Cursor: pointer
- Duração: 150-200ms

#### 3. Focus
- Elemento focado (teclado)
- Ring de 2px
- Cor: --ring
- Offset: 2px
- Importante para acessibilidade

#### 4. Active/Pressed
- Elemento sendo clicado
- Scale: 0.95-0.98
- Feedback tátil imediato

#### 5. Disabled
- Elemento desabilitado
- Opacity: 0.5
- Cursor: not-allowed
- Sem interações

#### 6. Loading
- Operação em andamento
- Spinner ou skeleton
- Desabilita interações
- Feedback visual claro

#### 7. Error
- Estado de erro
- Cor: --destructive
- Mensagem de erro visível
- Animação: shake ou wiggle

#### 8. Success
- Operação bem-sucedida
- Cor: --success
- Feedback visual (check icon)
- Toast de confirmação

### Feedback Visual

#### Loading States

**Spinner:**
```jsx
<div className="animate-spin">
  <Loader2 className="h-4 w-4" />
</div>
```

**Skeleton:**
```jsx
<Skeleton className="h-4 w-full" />
<Skeleton className="h-8 w-3/4" />
```

**Progress Bar:**
```jsx
<Progress value={60} />
```

#### Toast Notifications

**Sucesso:**
```jsx
toast.success("Transação salva com sucesso!");
```

**Erro:**
```jsx
toast.error("Erro ao salvar transação");
```

**Aviso:**
```jsx
toast.warning("Orçamento quase excedido");
```

**Info:**
```jsx
toast.info("Nova atualização disponível");
```

#### Alert Dialogs

```jsx
<AlertDialog>
  <AlertDialogTrigger>Excluir</AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta ação não pode ser desfeita.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction>Confirmar</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Empty States

```jsx
<div className="text-center py-12">
  <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
  <h3 className="text-lg font-semibold mb-2">
    Nenhuma transação encontrada
  </h3>
  <p className="text-muted-foreground mb-4">
    Comece adicionando sua primeira transação
  </p>
  <Button>
    <Plus className="h-4 w-4 mr-2" />
    Nova Transação
  </Button>
</div>
```

### Error States

```jsx
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Erro</AlertTitle>
  <AlertDescription>
    Não foi possível carregar os dados. Tente novamente.
  </AlertDescription>
</Alert>
```

---

## ♿ ACESSIBILIDADE

### Princípios WCAG 2.1

1. **Perceptível**: Informação apresentada de forma perceptível
2. **Operável**: Interface operável por todos
3. **Compreensível**: Informação e operação compreensíveis
4. **Robusto**: Conteúdo robusto para tecnologias assistivas

### Contraste de Cores

**Mínimos WCAG AA:**
- Texto normal: 4.5:1
- Texto grande (18px+): 3:1
- Componentes UI: 3:1

**Nosso sistema:**
- Light mode: Preto (#141414) em Branco (#FFFFFF) = 19:1 ✅
- Dark mode: Branco (#F2F2F2) em Preto (#0A0A0A) = 18:1 ✅

### Navegação por Teclado

**Tab Order:**
- Ordem lógica de navegação
- Skip links para conteúdo principal
- Focus visível (ring)

**Atalhos:**
```
Tab: Próximo elemento
Shift + Tab: Elemento anterior
Enter/Space: Ativar botão/link
Esc: Fechar modal/dropdown
Arrow keys: Navegação em menus
```

### ARIA Labels

```jsx
<button aria-label="Fechar modal">
  <X className="h-4 w-4" />
</button>

<input
  aria-label="Valor da transação"
  aria-describedby="valor-help"
/>

<div role="alert" aria-live="polite">
  Transação salva com sucesso
</div>
```

### Tamanhos de Touch Target

**Mínimo:** 44x44px (iOS) / 48x48px (Android)

**Nosso padrão:**
- Botões: 40px (desktop) / 44px (mobile)
- Ícones clicáveis: 40px
- Itens de lista: 44px mínimo

### Textos Alternativos

```jsx
<img src="avatar.jpg" alt="Foto de perfil de João Silva" />

<Icon aria-hidden="true" /> {/* Decorativo */}

<button>
  <Plus aria-hidden="true" />
  <span>Adicionar</span> {/* Texto visível */}
</button>
```

### Formulários Acessíveis

```jsx
<Label htmlFor="email">E-mail</Label>
<Input
  id="email"
  type="email"
  aria-required="true"
  aria-invalid={hasError}
  aria-describedby="email-error"
/>
{hasError && (
  <span id="email-error" role="alert">
    E-mail inválido
  </span>
)}
```

### Screen Reader Support

- Landmarks semânticos (header, nav, main, footer)
- Headings hierárquicos (h1 → h6)
- Listas semânticas (ul, ol)
- Tabelas com headers
- Live regions para atualizações dinâmicas


---

## 📱 RESPONSIVIDADE MOBILE

### Breakpoints

```css
/* Mobile First Approach */
base: 0px      /* Mobile (padrão) */
sm: 640px      /* Mobile landscape */
md: 768px      /* Tablet */
lg: 1024px     /* Desktop */
xl: 1280px     /* Large desktop */
2xl: 1400px    /* Extra large */
```

### Estratégia Mobile-First

1. **Design para mobile primeiro**
2. **Progressive enhancement para desktop**
3. **Touch-friendly em todas telas**
4. **Performance otimizada**

### Adaptações por Dispositivo

#### Mobile (< 768px)

**Layout:**
- Single column
- Full-width cards
- Stacked navigation
- Bottom sheets para modais
- Floating Action Button (FAB)

**Espaçamentos:**
```css
padding: 0.75rem (12px)
gap: 0.75rem (12px)
```

**Tipografia:**
```css
h1: 2.25rem (36px)
h2: 1.5rem (24px)
h3: 1.25rem (20px)
body: 1rem (16px)
```

**Navegação:**
- Menu hamburger
- Bottom navigation (opcional)
- Swipe gestures

**Inputs:**
- Height: 44px mínimo
- Font-size: 16px (evita zoom no iOS)
- Teclado numérico para valores

#### Tablet (768px - 1024px)

**Layout:**
- 2 columns grid
- Sidebar opcional
- Modais centralizados

**Espaçamentos:**
```css
padding: 1.5rem (24px)
gap: 1rem (16px)
```

**Navegação:**
- Horizontal tabs
- Sidebar colapsável

#### Desktop (> 1024px)

**Layout:**
- 3+ columns grid
- Sidebar fixa
- Hover states
- Tooltips

**Espaçamentos:**
```css
padding: 2rem (32px)
gap: 1.5rem (24px)
```

**Navegação:**
- Horizontal menu
- Dropdown menus
- Keyboard shortcuts

### Componentes Responsivos

#### Cards

**Mobile:**
```css
width: 100%
padding: 1rem
margin-bottom: 0.75rem
```

**Desktop:**
```css
width: calc(33.333% - 1rem)
padding: 1.5rem
margin-bottom: 1.5rem
hover: transform translateY(-4px)
```

#### Modais

**Mobile:**
```css
position: fixed
bottom: 0
left: 0
right: 0
border-radius: 1rem 1rem 0 0
max-height: 90vh
animation: slide-up
```

**Desktop:**
```css
position: fixed
top: 50%
left: 50%
transform: translate(-50%, -50%)
max-width: 32rem
border-radius: 0.75rem
animation: scale-in
```

#### Tabelas

**Mobile:**
```css
/* Card layout */
display: block

tr {
  display: block
  border: 1px solid
  margin-bottom: 0.5rem
  padding: 0.75rem
}

td {
  display: flex
  justify-content: space-between
}

td::before {
  content: attr(data-label)
  font-weight: 600
}
```

**Desktop:**
```css
/* Table layout normal */
display: table
```

#### Formulários

**Mobile:**
```css
/* Stacked */
.form-group {
  display: flex
  flex-direction: column
  gap: 0.5rem
  margin-bottom: 1rem
}

input, select {
  width: 100%
}
```

**Desktop:**
```css
/* Inline quando apropriado */
.form-row {
  display: grid
  grid-template-columns: repeat(2, 1fr)
  gap: 1rem
}
```

### Touch Gestures

#### Swipe

**Swipe Left/Right:**
- Navegação entre tabs
- Deletar item de lista
- Revelar ações

**Swipe Up/Down:**
- Refresh (pull-to-refresh)
- Fechar bottom sheet

#### Long Press

- Abrir menu contextual
- Selecionar múltiplos itens
- Reordenar listas

#### Pinch to Zoom

- Gráficos e charts
- Imagens
- Mapas (viagens)

### Performance Mobile

#### Otimizações

1. **Lazy Loading:**
```jsx
const Component = lazy(() => import('./Component'));
```

2. **Image Optimization:**
```jsx
<img
  src="image.jpg"
  srcSet="image-sm.jpg 640w, image-md.jpg 1024w"
  sizes="(max-width: 640px) 100vw, 50vw"
  loading="lazy"
/>
```

3. **Code Splitting:**
```jsx
// Route-based splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
```

4. **Virtualization:**
```jsx
// Para listas longas
<VirtualList
  items={transactions}
  itemHeight={60}
  windowSize={10}
/>
```

#### Bundle Size

**Target:**
- Initial load: < 200KB gzip
- Total: < 500KB gzip

**Estratégias:**
- Tree shaking
- Minificação
- Compressão gzip/brotli
- CDN para assets

### Orientação

#### Portrait (Padrão)

- Layout vertical
- Navegação no topo
- Conteúdo scrollável

#### Landscape

```css
@media (orientation: landscape) and (max-height: 600px) {
  /* Ajustes para landscape */
  .header {
    height: 3rem; /* Menor */
  }
  
  .modal {
    max-height: 80vh; /* Mais espaço */
  }
}
```

### Safe Areas (iOS)

```css
/* Respeitar notch e home indicator */
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
padding-left: env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);
```

### Dark Mode Mobile

**Detecção automática:**
```jsx
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
```

**Toggle manual:**
- Botão no header
- Persiste preferência (localStorage)
- Transição suave (300ms)

### Testes Responsivos

**Dispositivos de teste:**
- iPhone SE (375x667)
- iPhone 12/13 (390x844)
- iPhone 14 Pro Max (430x932)
- Samsung Galaxy S21 (360x800)
- iPad (768x1024)
- iPad Pro (1024x1366)

**Ferramentas:**
- Chrome DevTools
- Firefox Responsive Design Mode
- BrowserStack
- Testes em dispositivos reais

---

## 📦 COMPONENTES ESPECÍFICOS DO APP

### 1. Transaction Card

```jsx
<Card className="hover-lift">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-muted">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-medium">{description}</p>
        <p className="text-sm text-muted-foreground">{category}</p>
      </div>
    </div>
    <div className="text-right">
      <p className={cn(
        "font-mono font-semibold",
        type === 'income' ? 'text-positive' : 'text-negative'
      )}>
        {formatCurrency(amount)}
      </p>
      <p className="text-sm text-muted-foreground">{date}</p>
    </div>
  </div>
</Card>
```

### 2. Balance Display

```jsx
<div className="balance-container">
  <p className="text-sm text-muted-foreground mb-1">Saldo Total</p>
  <h2 className="text-4xl font-display font-bold value-display">
    {formatCurrency(balance)}
  </h2>
  <div className="flex items-center gap-2 mt-2">
    <Badge variant={trend > 0 ? 'success' : 'destructive'}>
      {trend > 0 ? <TrendingUp /> : <TrendingDown />}
      {Math.abs(trend)}%
    </Badge>
    <span className="text-sm text-muted-foreground">vs mês anterior</span>
  </div>
</div>
```

### 3. Category Badge

```jsx
<Badge
  variant="outline"
  className="gap-1"
  style={{ borderColor: category.color }}
>
  <Icon className="h-3 w-3" style={{ color: category.color }} />
  {category.name}
</Badge>
```

### 4. Month Selector

```jsx
<div className="flex items-center gap-2">
  <Button variant="ghost" size="icon" onClick={previousMonth}>
    <ChevronLeft className="h-4 w-4" />
  </Button>
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className="min-w-[200px]">
        <Calendar className="h-4 w-4 mr-2" />
        {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
      </Button>
    </PopoverTrigger>
    <PopoverContent>
      <Calendar
        mode="single"
        selected={selectedMonth}
        onSelect={setSelectedMonth}
      />
    </PopoverContent>
  </Popover>
  <Button variant="ghost" size="icon" onClick={nextMonth}>
    <ChevronRight className="h-4 w-4" />
  </Button>
</div>
```

### 5. Installment Progress

```jsx
<div className="space-y-2">
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">Parcela {current}/{total}</span>
    <span className="font-medium">{formatCurrency(amount)}</span>
  </div>
  <div className="installment-progress">
    <div
      className="installment-progress-fill"
      style={{ width: `${(current / total) * 100}%` }}
    />
  </div>
</div>
```

### 6. Account Card

```jsx
<Card className="card-animated">
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-3">
      <div className="p-3 rounded-xl bg-primary/10">
        <Wallet className="h-6 w-6" />
      </div>
      <div>
        <h3 className="font-semibold">{account.name}</h3>
        <p className="text-sm text-muted-foreground">{account.type}</p>
      </div>
    </div>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Editar</DropdownMenuItem>
        <DropdownMenuItem>Transferir</DropdownMenuItem>
        <DropdownMenuItem className="text-destructive">
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
  <div>
    <p className="text-sm text-muted-foreground mb-1">Saldo</p>
    <p className="text-2xl font-mono font-bold value-display">
      {formatCurrency(account.balance)}
    </p>
  </div>
</Card>
```

### 7. Budget Progress Card

```jsx
<Card>
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-semibold">{budget.category}</h3>
        <p className="text-sm text-muted-foreground">
          {format(budget.month, "MMMM yyyy", { locale: ptBR })}
        </p>
      </div>
      <Badge variant={getVariant(percentage)}>
        {percentage}%
      </Badge>
    </div>
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="font-mono">{formatCurrency(spent)}</span>
        <span className="text-muted-foreground">
          de {formatCurrency(limit)}
        </span>
      </div>
      <Progress
        value={percentage}
        className={cn(
          percentage > 100 && "bg-destructive",
          percentage > 80 && percentage <= 100 && "bg-warning"
        )}
      />
    </div>
  </div>
</Card>
```

### 8. Notification Item

```jsx
<div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
  <div className={cn(
    "p-2 rounded-full",
    notification.read ? "bg-muted" : "bg-primary/10"
  )}>
    <Icon className="h-4 w-4" />
  </div>
  <div className="flex-1 min-w-0">
    <p className="font-medium text-sm">{notification.title}</p>
    <p className="text-sm text-muted-foreground truncate">
      {notification.message}
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      {formatDistanceToNow(notification.createdAt, {
        addSuffix: true,
        locale: ptBR
      })}
    </p>
  </div>
  {!notification.read && (
    <div className="w-2 h-2 rounded-full bg-primary" />
  )}
</div>
```

---

## 🎨 PALETA DE CORES PARA CATEGORIAS

### Categorias de Despesas

```css
Alimentação: #F59E0B (Âmbar)
Transporte: #3B82F6 (Azul)
Moradia: #8B5CF6 (Roxo)
Saúde: #EF4444 (Vermelho)
Educação: #10B981 (Verde)
Lazer: #EC4899 (Rosa)
Vestuário: #6366F1 (Índigo)
Outros: #6B7280 (Cinza)
```

### Categorias de Receitas

```css
Salário: #10B981 (Verde)
Freelance: #3B82F6 (Azul)
Investimentos: #8B5CF6 (Roxo)
Outros: #6B7280 (Cinza)
```

### Status de Transações

```css
Pago: #10B981 (Verde)
Pendente: #F59E0B (Âmbar)
Atrasado: #EF4444 (Vermelho)
Cancelado: #6B7280 (Cinza)
```

---

## 📐 ESPECIFICAÇÕES TÉCNICAS

### Tecnologias Recomendadas (APK)

**Framework:**
- React Native
- Expo (para desenvolvimento rápido)

**UI Library:**
- React Native Paper (Material Design)
- NativeBase
- Ou custom components baseados neste design system

**Navegação:**
- React Navigation 6+
- Stack Navigator
- Bottom Tab Navigator
- Drawer Navigator

**Animações:**
- React Native Reanimated 2
- React Native Gesture Handler

**Ícones:**
- @expo/vector-icons
- react-native-vector-icons

**Gráficos:**
- Victory Native
- React Native Chart Kit

**Formulários:**
- React Hook Form
- Yup (validação)

**Estado:**
- React Query (server state)
- Zustand ou Context API (client state)

**Storage:**
- AsyncStorage
- MMKV (performance)

**Backend:**
- Supabase (já implementado)
- Realtime subscriptions
- Row Level Security

### Fontes (React Native)

```javascript
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
} from '@expo-google-fonts/jetbrains-mono';
```

### Theme Provider (React Native)

```javascript
const theme = {
  dark: false,
  colors: {
    primary: '#141414',
    background: '#FFFFFF',
    card: '#FCFCFC',
    text: '#141414',
    border: '#E6E6E6',
    notification: '#EF4444',
    success: '#16A34A',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    full: 9999,
  },
  typography: {
    h1: {
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 36,
      lineHeight: 43,
    },
    h2: {
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 24,
      lineHeight: 31,
    },
    body: {
      fontFamily: 'Inter_400Regular',
      fontSize: 16,
      lineHeight: 26,
    },
    mono: {
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 16,
    },
  },
};
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Setup Inicial
- [ ] Configurar React Native / Expo
- [ ] Instalar dependências
- [ ] Configurar navegação
- [ ] Implementar theme provider
- [ ] Carregar fontes customizadas
- [ ] Configurar Supabase client

### Fase 2: Componentes Base
- [ ] Button (todas variantes)
- [ ] Input (text, currency, date)
- [ ] Card
- [ ] Badge
- [ ] Avatar
- [ ] Modal/Dialog
- [ ] Bottom Sheet
- [ ] Toast notifications
- [ ] Loading states (Spinner, Skeleton)

### Fase 3: Navegação
- [ ] Bottom Tab Navigator
- [ ] Stack Navigator
- [ ] Drawer Navigator (menu lateral)
- [ ] Header customizado
- [ ] Month Selector
- [ ] Breadcrumbs

### Fase 4: Telas Principais
- [ ] Dashboard
- [ ] Transações (lista + detalhes)
- [ ] Contas
- [ ] Cartões
- [ ] Orçamentos
- [ ] Relatórios
- [ ] Configurações

### Fase 5: Formulários
- [ ] Nova transação
- [ ] Editar transação
- [ ] Nova conta
- [ ] Novo cartão
- [ ] Novo orçamento
- [ ] Filtros avançados

### Fase 6: Funcionalidades Avançadas
- [ ] Gráficos e charts
- [ ] Notificações push
- [ ] Biometria (Face ID / Touch ID)
- [ ] Modo offline
- [ ] Sincronização
- [ ] Backup/Restore
- [ ] Exportação de dados

### Fase 7: Polimento
- [ ] Animações
- [ ] Gestos (swipe, long press)
- [ ] Haptic feedback
- [ ] Dark mode
- [ ] Acessibilidade
- [ ] Testes responsivos
- [ ] Performance optimization

### Fase 8: Testes e Deploy
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes em dispositivos reais
- [ ] Beta testing (TestFlight / Google Play Beta)
- [ ] Correções de bugs
- [ ] Deploy produção

---

## 📚 RECURSOS ADICIONAIS

### Documentação de Referência

- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Supabase Docs](https://supabase.com/docs)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Design Tools

- Figma (design e protótipos)
- Zeplin (handoff)
- Lottie (animações)

### Testing Tools

- Jest (unit tests)
- React Native Testing Library
- Detox (E2E tests)
- Maestro (mobile E2E)

---

## 🎯 CONCLUSÃO

Este design system fornece todas as especificações necessárias para criar um APK Android que seja:

✅ **Visualmente idêntico** ao sistema web  
✅ **Consistente** em todos os componentes  
✅ **Acessível** para todos os usuários  
✅ **Performático** em dispositivos móveis  
✅ **Escalável** para futuras funcionalidades  

**Próximos Passos:**
1. Revisar este documento com a equipe
2. Criar protótipos no Figma (opcional)
3. Iniciar implementação seguindo o checklist
4. Testar em dispositivos reais
5. Iterar baseado em feedback

---

**Documento criado em:** 21/04/2026  
**Última atualização:** 21/04/2026  
**Versão:** 1.0  
**Autor:** Kiro AI Assistant
