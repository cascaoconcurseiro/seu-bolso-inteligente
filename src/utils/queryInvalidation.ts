/**
 * Query Invalidation Utilities
 * Centralized query invalidation to avoid duplication across hooks
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Invalidate all financial-related queries
 * Use after mutations that affect transactions, accounts, or budgets
 */
export const invalidateFinancialQueries = (queryClient: QueryClient) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    queryClient.invalidateQueries({ queryKey: ['account-statement'] }),
    queryClient.invalidateQueries({ queryKey: ['financial-summary'] }),
    queryClient.invalidateQueries({ queryKey: ['budgets'] }),
    queryClient.invalidateQueries({ queryKey: ['budgets-progress'] }),
    queryClient.invalidateQueries({ queryKey: ['monthly-evolution'] }),
    queryClient.invalidateQueries({ queryKey: ['expenses-by-category'] }),
  ]);
};

/**
 * Invalidate all shared finance queries
 * Use after mutations that affect shared transactions or splits
 */
export const invalidateSharedQueries = (queryClient: QueryClient) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['shared-transactions-with-splits'] }),
    queryClient.invalidateQueries({ queryKey: ['paid-by-others-transactions'] }),
  ]);
};

/**
 * Invalidate all trip-related queries
 * Use after mutations that affect trips or trip transactions
 */
export const invalidateTripQueries = (queryClient: QueryClient) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['trips'] }),
    queryClient.invalidateQueries({ queryKey: ['trip-members'] }),
    queryClient.invalidateQueries({ queryKey: ['trip-transactions'] }),
    queryClient.invalidateQueries({ queryKey: ['trip-budget-summary'] }),
  ]);
};

/**
 * Invalidate all family-related queries
 * Use after mutations that affect family members or invitations
 */
export const invalidateFamilyQueries = (queryClient: QueryClient) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['family-members'] }),
    queryClient.invalidateQueries({ queryKey: ['family-invitations'] }),
    queryClient.invalidateQueries({ queryKey: ['family-users'] }),
  ]);
};

/**
 * Invalidate all category-related queries
 * Use after mutations that affect categories
 */
export const invalidateCategoryQueries = (queryClient: QueryClient) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['categories'] }),
  ]);
};

/**
 * Invalidate ALL financial data
 * Use for major operations that affect multiple areas
 * WARNING: This is expensive, use sparingly
 */
export const invalidateAllFinancialData = (queryClient: QueryClient) => {
  return Promise.all([
    invalidateFinancialQueries(queryClient),
    invalidateSharedQueries(queryClient),
    invalidateTripQueries(queryClient),
    invalidateFamilyQueries(queryClient),
    invalidateCategoryQueries(queryClient),
  ]);
};

/**
 * Invalidate queries related to a specific transaction
 * Use after creating, updating, or deleting a transaction
 */
export const invalidateTransactionQueries = (queryClient: QueryClient) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    queryClient.invalidateQueries({ queryKey: ['account-statement'] }),
    queryClient.invalidateQueries({ queryKey: ['financial-summary'] }),
  ]);
};

/**
 * Invalidate queries related to a specific account
 * Use after creating, updating, or deleting an account
 */
export const invalidateAccountQueries = (queryClient: QueryClient) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    queryClient.invalidateQueries({ queryKey: ['account-statement'] }),
    queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    queryClient.invalidateQueries({ queryKey: ['financial-summary'] }),
  ]);
};

/**
 * Invalidate queries related to budgets
 * Use after creating, updating, or deleting a budget
 */
export const invalidateBudgetQueries = (queryClient: QueryClient) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['budgets'] }),
    queryClient.invalidateQueries({ queryKey: ['budgets-progress'] }),
  ]);
};
