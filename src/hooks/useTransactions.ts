import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMonth } from "@/contexts/MonthContext";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";
import { getMonthDateRange } from "@/utils/dateUtils";
import { dateUtils } from "@/utils/dateUtils";
import {
  invalidateFinancialQueries,
  invalidateSharedQueries,
  invalidateTripQueries
} from "@/utils/queryInvalidation";
import { transactionToasts } from "@/utils/toastMessages";
import { defaultQueryConfig } from "@/utils/queryConfig";
import { callRPCWithRetry } from "@/utils/supabaseHelpers";
import * as dateFns from "date-fns";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { generateAllNotifications, dismissRelatedNotifications } from "@/services/notificationGenerator";
export * from './transactions/types';
export * from './transactions/useTransactionsQuery';
export * from './transactions/useFinancialSummary';
export * from './transactions/useCreateTransaction';
export * from './transactions/useTransactionMutations';
import { validatePayerId, validateMemberId } from './transactions/helpers';

const TRANSACTION_FETCH_LIMIT = 1000;










