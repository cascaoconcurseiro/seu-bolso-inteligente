# Implementation Plan: Trip Budget Privacy & Personal Ownership

## Overview

This plan implements strict budget privacy for trips, ensuring each user sees only their own budget and expenses. Implementation follows a safe migration path to avoid breaking existing functionality.

## Tasks

- [-] 1. Database Schema Updates
  - Update trip_participants table structure
  - Add constraints and indexes
  - Update RLS policies
  - _Requirements: 2.1, 2.2, 7.1, 7.2, 9.1_

- [x] 1.1 Create migration for personal_budget constraints
  - Add CHECK constraint for positive budgets
  - Add index on (user_id, trip_id)
  - Populate NULL budgets with 0 (temporary default)
  - _Requirements: 2.1, 9.1_

- [ ] 1.2 Update RLS policies for budget privacy
  - Keep existing policy structure
  - Document that application layer filters personal_budget
  - Add database comments explaining privacy rules
  - _Requirements: 7.1, 7.2, 7.3_

- [ ]* 1.3 Write property test for RLS enforcement
  - **Property 6: RLS Enforcement**
  - **Validates: Requirements 7.1, 7.2, 7.3**

- [ ] 2. Backend Hook Updates
  - Update useTrips to include personal budgets
  - Verify useTripMembers privacy logic
  - Add new query hooks
  - _Requirements: 1.1, 1.2, 2.3_

- [x] 2.1 Update useTrips hook to fetch personal budgets
  - Add JOIN with trip_participants
  - Filter by current user_id
  - Transform data to include my_personal_budget
  - _Requirements: 1.1, 2.3, 4.2_

- [ ] 2.2 Create useTripsWithPersonalBudget hook
  - Implement query with personal budget JOIN
  - Add proper error handling
  - Add TypeScript types
  - _Requirements: 1.1, 2.3, 4.2_

- [ ]* 2.3 Write property test for single source consistency
  - **Property 2: Single Source Consistency**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ]* 2.4 Write unit tests for budget query transformation
  - Test that personal_budget is correctly extracted
  - Test NULL handling
  - Test multiple trips
  - _Requirements: 2.3, 4.2_

- [ ] 3. Trip List Display Updates
  - Update trip cards to show personal budgets
  - Change labels to first-person language
  - Handle NULL budgets gracefully
  - _Requirements: 4.1, 4.2, 4.3, 8.1_

- [x] 3.1 Update Trips.tsx trip list rendering
  - Replace trip.budget with trip.my_personal_budget
  - Change label from "Orçamento" to "Meu Orçamento"
  - Show "Orçamento não definido" when NULL
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 3.2 Update trip card component styling
  - Ensure consistent first-person language
  - Add tooltip explaining personal budget
  - _Requirements: 8.1, 8.4_

- [ ]* 3.3 Write property test for UI language consistency
  - **Property 5: UI Language Consistency**
  - **Validates: Requirements 8.1, 8.2, 8.3**

- [ ] 4. Trip Detail Budget Display
  - Update budget section to show personal budget
  - Update budget progress calculation
  - Change all labels to first-person
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4.1 Update trip detail header budget display
  - Use myPersonalBudget instead of selectedTrip.budget
  - Change label to "Meu Orçamento"
  - _Requirements: 5.1, 5.4_

- [x] 4.2 Update budget progress section
  - Filter expenses by current user_id
  - Calculate progress using personal_budget
  - Update percentage calculation
  - Update remaining/over budget display
  - _Requirements: 5.2, 5.3, 6.1, 6.2_

- [x] 4.3 Update all budget-related labels in detail view
  - Change "Orçamento da viagem" to "Meu Orçamento"
  - Change "Gastos" to "Meus Gastos"
  - Change "Restam" to "Me restam"
  - _Requirements: 8.1, 8.2, 8.3_

- [ ]* 4.4 Write property test for expense attribution isolation
  - **Property 4: Expense Attribution Isolation**
  - **Validates: Requirements 6.1, 6.2, 6.3**

- [ ]* 4.5 Write unit tests for budget progress calculation
  - Test expense filtering by user_id
  - Test percentage calculation
  - Test over-budget scenarios
  - _Requirements: 5.2, 5.3, 6.2_

- [ ] 5. Budget Modal Behavior
  - Verify modal trigger logic
  - Update save logic
  - Add validation
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 9.1_

- [ ] 5.1 Review and verify PersonalBudgetDialog trigger logic
  - Confirm modal only shows when personal_budget IS NULL
  - Verify modal doesn't show after budget is set
  - _Requirements: 3.2, 3.4_

- [ ] 5.2 Update budget save validation
  - Ensure budget > 0 validation
  - Add clear error messages
  - Add success toast
  - _Requirements: 9.1, 9.2_

- [ ]* 5.3 Write property test for modal idempotency
  - **Property 3: Modal Idempotency**
  - **Validates: Requirements 3.2, 3.4**

- [ ]* 5.4 Write unit tests for budget validation
  - Test positive budget acceptance
  - Test zero budget rejection
  - Test negative budget rejection
  - Test decimal handling
  - _Requirements: 9.1, 9.2, 9.4_

- [ ] 6. Remove trips.budget References
  - Find all uses of trips.budget in participant context
  - Replace with personal_budget
  - Keep trips.budget only for owner internal use
  - _Requirements: 2.2, 2.4_

- [ ] 6.1 Audit codebase for trips.budget usage
  - Search for all references to trip.budget
  - Identify which are in participant context
  - Document which need to be changed
  - _Requirements: 2.2_

- [ ] 6.2 Replace trips.budget with personal_budget in components
  - Update NewTripDialog (keep for owner)
  - Update EditTripDialog (keep for owner)
  - Remove from participant views
  - _Requirements: 2.2, 2.4_

- [ ] 7. TypeScript Type Updates
  - Update Trip interface
  - Add TripWithPersonalBudget type
  - Update component prop types
  - _Requirements: 2.3, 4.2_

- [x] 7.1 Update Trip-related TypeScript interfaces
  - Add my_personal_budget to Trip type
  - Create TripWithPersonalBudget interface
  - Update component props
  - _Requirements: 2.3_

- [ ] 7.2 Update TripParticipant interface
  - Ensure personal_budget is number (not null after migration)
  - Update hook return types
  - _Requirements: 2.1_

- [ ] 8. Checkpoint - Test Budget Privacy
  - Ensure all tests pass
  - Manually test with two users
  - Verify budget isolation
  - Ask user if questions arise

- [ ] 9. Itinerary Privacy (Bonus)
  - Verify itinerary queries filter by user_id
  - Update RLS if needed
  - Test privacy isolation
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 9.1 Review trip_itinerary queries
  - Verify WHERE user_id = auth.uid() filter
  - Check RLS policies
  - _Requirements: 10.1, 10.4_

- [ ]* 9.2 Write property test for itinerary privacy
  - **Property 8: Itinerary Privacy**
  - **Validates: Requirements 10.1, 10.2, 10.3**

- [ ] 10. Final Migration - Make personal_budget NOT NULL
  - Ensure all participants have budgets set
  - Run ALTER TABLE to make NOT NULL
  - Update TypeScript types to remove null
  - _Requirements: 2.1, 9.3_

- [ ] 10.1 Create final migration script
  - Check for NULL budgets
  - Prompt users to set budgets if needed
  - Make column NOT NULL
  - _Requirements: 2.1_

- [ ] 10.2 Update TypeScript types to reflect NOT NULL
  - Remove null from personal_budget type
  - Update all components
  - _Requirements: 2.1_

- [ ] 11. Final Checkpoint - Complete Testing
  - Run all property tests
  - Run all unit tests
  - Manual testing with multiple users
  - Verify all requirements met
  - Ask user for final approval

## Notes

- Tasks marked with `*` are optional test tasks
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Migration is done in phases to avoid breaking changes
- Budget privacy is enforced at database level (RLS) and application level
