# API Cheatsheets — Consulta rápida

Colete aqui os trechos de documentação das libs que você mais usa.
O agente lê este arquivo automaticamente no início de cada sessão.

---

## Supabase JS Client

```ts
// Query
const { data, error } = await supabase
  .from('table')
  .select('col1, col2, rel:foreign_table(col)')
  .eq('col', value)
  .order('col', { ascending: false })
  .limit(10);

// Mutation
const { data, error } = await supabase.from('table').insert({}).select().single();
const { data, error } = await supabase.from('table').update({}).eq('id', id);
const { data, error } = await supabase.from('table').delete().eq('id', id);

// RPC
const { data, error } = await supabase.rpc('fn_name', { param: value });

// Auth
const { data: { user } } = await supabase.auth.getUser();
const { data: { session } } = await supabase.auth.getSession();
supabase.auth.onAuthStateChange((event, session) => { ... });
```

---

## React Query (TanStack Query v5)

```ts
// Query
const { data, isLoading, error } = useQuery({
  queryKey: ['key', param],
  queryFn: () => supabase.from('table').select(),
  enabled: !!param,
  staleTime: 30_000,       // 30s até ficar stale
  gcTime: 5 * 60_000,      // 5min no cache
  refetchInterval: 15_000, // polling opcional
});

// Mutation
const mutation = useMutation({
  mutationFn: (input) => supabase.from('table').insert(input),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['key'] }),
  onError: (error) => toast.error(error.message),
});

// Invalidation
queryClient.invalidateQueries({ queryKey: ['partial'] }); // partial match
```

---

## Decimal.js (Cálculos financeiros)

```ts
import Decimal from 'decimal.js';

// Nunca use float para dinheiro. Sempre Decimal.
const a = new Decimal('10.50');
const b = new Decimal('3.33');
a.plus(b);          // 13.83
a.minus(b);         // 7.17
a.times(2);         // 21.00
a.dividedBy(3);     // 3.50
a.toDecimalPlaces(2, Decimal.ROUND_HALF_UP); // 10.50

// SafeFinancialCalculator (wrapper do projeto)
SafeFinancialCalculator.add(a, b);
SafeFinancialCalculator.subtract(a, b);
SafeFinancialCalculator.multiply(a, b);
SafeFinancialCalculator.divide(a, b);
SafeFinancialCalculator.round(value);
SafeFinancialCalculator.percentage(total, pct);
```

---

## Zustand (Store)

```ts
import { create } from 'zustand';

const useStore = create((set) => ({
  value: initial,
  setValue: (v) => set({ value: v }),
  reset: () => set({ value: initial }),
}));
```

---

## Tailwind CSS

```
Spacing: p-4 (16px), gap-3 (12px), gap-6 (24px)
Typography: text-sm (0.875rem), text-base (1rem), font-display, font-bold
Colors: bg-primary, text-foreground, text-muted-foreground, border-border
Radius: rounded-xl (12px), rounded-2xl (16px), rounded-full
Shadows: shadow-sm, shadow-md, shadow-lg
```

---

## Regras de ouro do projeto

1. Sempre `Decimal` para dinheiro — nunca `number` ou `parseFloat`
2. Toda query Supabase: `.select()` com colunas explícitas, nunca `*`
3. Toda mutation: `invalidateQueries` no `onSuccess`
4. Toda FK tem índice — Postgres não cria automático
5. Sempre `timestamptz`, nunca `timestamp`
6. RLS em TODA tabela no schema `public`
7. `numeric(10,2)` para valores monetários, nunca `float`/`real`
