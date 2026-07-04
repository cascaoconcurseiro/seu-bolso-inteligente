import { create } from "zustand";
import { TabType, TransactionSplitData } from "@/types/transactions";
import { Transaction } from "@/hooks/useTransactions";
import { parseISO } from "date-fns";

export interface TransactionFormState {
  activeTab: TabType;
  amount: string;
  description: string;
  date: Date;
  accountId: string;
  destinationAccountId: string;
  categoryId: string;
  tripId: string;
  notes: string;
  exchangeRate: string;
  destinationAmount: string;

  isInstallment: boolean;
  totalInstallments: number;
  showSplitModal: boolean;
  payerId: string;
  splits: TransactionSplitData[];
  isRefund: boolean;
  isRecurring: boolean;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  recurrenceDay: number;
  enableNotification: boolean;
  notificationDate?: Date;

  hasUserSelectedCategoryManually: boolean;
  lastAppliedCategoryId: string | null;

  transferType: "account" | "goal";
  goalId: string;
  saveAsPending: boolean;

  // Actions
  setActiveTab: (tab: TabType) => void;
  setAmount: (amount: string) => void;
  setDescription: (desc: string) => void;
  setDate: (date: Date) => void;
  setAccountId: (id: string) => void;
  setDestinationAccountId: (id: string) => void;
  setCategoryId: (id: string) => void;
  setTripId: (id: string) => void;
  setNotes: (notes: string) => void;
  setExchangeRate: (rate: string) => void;
  setDestinationAmount: (amount: string) => void;
  setIsInstallment: (val: boolean) => void;
  setTotalInstallments: (val: number) => void;
  setShowSplitModal: (val: boolean) => void;
  setPayerId: (id: string) => void;
  setSplits: (splits: TransactionSplitData[]) => void;
  setIsRefund: (val: boolean) => void;
  setIsRecurring: (val: boolean) => void;
  setFrequency: (freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY") => void;
  setRecurrenceDay: (day: number) => void;
  setEnableNotification: (val: boolean) => void;
  setNotificationDate: (date?: Date) => void;

  setHasUserSelectedCategoryManually: (val: boolean) => void;
  setLastAppliedCategoryId: (id: string | null) => void;

  setTransferType: (type: "account" | "goal") => void;
  setGoalId: (id: string) => void;
  setSaveAsPending: (val: boolean) => void;

  reset: () => void;
  initFromData: (data: Partial<Transaction>) => void;
}

const initialState = {
  activeTab: "EXPENSE" as TabType,
  amount: "",
  description: "",
  date: new Date(),
  accountId: "",
  destinationAccountId: "",
  categoryId: "",
  tripId: "",
  notes: "",
  exchangeRate: "",
  destinationAmount: "",

  isInstallment: false,
  totalInstallments: 1,
  showSplitModal: false,
  payerId: "me",
  splits: [],
  isRefund: false,
  isRecurring: false,
  frequency: "MONTHLY" as const,
  recurrenceDay: 1,
  enableNotification: false,
  notificationDate: undefined,

  hasUserSelectedCategoryManually: false,
  lastAppliedCategoryId: null,

  transferType: "account" as const,
  goalId: "",
  saveAsPending: false,
};

export const useTransactionStore = create<TransactionFormState>((set) => ({
  ...initialState,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setAmount: (amount) => set({ amount }),
  setDescription: (description) => {
    set(() => {
      // Se limpar a descrição, reseta a escolha manual de categoria
      if (description.trim() === "") {
        return { description, hasUserSelectedCategoryManually: false, lastAppliedCategoryId: null };
      }
      return { description };
    });
  },
  setDate: (date) => set({ date }),
  setAccountId: (id) => set({ accountId: id }),
  setDestinationAccountId: (id) => set({ destinationAccountId: id }),
  setCategoryId: (id) => set({ categoryId: id }),
  setTripId: (id) => set({ tripId: id }),
  setNotes: (notes) => set({ notes }),
  setExchangeRate: (rate) => set({ exchangeRate: rate }),
  setDestinationAmount: (amount) => set({ destinationAmount: amount }),
  setIsInstallment: (val) => set({ isInstallment: val }),
  setTotalInstallments: (val) => set({ totalInstallments: val }),
  setShowSplitModal: (val) => set({ showSplitModal: val }),
  setPayerId: (id) => set({ payerId: id }),
  setSplits: (splits) => set({ splits }),
  setIsRefund: (val) => set({ isRefund: val }),
  setIsRecurring: (val) => set({ isRecurring: val }),
  setFrequency: (freq) => set({ frequency: freq }),
  setRecurrenceDay: (day) => set({ recurrenceDay: day }),
  setEnableNotification: (val) => set({ enableNotification: val }),
  setNotificationDate: (date) => set({ notificationDate: date }),

  setHasUserSelectedCategoryManually: (val) => set({ hasUserSelectedCategoryManually: val }),
  setLastAppliedCategoryId: (id) => set({ lastAppliedCategoryId: id }),

  setTransferType: (type) => set({ transferType: type }),
  setGoalId: (id) => set({ goalId: id }),
  setSaveAsPending: (val) => set({ saveAsPending: val }),

  reset: () => set({ ...initialState, date: new Date() }),

  initFromData: (data: any) => {
    set(() => {
      const updates: Partial<TransactionFormState> = {};

      if (data.type) updates.activeTab = data.type;
      if (data.amount !== undefined && data.amount !== null)
        updates.amount = data.amount.toString();
      if (data.description) updates.description = data.description;
      if (data.date) updates.date = typeof data.date === "string" ? parseISO(data.date) : data.date;
      if (data.account_id) updates.accountId = data.account_id;
      if (data.destination_account_id) updates.destinationAccountId = data.destination_account_id;
      if (data.category_id) updates.categoryId = data.category_id;
      if (data.trip_id) updates.tripId = data.trip_id;
      if (data.notes) updates.notes = data.notes;
      if (data.payer_id) updates.payerId = data.payer_id;
      if (data.is_installment) updates.isInstallment = data.is_installment;
      if (data.total_installments) updates.totalInstallments = data.total_installments;

      if (
        data.transaction_splits &&
        Array.isArray(data.transaction_splits) &&
        data.transaction_splits.length > 0
      ) {
        updates.splits = data.transaction_splits.map((s: any) => ({
          memberId: s.member_id || s.memberId,
          percentage: s.percentage,
          amount: s.amount,
        }));
      } else if (data.splits && Array.isArray(data.splits) && data.splits.length > 0) {
        updates.splits = data.splits.map((s: any) => ({
          memberId: s.member_id || s.memberId,
          percentage: s.percentage,
          amount: s.amount,
        }));
      }

      return updates;
    });
  },
}));
