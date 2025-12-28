# Design Document: Trip Budget Privacy & Personal Ownership

## Overview

This design implements strict privacy and personal ownership for trip budgets. The core principle is: **trips are shared contexts, but budgets are individual responsibilities**. No user should ever see another user's budget, and the UI must clearly communicate personal ownership.

## Architecture

### Data Flow

```
User → Trip List Query → JOIN trip_participants (filtered by user_id) → Display "Meu Orçamento"
User → Trip Detail → Query personal_budget WHERE user_id = auth.uid() → Show personal progress
User → Create Expense → Save with user_id → Count against personal budget only
```

### Key Principles

1. **Single Source of Truth**: `trip_participants.personal_budget` is the ONLY source
2. **Database-Level Privacy**: RLS policies enforce budget privacy
3. **No Aggregation**: Never sum, average, or expose multiple users' budgets
4. **Clear Ownership**: UI always uses first-person language ("Meu", "Meus")
5. **One-Time Setup**: Budget modal appears once, then user can manually update

## Components and Interfaces

### Database Schema Changes

#### 1. Make personal_budget NOT NULL (after migration)

```sql
-- Step 1: Ensure all existing participants have a budget
UPDATE trip_participants
SET personal_budget = 0
WHERE personal_budget IS NULL;

-- Step 2: Make it NOT NULL
ALTER TABLE trip_participants
ALTER COLUMN personal_budget SET NOT NULL;

-- Step 3: Add check constraint
ALTER TABLE trip_participants
ADD CONSTRAINT personal_budget_positive CHECK (personal_budget >= 0);
```

#### 2. Update RLS Policies

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Users can view trip participants" ON trip_participants;

-- Create new policy that hides other users' budgets
CREATE POLICY "Users can view trip participants with budget privacy" 
ON trip_participants
FOR SELECT
USING (
  trip_id IN (
    SELECT id FROM trips WHERE owner_id = auth.uid()
    UNION
    SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
  )
);

-- Note: Application layer will filter personal_budget
-- Only return personal_budget when user_id = auth.uid()
```

### Frontend Components

#### 1. Trip List Query (useTrips.ts)

**Current (WRONG)**:
```typescript
const { data: trips } = await supabase
  .from("trips")
  .select("*, budget") // ❌ Shows creator's budget
```

**Corrected**:
```typescript
const { data: trips } = await supabase
  .from("trips")
  .select(`
    *,
    trip_participants!inner(personal_budget)
  `)
  .eq("trip_participants.user_id", user.id);

// Transform to include personal budget
const tripsWithPersonalBudget = trips.map(trip => ({
  ...trip,
  my_personal_budget: trip.trip_participants[0]?.personal_budget || null
}));
```

#### 2. Trip Card Display (Trips.tsx)

**Current (WRONG)**:
```tsx
<p className="font-mono font-semibold">
  {formatCurrency(trip.budget)} {/* ❌ Shows creator's budget */}
</p>
<p className="text-xs text-muted-foreground">Orçamento</p>
```

**Corrected**:
```tsx
{trip.my_personal_budget ? (
  <>
    <p className="font-mono font-semibold">
      {formatCurrency(trip.my_personal_budget)}
    </p>
    <p className="text-xs text-muted-foreground">Meu Orçamento</p>
  </>
) : (
  <p className="text-xs text-muted-foreground">Orçamento não definido</p>
)}
```

#### 3. Trip Detail Budget Display (Trips.tsx)

**Current (WRONG)**:
```tsx
{selectedTrip.budget && (
  <div>
    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
      Orçamento {/* ❌ Ambiguous */}
    </p>
    <p className="font-mono text-sm">{formatCurrency(selectedTrip.budget)}</p>
  </div>
)}
```

**Corrected**:
```tsx
{myPersonalBudget && (
  <div>
    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
      Meu Orçamento
    </p>
    <p className="font-mono text-sm">{formatCurrency(myPersonalBudget)}</p>
  </div>
)}
```

#### 4. Budget Progress Calculation

**Current (WRONG)**:
```typescript
const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
const budgetPercentage = (totalExpenses / selectedTrip.budget) * 100; // ❌ Uses trip budget
```

**Corrected**:
```typescript
// Only count MY expenses
const myExpenses = expenses.filter(exp => exp.user_id === user.id);
const myTotalExpenses = myExpenses.reduce((sum, exp) => sum + exp.amount, 0);
const myBudgetPercentage = myPersonalBudget 
  ? (myTotalExpenses / myPersonalBudget) * 100 
  : 0;
```

#### 5. Budget Modal Logic (PersonalBudgetDialog.tsx)

**Trigger Conditions**:
```typescript
useEffect(() => {
  const shouldShowModal = 
    view === "detail" && 
    selectedTripId && 
    myMembership && 
    myMembership.personal_budget === null; // Only if not set
  
  if (shouldShowModal) {
    setShowPersonalBudgetDialog(true);
  }
}, [view, selectedTripId, myMembership]);
```

**Save Logic**:
```typescript
const handleSaveBudget = async (budget: number) => {
  if (budget <= 0) {
    toast.error("Orçamento deve ser maior que zero");
    return;
  }
  
  await updatePersonalBudget.mutateAsync({
    tripId: selectedTripId,
    userId: user.id,
    personalBudget: budget
  });
  
  setShowPersonalBudgetDialog(false);
  toast.success("Orçamento pessoal definido!");
};
```

### Hook Updates

#### useTripMembers.ts

**Current (PARTIALLY CORRECT)**:
```typescript
personal_budget: member.user_id === user?.id ? member.personal_budget : null,
```

**Keep this logic** - it already hides other users' budgets.

#### useTrips.ts

**Add new query for trip list with personal budgets**:
```typescript
export function useTripsWithPersonalBudget() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["trips-with-personal-budget", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select(`
          *,
          trip_participants!inner(
            personal_budget,
            user_id
          )
        `)
        .eq("trip_participants.user_id", user!.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      return data.map(trip => ({
        ...trip,
        my_personal_budget: trip.trip_participants[0]?.personal_budget || null
      }));
    },
    enabled: !!user
  });
}
```

## Data Models

### trip_participants (Updated)

```typescript
interface TripParticipant {
  id: string;
  trip_id: string;
  user_id: string | null;
  member_id: string | null;
  name: string;
  personal_budget: number; // NOT NULL after migration
  created_at: string;
}
```

### Trip (with personal budget)

```typescript
interface TripWithPersonalBudget extends Trip {
  my_personal_budget: number | null; // Only current user's budget
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Budget Privacy Isolation
*For any* two distinct users U1 and U2 in the same trip, querying trip data as U1 should never return U2's personal_budget value.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Single Source Consistency
*For any* user viewing their budget, the displayed value should always equal trip_participants.personal_budget WHERE user_id = current_user, never trips.budget.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: Modal Idempotency
*For any* user accessing a trip, if personal_budget IS NOT NULL, the budget modal should not appear automatically.

**Validates: Requirements 3.2, 3.4**

### Property 4: Expense Attribution Isolation
*For any* expense created by user U in trip T, that expense should only affect U's budget calculation, never appearing in other users' budget progress.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 5: UI Language Consistency
*For any* budget display in the UI, the label should use first-person possessive language ("Meu", "Minha") and never collective language ("da viagem", "total").

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 6: RLS Enforcement
*For any* database query on trip_participants, the returned personal_budget values should be filtered such that only rows where user_id = auth.uid() contain non-null budget values.

**Validates: Requirements 7.1, 7.2, 7.3**

### Property 7: Budget Positivity
*For any* budget submission, the system should reject values where personal_budget <= 0.

**Validates: Requirements 9.1, 9.2, 9.3**

### Property 8: Itinerary Privacy
*For any* user querying trip_itinerary, the results should only include items where user_id = auth.uid().

**Validates: Requirements 10.1, 10.2, 10.3**

## Error Handling

### Budget Modal Errors

1. **Invalid Budget**: Show toast "Orçamento deve ser maior que zero"
2. **Network Error**: Show toast "Erro ao salvar orçamento. Tente novamente."
3. **Permission Error**: Show toast "Você não tem permissão para definir orçamento"

### Query Errors

1. **Missing personal_budget**: Display "Orçamento não definido" instead of crashing
2. **RLS Violation**: Log error and show generic "Erro ao carregar dados"
3. **Invalid trip_id**: Redirect to trip list with toast "Viagem não encontrada"

## Testing Strategy

### Unit Tests

1. **Budget Privacy Filter**: Test that `useTripMembers` returns null for other users' budgets
2. **Query Transformation**: Test that trip list query correctly extracts personal_budget
3. **Modal Logic**: Test that modal only shows when personal_budget is null
4. **Expense Filtering**: Test that budget calculation only includes current user's expenses

### Property Tests

1. **Property 1 (Privacy)**: Generate random users and trips, verify budget isolation
2. **Property 2 (Single Source)**: Generate random budget values, verify consistency
3. **Property 3 (Modal)**: Generate random budget states, verify modal behavior
4. **Property 4 (Expense Attribution)**: Generate random expenses, verify isolation
5. **Property 5 (UI Language)**: Parse all UI strings, verify first-person language
6. **Property 6 (RLS)**: Simulate queries as different users, verify filtering
7. **Property 7 (Positivity)**: Generate random budget values, verify validation
8. **Property 8 (Itinerary)**: Generate random itinerary items, verify privacy

### Integration Tests

1. **End-to-End Budget Flow**: Create trip → Set budget → Create expense → Verify progress
2. **Multi-User Scenario**: Two users in same trip → Verify budget isolation
3. **Modal Behavior**: First access → Modal shows → Set budget → Modal doesn't show again
4. **Budget Update**: Change budget → Verify all displays update correctly

## Migration Strategy

### Phase 1: Database (Non-Breaking)

1. Add check constraint for positive budgets
2. Update RLS policies
3. Populate NULL budgets with 0 (temporary)

### Phase 2: Backend (Non-Breaking)

1. Update `useTrips` to include personal_budget
2. Update `useTripMembers` (already correct)
3. Add new query `useTripsWithPersonalBudget`

### Phase 3: Frontend (Breaking Changes)

1. Update trip list to use `my_personal_budget`
2. Update trip detail to use `myPersonalBudget`
3. Update all labels to first-person language
4. Update budget progress calculation
5. Verify modal logic

### Phase 4: Cleanup

1. Make `personal_budget` NOT NULL
2. Remove any references to `trips.budget` in participant context
3. Add database comments documenting privacy rules

## Performance Considerations

- **Query Optimization**: JOIN with trip_participants adds minimal overhead
- **Index**: Ensure index on `trip_participants(user_id, trip_id)`
- **Caching**: React Query caches personal budget data
- **RLS Impact**: Minimal - filtering happens at database level

## Security Considerations

- **RLS Enforcement**: Database-level privacy prevents application bugs from leaking data
- **No Client-Side Filtering**: Never rely on frontend to hide budgets
- **Audit Trail**: Log all budget updates for security review
- **Input Validation**: Server-side validation of budget values
