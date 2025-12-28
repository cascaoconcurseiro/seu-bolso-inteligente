# Tasks Document: International Accounts

## Task 1: Update Account Interface and Hook
- [x] Add `is_international` field to Account interface in `useAccounts.ts`
- [x] Update `useCreateAccount` to include `is_international` parameter

## Task 2: Update TransactionForm for Currency Filtering
- [x] Detect trip currency when trip is selected
- [x] Filter accounts/cards by currency (local for BRL, international for foreign)
- [x] Show correct currency symbol in amount field
- [x] Save transaction with correct currency field
- [x] Show message when no compatible account exists

## Task 3: Update useTransactions to Filter Foreign Currency
- [x] Filter out foreign currency transactions from main page (already done)
- [x] Add currency field to CreateTransactionInput

## Task 4: Display International Accounts with Visual Indicator
- [x] Show currency badge on international accounts in Settings
- [x] Show currency badge on account selection in TransactionForm

## Task 5: Test Full Flow
- [ ] Create international account (USD)
- [ ] Create trip with USD currency
- [ ] Add transaction to trip - verify only USD accounts shown
- [ ] Verify transaction doesn't appear on main transactions page
- [ ] Verify transaction appears in trip expenses
