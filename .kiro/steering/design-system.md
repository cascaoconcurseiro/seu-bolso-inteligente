---
inclusion: auto
---

# Seu Bolso Inteligente - Design System Rules

This document defines the design system conventions, component patterns, and integration guidelines for the Seu Bolso Inteligente financial management application.

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with CSS Variables
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **Animations**: Framer Motion & Tailwind Animate
- **State Management**: Zustand, React Query (TanStack Query)
- **Routing**: React Router v6
- **Backend**: Supabase

## Design Tokens & CSS Variables

### Color System

Use HSL-based CSS variables for all colors. Never hardcode color values.

**Semantic Colors:**
```css
--background: Background color
--foreground: Text color
--primary: Brand primary color
--primary-foreground: Text on primary
--secondary: Secondary actions/elements
--secondary-foreground: Text on secondary
--muted: Subtle backgrounds
--muted-foreground: Muted text
--accent: Accent highlights
--accent-foreground: Text on accent
--destructive: Error/delete actions
--destructive-foreground: Text on destructive
--border: Border color
--input: Input border color
--ring: Focus ring color
--card: Card background
--card-foreground: Card text
--popover: Popover background
--popover-foreground: Popover text
```

**Financial Colors:**
```css
--positive: Green for income/gains
--negative: Red for expenses/losses
--neutral: Neutral for transfers
--success: Success states
--success-foreground: Text on success
--warning: Warning states
--warning-foreground: Text on warning
```

**Usage in Tailwind:**
```tsx
// ✅ Correct
<div className="bg-background text-foreground">
<div className="text-positive">+R$ 1.000,00</div>
<div className="text-negative">-R$ 500,00</div>

// ❌ Wrong
<div className="bg-white text-black">
<div className="text-green-600">+R$ 1.000,00</div>
```

### Typography

**Font Families:**
- `font-display`: Space Grotesk (headings, numbers, emphasis)
- `font-sans`: Inter (body text, UI)
- `font-mono`: JetBrains Mono (code, monospace data)

**Usage:**
```tsx
// Headings and display text
<h1 className="font-display text-3xl font-bold">Seu Bolso Inteligente</h1>

// Body text
<p className="font-sans text-base">Regular interface text</p>

// Financial values
<span className="font-display text-2xl font-semibold">R$ 1.234,56</span>
```

### Spacing

Use Tailwind's spacing scale. Custom values available:
- `spacing.18`: 4.5rem (72px)
- `spacing.88`: 22rem (352px)

### Border Radius

Use CSS variables for consistent radius:
- `rounded-lg`: `var(--radius)` - Large radius
- `rounded-md`: `calc(var(--radius) - 2px)` - Medium radius
- `rounded-sm`: `calc(var(--radius) - 4px)` - Small radius

## Component Patterns

### UI Components Location

All reusable UI components are in `src/components/ui/`:
- `button.tsx`
- `card.tsx`
- `dialog.tsx`
- `input.tsx`
- `select.tsx`
- `tabs.tsx`
- etc.

**Never recreate these components.** Always import from `@/components/ui`.

### Feature Components Organization

Feature-specific components are organized by domain:
```
src/components/
├── accounts/        # Account management
├── alerts/          # Alert/notification components
├── auth/            # Authentication UI
├── budgets/         # Budget management
├── calculators/     # Financial calculators
├── credit-cards/    # Credit card components
├── dashboard/       # Dashboard widgets
├── family/          # Family finance sharing
├── financial/       # General financial components
├── goals/           # Financial goals
├── investments/     # Investment tracking
├── layout/          # Layout components
├── reports/         # Report generation
├── settings/        # Settings UI
├── shared/          # Shared utilities
├── transactions/    # Transaction management
├── trips/           # Trip expense tracking
└── ui/              # Base UI components (shadcn/ui)
```

### Component Import Aliases

Use TypeScript path aliases defined in `components.json`:
```tsx
import { Button } from "@/components/ui/button"
import { useAccounts } from "@/hooks/useAccounts"
import { cn } from "@/lib/utils"
import { Account } from "@/types/database"
```

### Button Variants

Use the `Button` component from `@/components/ui/button`:

```tsx
import { Button } from "@/components/ui/button"

// Primary action
<Button variant="default">Salvar</Button>

// Secondary action
<Button variant="secondary">Cancelar</Button>

// Destructive action
<Button variant="destructive">Excluir</Button>

// Ghost (minimal)
<Button variant="ghost">Detalhes</Button>

// Outline
<Button variant="outline">Filtrar</Button>

// Link style
<Button variant="link">Ver mais</Button>

// Sizes
<Button size="sm">Pequeno</Button>
<Button size="default">Padrão</Button>
<Button size="lg">Grande</Button>
<Button size="icon"><Icon /></Button>
```

### Card Components

Use the `Card` components from `@/components/ui/card`:

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descrição opcional</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    {/* Actions */}
  </CardFooter>
</Card>
```

### Dialog/Modal Pattern

Use `Dialog` from `@/components/ui/dialog`:

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título do Modal</DialogTitle>
      <DialogDescription>Descrição</DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
      <Button onClick={handleSave}>Salvar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Form Inputs

Use form components from `@/components/ui/`:

```tsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

<div className="space-y-2">
  <Label htmlFor="name">Nome</Label>
  <Input id="name" placeholder="Digite o nome" />
</div>

<div className="space-y-2">
  <Label>Categoria</Label>
  <Select value={category} onValueChange={setCategory}>
    <SelectTrigger>
      <SelectValue placeholder="Selecione" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="food">Alimentação</SelectItem>
      <SelectItem value="transport">Transporte</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### Icons

Use Lucide React icons consistently:

```tsx
import { Plus, Trash2, Edit, Check, X, ChevronDown } from "lucide-react"

<Button>
  <Plus className="h-4 w-4 mr-2" />
  Adicionar
</Button>
```

**Icon size conventions:**
- Small: `h-4 w-4` (16px)
- Medium: `h-5 w-5` (20px)
- Large: `h-6 w-6` (24px)

## Financial Data Formatting

### Currency Formatting

Use the utilities from `@/utils/currencyFormatter`:

```tsx
import { formatCurrency } from "@/utils/currencyFormatter"

// Format Brazilian Real
formatCurrency(1234.56) // "R$ 1.234,56"

// Format with currency code
formatCurrency(1234.56, "USD") // "US$ 1.234,56"
```

### Date Formatting

Use date-fns and utilities from `@/lib/dateUtils`:

```tsx
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

format(new Date(), "dd/MM/yyyy", { locale: ptBR })
format(new Date(), "MMM yyyy", { locale: ptBR }) // "Jan 2024"
```

### Number Display

For financial values, use consistent formatting:

```tsx
// Positive values (income)
<span className="font-display text-positive">
  +{formatCurrency(amount)}
</span>

// Negative values (expenses)
<span className="font-display text-negative">
  -{formatCurrency(Math.abs(amount))}
</span>

// Neutral (transfers)
<span className="font-display text-neutral">
  {formatCurrency(amount)}
</span>
```

## State Management

### React Query (TanStack Query)

Use React Query for server state:

```tsx
import { useQuery, useMutation } from "@tanstack/react-query"

// Fetching data
const { data, isLoading, error } = useQuery({
  queryKey: ['accounts'],
  queryFn: fetchAccounts
})

// Mutations
const mutation = useMutation({
  mutationFn: createAccount,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
  }
})
```

### Zustand

Use Zustand for client state (see `src/store/`):

```tsx
import { useTransactionStore } from "@/store/useTransactionStore"

const { transactions, addTransaction } = useTransactionStore()
```

### Context

Use Context for cross-cutting concerns (see `src/contexts/`):
- `AuthContext`: Authentication state
- `MonthContext`: Selected month/period
- `PrivacyContext`: Privacy mode toggle
- `TransactionModalContext`: Transaction modal state

## Animation Guidelines

### Framer Motion

Use Framer Motion for complex animations:

```tsx
import { motion } from "framer-motion"

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.2 }}
>
  {/* Content */}
</motion.div>
```

### Tailwind Animations

Use built-in Tailwind animations for simple cases:

```tsx
// Fade in
<div className="animate-fade-in">...</div>

// Slide down
<div className="animate-slide-down">...</div>

// Accordion
<div className="animate-accordion-down">...</div>
```

## Accessibility

### ARIA Labels

Always provide accessible labels:

```tsx
<Button aria-label="Fechar modal">
  <X className="h-4 w-4" />
</Button>

<Input aria-describedby="email-error" />
<span id="email-error" className="text-sm text-destructive">
  Email inválido
</span>
```

### Keyboard Navigation

Ensure all interactive elements are keyboard accessible:
- Use native HTML elements when possible (`<button>`, `<a>`, `<input>`)
- Radix UI components are keyboard-accessible by default
- Test with Tab, Enter, Escape, and Arrow keys

### Focus States

Use `ring` utilities for focus states:

```tsx
<Button className="focus-visible:ring-2 focus-visible:ring-ring">
  Click me
</Button>
```

## Responsive Design

### Mobile-First

Write mobile-first responsive styles:

```tsx
<div className="flex flex-col md:flex-row gap-4">
  {/* Stacks on mobile, horizontal on desktop */}
</div>

<h1 className="text-2xl md:text-3xl lg:text-4xl">
  {/* Progressive text sizing */}
</h1>
```

### Breakpoints

Tailwind breakpoints (defined in config):
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1400px (custom)

## Figma Integration Guidelines

### From Figma to Code

When implementing designs from Figma:

1. **Extract Design Tokens First**
   - Use `get_variable_defs` to get Figma variables
   - Map to CSS variables in `index.css`

2. **Use Existing Components**
   - Check `src/components/ui/` before creating new components
   - Use shadcn/ui primitives that match Figma components

3. **Match Visual Parity**
   - Use `get_design_context` to get reference code
   - Adapt Tailwind classes to match spacing, colors, typography
   - Use `formatCurrency` for currency values
   - Use proper icon sizes from Lucide React

4. **Don't Copy Figma Output Directly**
   - Figma MCP outputs reference code (React + Tailwind)
   - Replace with project's components and utilities
   - Use design system tokens instead of hardcoded values

### Code Connect Setup

When linking components to Figma:

```tsx
// Map component to Figma node
// Use add_code_connect_map tool or create mapping via hook
// Example: Button.tsx -> Figma Button Component
```

## Testing Patterns

### Component Tests

Use Vitest + React Testing Library:

```tsx
import { render, screen } from "@testing-library/react"
import { Button } from "@/components/ui/button"

test("renders button with text", () => {
  render(<Button>Click me</Button>)
  expect(screen.getByRole("button")).toHaveTextContent("Click me")
})
```

### Hook Tests

Test custom hooks in isolation:

```tsx
import { renderHook } from "@testing-library/react"
import { useAccounts } from "@/hooks/useAccounts"

test("fetches accounts", async () => {
  const { result } = renderHook(() => useAccounts())
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
})
```

## Code Quality

### TypeScript

- Use strict type checking
- Define types in `src/types/`
- Avoid `any` - use `unknown` if truly unknown

### Linting

Run ESLint before committing:
```bash
npm run lint
```

### Utility Functions

Use `cn()` from `@/lib/utils` for conditional classes:

```tsx
import { cn } from "@/lib/utils"

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  variant === "primary" && "primary-classes"
)}>
```

## Common Patterns

### Loading States

```tsx
if (isLoading) {
  return <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
}
```

### Error States

```tsx
if (error) {
  return <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
    <p className="text-destructive text-sm">{error.message}</p>
  </div>
}
```

### Empty States

```tsx
if (!data || data.length === 0) {
  return <div className="flex flex-col items-center justify-center p-12 text-center">
    <InboxIcon className="h-12 w-12 text-muted-foreground mb-4" />
    <h3 className="text-lg font-semibold mb-2">Nenhum item encontrado</h3>
    <p className="text-muted-foreground mb-4">Adicione seu primeiro item.</p>
    <Button onClick={handleAdd}>
      <Plus className="h-4 w-4 mr-2" />
      Adicionar
    </Button>
  </div>
}
```

---

## Summary Checklist

When implementing new UI from Figma:

- [ ] Extract design tokens (colors, spacing, typography)
- [ ] Map to existing CSS variables
- [ ] Use components from `@/components/ui/`
- [ ] Follow typography hierarchy (font-display for emphasis, font-sans for body)
- [ ] Use semantic color classes (positive/negative/neutral for financial data)
- [ ] Format currency with `formatCurrency()`
- [ ] Use Lucide React icons with consistent sizing
- [ ] Implement responsive design (mobile-first)
- [ ] Add proper ARIA labels
- [ ] Test keyboard navigation
- [ ] Match animation patterns (Framer Motion or Tailwind animate)
- [ ] Run linter and fix any issues
