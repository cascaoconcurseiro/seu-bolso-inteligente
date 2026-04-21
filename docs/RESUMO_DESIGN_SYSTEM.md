# 📋 RESUMO EXECUTIVO - DESIGN SYSTEM APK

**Data:** 21/04/2026  
**Versão:** 1.0

---

## 🎯 VISÃO GERAL

Design system completo documentado para desenvolvimento do APK Android do **Pé de Meia**, garantindo identidade visual idêntica ao sistema web.

---

## 🎨 CONCEITO: MINIMAL FINANCE

### Filosofia
- Interface limpa e minimalista
- Preto e branco como cores principais
- Tipografia sofisticada
- Espaçamentos generosos
- Foco no conteúdo financeiro

### Princípios
1. Content First
2. Minimal Distractions
3. Clear Hierarchy
4. Smooth Interactions
5. Consistent Patterns

---

## 🎨 PALETA DE CORES

### Light Mode
- **Background:** #FFFFFF (Branco puro)
- **Foreground:** #141414 (Quase preto)
- **Primary:** #141414 (Preto)
- **Secondary:** #F5F5F5 (Cinza claro)
- **Success:** #16A34A (Verde)
- **Error:** #E11D48 (Vermelho)
- **Warning:** #F59E0B (Âmbar)

### Dark Mode
- **Background:** #0A0A0A (Quase preto)
- **Foreground:** #F2F2F2 (Off-white)
- **Primary:** #FFFFFF (Branco)
- **Secondary:** #1F1F1F (Cinza escuro)
- **Success:** #22C55E (Verde claro)
- **Error:** #EF4444 (Vermelho claro)
- **Warning:** #FBBF24 (Âmbar claro)

### Contraste
- Light: 19:1 ✅ (WCAG AAA)
- Dark: 18:1 ✅ (WCAG AAA)

---

## ✍️ TIPOGRAFIA

### Fontes
1. **Space Grotesk** - Títulos e headings
2. **Inter** - Corpo e UI
3. **JetBrains Mono** - Valores monetários

### Escala
- H1: 36px (mobile) / 48px (desktop)
- H2: 24px (mobile) / 30px (desktop)
- H3: 20px (mobile) / 24px (desktop)
- Body: 16px
- Small: 14px

---

## 📐 ESPAÇAMENTOS

### Sistema 8px Base
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

### Border Radius
- sm: 8px
- md: 10px
- lg: 12px (padrão)
- xl: 16px
- full: 9999px

---

## 🧩 COMPONENTES PRINCIPAIS

### 1. Botões
- 6 variantes: default, secondary, destructive, outline, ghost, link
- 4 tamanhos: sm (36px), md (40px), lg (44px), icon
- Estados: hover, active, disabled, loading

### 2. Cards
- Background: --card
- Border: 1px solid
- Padding: 24px
- Hover: lift effect
- Variantes: default, status, clickable

### 3. Inputs
- Height: 40px (desktop) / 44px (mobile)
- Border: 1px solid
- Focus: ring 2px
- Tipos: text, currency, date, select

### 4. Modais
- Desktop: centered (max-width 512px)
- Mobile: bottom sheet (full-width)
- Overlay: blur backdrop
- Animação: scale-in / slide-up

### 5. Badges
- 6 variantes: default, secondary, outline, destructive, success, warning
- Border-radius: full
- Font-size: 12px

### 6. Toast
- Position: bottom-right
- Auto-dismiss: 5s
- Variantes: default, success, error, warning
- Animação: slide-in from right

---

## 🎬 ANIMAÇÕES

### Durações
- Fast: 150ms
- Normal: 300ms
- Slow: 500ms

### Principais
1. **Fade In** - Entrada de elementos
2. **Fade In Up** - Cards e listas
3. **Scale In** - Modais
4. **Slide Down** - Dropdowns
5. **Shimmer** - Loading states
6. **Hover Lift** - Cards interativos
7. **Shake** - Erros
8. **Pulse** - Notificações

### Easing
- Padrão: ease-out
- Spring: cubic-bezier(0.34, 1.56, 0.64, 1)

---

## 🎯 ÍCONES

### Biblioteca
**Lucide React** - 1000+ ícones minimalistas

### Principais
- LayoutDashboard, ArrowLeftRight, Wallet, CreditCard
- Users, Plane, UsersRound, BarChart3, PiggyBank
- Plus, Pencil, Trash2, Check, X
- TrendingUp, TrendingDown, DollarSign
- CheckCircle, AlertCircle, XCircle, Info

### Tamanhos
- xs: 12px
- sm: 16px
- md: 20px
- lg: 24px
- xl: 32px

---

## 📱 LAYOUT E NAVEGAÇÃO

### Estrutura
```
┌─────────────────────────┐
│   TopBar (Header)       │
├─────────────────────────┤
│   Month Selector        │
├─────────────────────────┤
│   Main Content          │
│   (max-width: 1400px)   │
└─────────────────────────┘
```

### TopBar
- Height: 64px (desktop) / 56px (mobile)
- Sticky position
- Backdrop blur
- Logo + Nav + Actions + User

### Navegação Mobile
- Menu hamburger
- Drawer lateral
- Touch targets: 44px mínimo
- Swipe gestures

---

## 📱 RESPONSIVIDADE

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Mobile First
1. Single column
2. Full-width cards
3. Bottom sheets
4. Touch-friendly (44px)
5. Font-size 16px (evita zoom iOS)

### Adaptações
- **Mobile:** 1 coluna, padding 12px
- **Tablet:** 2 colunas, padding 24px
- **Desktop:** 3+ colunas, padding 32px, hover states

---

## ♿ ACESSIBILIDADE

### WCAG 2.1 AA
✅ Contraste 4.5:1 (texto)  
✅ Contraste 3:1 (UI)  
✅ Touch targets 44x44px  
✅ Navegação por teclado  
✅ ARIA labels  
✅ Screen reader support  
✅ Focus visível  
✅ Reduced motion  

### Navegação Teclado
- Tab / Shift+Tab
- Enter / Space
- Esc (fechar)
- Arrow keys (menus)

---

## 🔧 TECNOLOGIAS RECOMENDADAS

### Framework
- **React Native** + Expo
- React Navigation 6+
- React Native Reanimated 2

### UI
- Custom components (baseado neste design)
- React Native Paper (opcional)
- NativeBase (opcional)

### Estado
- React Query (server state)
- Zustand / Context API (client state)

### Backend
- Supabase (já implementado)
- Realtime subscriptions
- Row Level Security

### Outros
- React Hook Form (formulários)
- Victory Native (gráficos)
- AsyncStorage / MMKV (storage)
- @expo/vector-icons (ícones)

---

## 📊 ESTATÍSTICAS DO DESIGN SYSTEM

### Componentes Documentados
- **18 componentes base** (Button, Card, Input, etc.)
- **8 componentes específicos** (TransactionCard, BalanceDisplay, etc.)
- **40+ animações** customizadas
- **50+ classes utilitárias**

### Cores
- **2 temas** (light/dark)
- **20+ tokens de cor** por tema
- **8 cores de categoria**
- **4 cores de status**

### Tipografia
- **3 famílias** de fonte
- **4 pesos** por família
- **8 tamanhos** de texto
- **Tabular nums** para valores

### Espaçamentos
- **12 valores** de spacing
- **5 valores** de border-radius
- **5 breakpoints** responsivos

---

## ✅ CHECKLIST RÁPIDO

### Setup (Fase 1)
- [ ] React Native + Expo
- [ ] Navegação
- [ ] Theme provider
- [ ] Fontes
- [ ] Supabase

### Componentes (Fase 2-3)
- [ ] 18 componentes base
- [ ] Navegação (Tab, Stack, Drawer)
- [ ] Header + Month Selector

### Telas (Fase 4)
- [ ] Dashboard
- [ ] Transações
- [ ] Contas
- [ ] Cartões
- [ ] Orçamentos
- [ ] Relatórios
- [ ] Configurações

### Formulários (Fase 5)
- [ ] 35+ formulários documentados
- [ ] Validações
- [ ] Máscaras
- [ ] Currency input

### Avançado (Fase 6-7)
- [ ] Gráficos
- [ ] Notificações push
- [ ] Biometria
- [ ] Offline mode
- [ ] Animações
- [ ] Dark mode
- [ ] Acessibilidade

### Deploy (Fase 8)
- [ ] Testes
- [ ] Beta testing
- [ ] Produção

---

## 📚 DOCUMENTOS RELACIONADOS

1. **DESIGN_SYSTEM_APK.md** - Documentação completa (este documento)
2. **PROMPT_COMPLETO_APK.md** - Especificação técnica completa
3. **FORMULARIOS_COMPLETOS_APK.md** - Todos os formulários
4. **RESUMO_FUNCIONALIDADES_APK.md** - Funcionalidades do sistema

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ Design system documentado
2. ⏭️ Criar protótipos no Figma (opcional)
3. ⏭️ Setup inicial do projeto React Native
4. ⏭️ Implementar componentes base
5. ⏭️ Desenvolver telas principais
6. ⏭️ Testes e iteração
7. ⏭️ Deploy

---

## 📞 SUPORTE

Para dúvidas sobre o design system:
- Consultar **DESIGN_SYSTEM_APK.md** (documentação completa)
- Revisar código-fonte web em `src/components/ui/`
- Analisar estilos em `src/index.css` e `tailwind.config.ts`

---

**Documento criado em:** 21/04/2026  
**Status:** ✅ Completo  
**Versão:** 1.0
