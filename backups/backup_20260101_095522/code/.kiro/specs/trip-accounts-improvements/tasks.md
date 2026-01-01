# Implementation Plan: Trip and Accounts Improvements

## Overview

Implementação de melhorias críticas no sistema de viagens e contas, incluindo orçamento pessoal obrigatório, transferências, saques, redesign da página de contas, e correções de permissões.

## Tasks

- [x] 1. Database: Add transaction types and linked transactions
  - Add TRANSFER and WITHDRAWAL to transaction_type enum
  - Add linked_transaction_id column to transactions table
  - Create index on linked_transaction_id
  - _Requirements: 3.5, 4.1_

- [ ]* 1.1 Write property test for linked transactions
  - **Property 4: Transfer Atomicity**
  - **Validates: Requirements 3.5**

- [x] 2. Database: Create RPC function for transfers
  - Implement transfer_between_accounts() function
  - Validate account ownership
  - Validate sufficient balance
  - Create debit and credit transactions atomically
  - Update account balances
  - _Requirements: 3.3, 3.4, 3.5_

- [ ]* 2.1 Write property test for transfer conservation
  - **Property 3: Transfer Conservation**
  - **Validates: Requirements 3.4**

- [ ]* 2.2 Write unit tests for transfer validation
  - Test insufficient balance rejection
  - Test invalid account rejection
  - Test same account prevention
  - _Requirements: 3.3_

- [x] 3. Database: Create RPC function for withdrawals
  - Implement withdraw_from_account() function
  - Validate account ownership
  - Validate sufficient balance
  - Create withdrawal transaction
  - Update account balance
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 3.1 Write property test for withdrawal validation
  - **Property 5: Withdrawal Validation**
  - **Validates: Requirements 4.3**

- [x] 4. Database: Create RPC function for account creation with initial deposit
  - Implement create_account_with_initial_deposit() function
  - Create account with initial balance
  - If balance > 0, create DEPOSIT transaction
  - If balance = 0, skip deposit transaction
  - _Requirements: 5.1, 5.2, 5.3_

- [ ]* 4.1 Write property test for initial deposit creation
  - **Property 6: Initial Deposit Creation**
  - **Validates: Requirements 5.1**

- [ ]* 4.2 Write unit test for zero balance account
  - **Property 7: No Deposit for Zero Balance**
  - **Validates: Requirements 5.2**

- [x] 5. Database: Update RLS policies for trip permissions
  - Create policy for trip_itinerary INSERT (all members)
  - Create policy for trip_checklist INSERT (all members)
  - Create policy for trip_checklist UPDATE (all members)
  - _Requirements: 2.5, 2.6, 2.7_

- [ ]* 5.1 Write property test for member permissions
  - **Property 9: Member Can Add Itinerary**
  - **Property 10: Member Can Add Checklist**
  - **Validates: Requirements 2.5, 2.6, 2.7**

- [x] 6. Checkpoint - Database migrations complete
  - Ensure all migrations run successfully
  - Verify RPC functions work correctly
  - Test RLS policies
  - Ask user if questions arise

- [x] 7. Frontend: Create TransferModal component
  - Create TransferModal.tsx with form
  - Display source account (readonly)
  - Display available balance
  - Select destination account (user's other accounts)
  - Input amount with validation
  - Input description
  - Call transfer RPC on submit
  - _Requirements: 3.1, 3.2, 3.3, 3.6_

- [ ]* 7.1 Write integration test for transfer flow
  - Test complete UI → RPC → DB → UI update flow
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 8. Frontend: Create WithdrawalModal component
  - Create WithdrawalModal.tsx with form
  - Display account info
  - Display available balance
  - Input amount with validation
  - Input description (optional)
  - Call withdrawal RPC on submit
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ]* 8.1 Write integration test for withdrawal flow
  - Test complete UI → RPC → DB → UI update flow
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 9. Frontend: Update PersonalBudgetModal to be required
  - Add required prop to PersonalBudgetModal
  - Prevent modal close when required=true and budget not set
  - Show clear message about requirement
  - Validate budget > 0
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 9.1 Write property test for budget validation
  - **Property 2: Budget Validation**
  - **Validates: Requirements 1.3**

- [ ] 10. Frontend: Implement required budget on trip join
  - Create useRequirePersonalBudget hook
  - Show PersonalBudgetModal automatically when user joins trip
  - Make modal required (cannot close without setting budget)
  - Save budget to trip_members.personal_budget
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 10.1 Write integration test for required budget flow
  - Test accept invitation → modal appears → cannot close → set budget → saved
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 11. Frontend: Implement personal budget privacy
  - Update useTripMembers to only return personal_budget for current user
  - Hide other members' budgets in UI
  - Show only own budget in trip detail page
  - _Requirements: 1.4, 1.5_

- [ ]* 11.1 Write property test for budget privacy
  - **Property 1: Personal Budget Privacy**
  - **Validates: Requirements 1.4, 1.5**

- [ ] 12. Frontend: Fix trip permissions UI
  - Hide "Adicionar Participante" button for non-owners
  - Hide "Editar Viagem" and "Excluir" buttons for non-owners
  - Show all buttons for owners
  - _Requirements: 2.1, 2.2, 2.8_

- [ ]* 12.1 Write property test for permission-based visibility
  - **Property 8: Permission-Based Button Visibility**
  - **Validates: Requirements 2.1**

- [ ] 13. Frontend: Enable itinerary and checklist for all members
  - Verify itinerary add/edit works for non-owners
  - Verify checklist add/edit works for non-owners
  - Test with different user roles
  - _Requirements: 2.5, 2.6, 2.7_

- [ ] 14. Checkpoint - Trip features complete
  - Test personal budget requirement
  - Test budget privacy
  - Test permissions (owner vs member)
  - Test itinerary and checklist for members
  - Ask user if questions arise

- [ ] 15. Frontend: Redesign Accounts page - Main view
  - Create new layout with summary card at top
  - Display total balance across all accounts
  - Display account count
  - Create account cards grid
  - Each card shows: bank logo, name, type, number, balance
  - Each card shows last 3 transactions
  - Add "Nova Conta" button
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.11, 7.12_

- [ ] 16. Frontend: Redesign Accounts page - Detail view
  - Create account detail page/view
  - Show account header with name, type, number
  - Show large balance display
  - Add action buttons: Transferir, Sacar, Editar, Excluir
  - Display full transaction history
  - Group transactions by date
  - Show transaction icon, description, category, amount
  - Use green for positive, red for negative amounts
  - _Requirements: 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.12_

- [ ] 17. Frontend: Integrate transfer and withdrawal buttons
  - Add "Transferir" button to account detail
  - Open TransferModal on click
  - Add "Sacar" button to account detail
  - Open WithdrawalModal on click
  - _Requirements: 3.1, 4.1_

- [ ] 18. Frontend: Update account creation to use new RPC
  - Update create account form to use create_account_with_initial_deposit RPC
  - Handle initial balance input
  - Verify deposit transaction is created when balance > 0
  - Verify no deposit when balance = 0
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 19. Frontend: Implement global transaction button
  - Add "Nova Transação" button to app header/layout
  - Make button visible on all pages
  - Detect current page context (trip, account, etc)
  - Pre-fill transaction modal with context
  - Test from Dashboard, Accounts, Trips, Family pages
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [ ]* 19.1 Write integration tests for global button
  - Test button works from each major page
  - Test context is correctly detected and passed
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 20. Frontend: Fix trip linking in Family Advanced
  - Update Family Advanced page to load user's trips
  - Display trips with name, destination, dates
  - Allow selecting trip to link to family
  - Show visual indicator when trip is linked
  - Handle empty state (no trips available)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 21. Checkpoint - All features complete
  - Test all new features end-to-end
  - Verify accounts page looks professional
  - Verify all buttons and modals work
  - Verify permissions are correct
  - Ask user if questions arise

- [ ] 22. Polish: Add loading states
  - Add loading spinners to all async operations
  - Add skeleton loaders to accounts page
  - Add loading states to modals
  - Disable buttons during operations

- [ ] 23. Polish: Improve error messages
  - Add user-friendly error messages for all operations
  - Add validation messages to forms
  - Add toast notifications for success/error
  - Handle network errors gracefully

- [ ] 24. Polish: Add animations and transitions
  - Add smooth transitions to modals
  - Add hover effects to cards and buttons
  - Add loading animations
  - Ensure animations respect reduced motion preferences

- [ ] 25. Polish: Accessibility improvements
  - Add ARIA labels to all interactive elements
  - Ensure keyboard navigation works
  - Test with screen reader
  - Ensure color contrast meets WCAG standards
  - Add focus indicators

- [ ] 26. Final testing and bug fixes
  - Run all property-based tests
  - Run all integration tests
  - Perform manual testing of all features
  - Fix any bugs found
  - Get user approval

## Notes

- Tasks marked with `*` are optional test tasks
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Integration tests validate complete user flows
- Manual testing ensures professional quality
