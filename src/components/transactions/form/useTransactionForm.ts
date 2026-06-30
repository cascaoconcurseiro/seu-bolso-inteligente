import { useAuth } from "@/contexts/AuthContext";
import { useAccounts } from "@/hooks/useAccounts";
import { useAIPrediction } from "@/hooks/useAIPrediction";
import { useCategoriesHierarchical, useCreateDefaultCategories } from "@/hooks/useCategories";
import { useFamilyMembers, useSharedContacts } from "@/hooks/useFamily";
import { useAutoShareRules, matchAutoShareRule } from "@/hooks/useAutoShareRules";
import { useGoals } from "@/hooks/useGoals";
import { useTransactionModal } from "@/hooks/useTransactionModal";
import {
  CreateTransactionInput,
  TransactionType,
  useCreateTransaction,
  useTransactions,
  useUpdateTransaction,
} from "@/hooks/useTransactions";
import { useTripMembers } from "@/hooks/useTripMembers";
import { useTrips } from "@/hooks/useTrips";
import { useUserProfile } from "@/hooks/useUserProfile";
import { CategoryPredictionService } from "@/services/categoryPredictionService";
import { validateTransaction } from "@/services/validationService";
import { useTransactionStore } from "@/store/useTransactionStore";
import { haptics } from "@/utils/haptics";
import { logger } from "@/utils/logger";
import { differenceInDays, format, parseISO } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { showActionFeedback } from "@/components/ui/ActionFeedback";
import { moneyUtils } from "@/utils/money";

interface TransactionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: Partial<Transaction>;
  context?: {
    tripId?: string;
    accountId?: string;
    categoryId?: string;
  };
}

export function useTransactionForm({
  onSuccess,
  onCancel,
  context,
  initialData,
}: TransactionFormProps) {
  const navigate = useNavigate();
  const { setShowTransactionModal } = useTransactionModal();
  const { user } = useAuth();
  const { contributeToGoal, goals } = useGoals();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: profile } = useUserProfile();
  const { data: categories, isLoading: categoriesLoading } = useCategoriesHierarchical();
  const { data: trips } = useTrips();
  const { data: rawFamilyMembers = [], isLoading: membersLoading } = useFamilyMembers();
  const { data: contacts = [] } = useSharedContacts();

  const familyMembers = useMemo(() => {
    const existingIds = new Set(rawFamilyMembers.map((m) => m.id));
    const activeContacts = contacts.filter((c) => c.active_in_form && !existingIds.has(c.id));
    return [...rawFamilyMembers, ...activeContacts];
  }, [rawFamilyMembers, contacts]);
  const myMemberRecord = useMemo(() => {
    return (familyMembers || []).find((m) => m.linked_user_id === user?.id);
  }, [familyMembers, user?.id]);
  const { data: autoShareRules = [] } = useAutoShareRules();
  const { data: allTransactions = [] } = useTransactions();
  const createTransaction = useCreateTransaction();
  const createDefaultCategories = useCreateDefaultCategories();

  // Zustand Store Integration
  const store = useTransactionStore();

  const activeTab = store.activeTab;
  const amount = store.amount;
  const description = store.description;
  const date = store.date;
  const accountId = store.accountId;
  const destinationAccountId = store.destinationAccountId;
  const categoryId = store.categoryId;
  const tripId = store.tripId;
  const notes = store.notes;
  const exchangeRate = store.exchangeRate;
  const destinationAmount = store.destinationAmount;

  const isInstallment = store.isInstallment;
  const totalInstallments = store.totalInstallments;
  const showSplitModal = store.showSplitModal;
  const payerId = store.payerId;
  const splits = store.splits;
  const isRefund = store.isRefund;
  const isRecurring = store.isRecurring;
  const frequency = store.frequency;
  const recurrenceDay = store.recurrenceDay;
  const enableNotification = store.enableNotification;
  const notificationDate = store.notificationDate;

  const transferType = store.transferType;
  const goalId = store.goalId;
  const saveAsPending = store.saveAsPending;

  const [rippleState, setRippleState] = useState<"success" | "error" | null>(null);

  const lastAppliedCategoryIdRef = useRef<string | null>(null);
  // Refs anti-loop para effects que chamam setters derivados de variáveis compostas
  const lastSetPayerIdRef = useRef<string>(store.payerId);
  const lastClearedAccountForPaidByOtherRef = useRef<boolean | null>(null);
  const lastClearedAccountForTabRef = useRef<string | null>(null);

  // Auto-share: pré-popular splits quando regra casa (feedback visual imediato)
  const autoShareAppliedRef = useRef(false);
  useEffect(() => {
    // Só aplica em despesa nova, sem splits manuais, e só uma vez por "sessão" do form
    if (
      activeTab !== "EXPENSE" ||
      initialData ||
      splits.length > 0 ||
      autoShareAppliedRef.current ||
      autoShareRules.length === 0
    )
      return;

    const matched = matchAutoShareRule(autoShareRules, categoryId || null, description);
    if (!matched) return;

    const otherPct = matched.split_ratio * 100;
    const myMemberId = myMemberRecord?.id;
    if (!myMemberId) return;

    autoShareAppliedRef.current = true;
    // Só armazena o split do parceiro — o SplitModal em modo "Eu Paguei"
    // trabalha com splits implícitos (o criador assume o restante).
    store.setSplits([{ memberId: matched.member_id, percentage: otherPct, amount: 0 }]);
  }, [
    activeTab,
    categoryId,
    description,
    autoShareRules,
    splits.length,
    initialData,
    myMemberRecord?.id,
  ]);

  const predictionType = useMemo(() => {
    if (activeTab === "INCOME") return "income";
    if (activeTab === "EXPENSE") return "expense";
    return null;
  }, [activeTab]);

  const { suggestion, predictedCategoryId, isPredicting } = useAIPrediction(
    description,
    predictionType || "expense",
    !!predictionType
  );

  // Context application
  // Resetar a escolha manual se o usuário limpar a descrição para nova digitação
  useEffect(() => {
    if (description.trim() === "") {
      lastAppliedCategoryIdRef.current = null;
    }
  }, [description]);

  // AI Auto-categoria inteligente e blindada contra race conditions
  useEffect(() => {
    if (predictedCategoryId) {
      const isCurrentCategoryFromAI = categoryId === lastAppliedCategoryIdRef.current;

      if (!store.hasUserSelectedCategoryManually || isCurrentCategoryFromAI) {
        store.setCategoryId(predictedCategoryId);
        lastAppliedCategoryIdRef.current = predictedCategoryId;
        store.setHasUserSelectedCategoryManually(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictedCategoryId, store.hasUserSelectedCategoryManually, categoryId]);

  const handleCategoryChange = (val: string) => {
    store.setCategoryId(val);
    store.setHasUserSelectedCategoryManually(true);
  };

  const { data: tripMembers = [] } = useTripMembers(tripId || null);

  useEffect(() => {
    if (context?.accountId && context?.tripId === tripId) return;
    store.setAccountId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, context?.accountId, context?.tripId]);

  const updateTransaction = useUpdateTransaction();

  // Populate from initialData or context (Initialization)
  // Reset hasInitialized when initialData changes to fix state persistence bug
  const hasInitialized = useRef(false);
  const lastInitialDataId = useRef<string | undefined>(undefined);

  useEffect(() => {
    const currentId = initialData?.id;

    // Reset initialization flag if we're opening a different transaction or creating a new one
    if (lastInitialDataId.current !== currentId) {
      hasInitialized.current = false;
      lastInitialDataId.current = currentId;
    }

    if (!hasInitialized.current) {
      if (initialData && typeof initialData === "object" && Object.keys(initialData).length > 0) {
        store.initFromData(initialData);
      } else {
        store.reset();
        // Apply context ONLY when creating a new transaction
        if (context?.tripId) store.setTripId(context.tripId);
        if (context?.accountId) {
          store.setAccountId(context.accountId);
        } else {
          // Pré-selecionar conta padrão do perfil se não houver contexto específico
          const defaultAccId = (profile as any)?.default_account_id;
          if (defaultAccId) store.setAccountId(defaultAccId);
        }
        if (context?.categoryId) store.setCategoryId(context.categoryId);
      }
      hasInitialized.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, context, profile?.id]);

  // Aplicar conta/cartão padrão do perfil ao abrir formulário de nova transação
  const hasAppliedProfileDefaults = useRef(false);
  useEffect(() => {
    // Só aplica na criação (sem initialData) e apenas uma vez por abertura do form
    if (initialData?.id) {
      hasAppliedProfileDefaults.current = false;
      return;
    }
    if (hasAppliedProfileDefaults.current) return;
    if (!profile || accountsLoading) return;

    hasAppliedProfileDefaults.current = true;

    // Não sobrescrever se já foi definido via context
    if (context?.accountId) return;

    if (activeTab === "EXPENSE") {
      // Para despesas: preferir cartão padrão, depois conta padrão
      const defaultCard = profile.default_credit_card_id;
      const defaultAcc = profile.default_account_id;
      if (defaultCard && !accountId) {
        store.setAccountId(defaultCard);
      } else if (defaultAcc && !accountId) {
        store.setAccountId(defaultAcc);
      }
    } else if (activeTab === "INCOME" || activeTab === "TRANSFER") {
      const defaultAcc = profile.default_account_id;
      if (defaultAcc && !accountId) {
        store.setAccountId(defaultAcc);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, accountsLoading, initialData?.id]);

  // Resetar flag quando o form é reaberto para nova transação
  useEffect(() => {
    if (!initialData?.id) {
      hasAppliedProfileDefaults.current = false;
    }
  }, [initialData?.id]);

  // Validation & Warnings
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<unknown>(null);

  // Default Categories Check
  const [categoriesChecked, setCategoriesChecked] = useState(false);
  useEffect(() => {
    if (!categoriesLoading && !categoriesChecked) {
      setCategoriesChecked(true);
      if (categories?.length === 0) createDefaultCategories.mutate();
    }
  }, [categoriesLoading, categoriesChecked, categories?.length, createDefaultCategories]);

  // Duplicate detection
  useEffect(() => {
    if (!allTransactions || allTransactions.length === 0) {
      setDuplicateWarning(false);
      return;
    }
    const handler = setTimeout(() => {
      const numericAmount = moneyUtils.parse(amount) || 0;
      if (!description || numericAmount === 0 || !date) {
        setDuplicateWarning(false);
        return;
      }
      const accountId = store.accountId;
      const hasDuplicate = allTransactions.some((tx) => {
        if (initialData && tx.id === initialData.id) return false;
        if (initialData && initialData.series_id && tx.series_id === initialData.series_id)
          return false;
        if (tx.type !== activeTab) return false;
        if (accountId && tx.account_id !== accountId) return false;
        
        const amountMatch = Math.abs(tx.amount - numericAmount) < 0.01;
        
        const desc1 = tx.description.toLowerCase().trim();
        const desc2 = description.toLowerCase().trim();
        const descMatch = desc1 === desc2;

        // Only consider transactions that have a real creation timestamp
        if (!tx.created_at) return false;
        const msSinceCreation = new Date().getTime() - new Date(tx.created_at).getTime();
        // Must have been created in the past and within the last 30 minutes
        const withinWindow = msSinceCreation >= 0 && msSinceCreation <= 30 * 60 * 1000;

        // The selected date in the form must match the existing tx date (same calendar day)
        const txDateStr = typeof tx.date === "string" ? tx.date : tx.date?.toString?.();
        const formDateStr = typeof date === "string" ? date : date?.toISOString?.()?.slice(0, 10);
        const dateMatch = txDateStr?.slice(0, 10) === formDateStr?.slice(0, 10);

        return amountMatch && descMatch && withinWindow && dateMatch;

      });
      setDuplicateWarning(hasDuplicate);
    }, 500);
    return () => clearTimeout(handler);
  }, [amount, description, date, activeTab, allTransactions, initialData, store.accountId]);

  // When a trip is selected, build a merged member list that includes trip participants
  // who have a user account (user_id != null). Guests (user_id === null) are skipped
  // because splits require a resolvable family_members record on the backend.
  const effectiveFamilyMembers = useMemo(() => {
    if (!tripId || !tripMembers || tripMembers.length === 0) return familyMembers || [];

    const existingUserIds = new Set(
      (familyMembers || []).map((m) => m.linked_user_id).filter(Boolean)
    );

    const tripOnlyMembers = tripMembers
      .filter((tm) => tm.user_id && !existingUserIds.has(tm.user_id))
      .map((tm) => ({
        id: tm.user_id as string,
        family_id: "",
        user_id: tm.user_id,
        linked_user_id: tm.user_id as string,
        name:
          tm.display_name ||
          tm.guest_name ||
          tm.profiles?.full_name ||
          tm.profiles?.email ||
          "Participante",
        email: tm.profiles?.email || null,
        role: "viewer" as const,
        avatar_url: null,
        avatar_color: null,
        avatar_icon: null,
        status: "active" as const,
        member_type: "contact" as const,
        invited_by: null,
        sharing_scope: "all" as const,
        scope_start_date: null,
        scope_end_date: null,
        scope_trip_id: null,
        active_in_form: true,
        created_at: "",
        updated_at: "",
      }));

    // Incluir guests (trip_members com user_id: null) como membros virtuais
    const guestMembers = tripMembers
      .filter((tm) => !tm.user_id)
      .map((tm) => ({
        id: tm.id,
        family_id: "",
        user_id: null,
        linked_user_id: tm.id,
        name: tm.guest_name || tm.display_name || "Convidado",
        email: null,
        role: "viewer" as const,
        avatar_url: null,
        avatar_color: null,
        avatar_icon: null,
        status: "active" as const,
        member_type: "contact" as const,
        invited_by: null,
        sharing_scope: "all" as const,
        scope_start_date: null,
        scope_end_date: null,
        scope_trip_id: null,
        active_in_form: true,
        created_at: "",
        updated_at: "",
      }));

    return [...(familyMembers || []), ...tripOnlyMembers, ...guestMembers];
  }, [tripId, tripMembers, familyMembers]);

  // Available Members logic
  const availableMembers = useMemo(() => {
    const membersList = effectiveFamilyMembers;

    // If it's a trip, prefer trip members (exclude guests with null user_id)
    if (tripId && tripMembers && tripMembers.length > 0) {
      const payerUserId = payerId === "me" ? user?.id : payerId;
      // Inclui tanto user_id (usuários registrados) quanto trip_members.id (guests)
      const tripAllIds = new Set([
        ...tripMembers.map((tm) => tm.user_id).filter(Boolean),
        ...tripMembers.filter((tm) => !tm.user_id).map((tm) => tm.id),
      ] as string[]);
      return membersList.filter(
        (m) => m.linked_user_id !== payerUserId && tripAllIds.has(m.linked_user_id as string)
      );
    }

    // If it's family
    const payerMemberId = payerId === "me" ? myMemberRecord?.id : payerId;
    return membersList.filter((m) => m.id !== payerMemberId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, tripMembers, effectiveFamilyMembers, user?.id, payerId, myMemberRecord?.id]);

  // A limpeza automática de splits (setSplits([])) quando o payerId mudava
  // foi removida pois apagava os splits recém-carregados na edição. O UX no modal
  // lida bem com a manutenção dos splits caso o usuário troque "Eu Paguei" / "Outro Pagou".

  const creditCards = (accounts || []).filter((a) => a.type === "CREDIT_CARD");
  const transferAccounts = (accounts || []).filter((a) => a.type !== "CREDIT_CARD");
  const isCreditCard = creditCards.some((c) => c.id === accountId);
  const isExpense = activeTab === "EXPENSE";
  const selectedTrip = trips?.find((t) => t.id === tripId);
  const hasSharing = splits.length > 0 || (payerId !== "me" && payerId !== "");
  const isPaidByOther =
    !membersLoading &&
    payerId !== "me" &&
    payerId !== "" &&
    payerId !== myMemberRecord?.id &&
    payerId !== user?.id;
  const selectedAccount = accounts?.find((a) => a.id === accountId);
  const selectedDestAccount = accounts?.find((a) => a.id === destinationAccountId);

  // Corrigir payerId vindo do banco caso seja o próprio usuário
  // ANTI-LOOP: usa ref para não chamar setPayerId se o valor já é 'me'
  useEffect(() => {
    const shouldNormalize =
      (user?.id && payerId === user.id) || (myMemberRecord?.id && payerId === myMemberRecord.id);

    if (shouldNormalize && lastSetPayerIdRef.current !== "me") {
      lastSetPayerIdRef.current = "me";
      store.setPayerId("me");
    } else if (!shouldNormalize) {
      lastSetPayerIdRef.current = payerId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, myMemberRecord?.id, payerId]);

  const isExchangeTransfer =
    activeTab === "TRANSFER" &&
    selectedAccount &&
    selectedDestAccount &&
    selectedAccount.currency !== selectedDestAccount.currency;

  const isCrossCurrencyTripExpense =
    isExpense &&
    selectedTrip &&
    selectedAccount &&
    selectedAccount.currency !== selectedTrip.currency;

  const showExchangePanel = isExchangeTransfer || isCrossCurrencyTripExpense;

  const handleDestAmountChange = (val: string) => {
    store.setDestinationAmount(val);
    const numAmount = moneyUtils.parse(amount);
    const numDest = moneyUtils.parse(val);
    if (numAmount > 0 && numDest > 0) {
      const computedRate = (numAmount / numDest).toFixed(4);
      store.setExchangeRate(computedRate);
    } else {
      store.setExchangeRate("");
    }
  };

  // Se o amount de origem mudar, recalcular a taxa de câmbio
  useEffect(() => {
    if (showExchangePanel) {
      const numAmount = moneyUtils.parse(amount);
      const numDest = moneyUtils.parse(destinationAmount);
      if (numAmount > 0 && numDest > 0) {
        const computedRate = (numAmount / numDest).toFixed(4);
        store.setExchangeRate(computedRate);
      } else {
        store.setExchangeRate("");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, showExchangePanel, destinationAmount]);

  // Limpar contas caso não aplicável
  // ANTI-LOOP: só chama setAccountId se isPaidByOther mudou de false→true
  useEffect(() => {
    if (isPaidByOther && lastClearedAccountForPaidByOtherRef.current !== true) {
      lastClearedAccountForPaidByOtherRef.current = true;
      store.setAccountId("");
    } else if (!isPaidByOther) {
      lastClearedAccountForPaidByOtherRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaidByOther]);

  // Limpar conta selecionada se mudar para receita e for um cartão de crédito
  // ANTI-LOOP: só chama setAccountId se o combo activeTab+accountId ainda não foi limpo
  useEffect(() => {
    const key = `${activeTab}:${accountId}`;
    if (
      activeTab === "INCOME" &&
      selectedAccount?.type === "CREDIT_CARD" &&
      lastClearedAccountForTabRef.current !== key
    ) {
      lastClearedAccountForTabRef.current = key;
      store.setAccountId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedAccount?.type, accountId]);

  const transactionCurrency =
    selectedTrip?.currency ||
    (selectedAccount?.is_international ? selectedAccount.currency : null) ||
    "BRL";

  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter((acc) => {
      if (activeTab === "INCOME" && acc.type === "CREDIT_CARD") {
        return false;
      }
      if (
        (activeTab === "INCOME" || activeTab === "EXPENSE") &&
        (acc.type === "INVESTMENT" || acc.type === "EMERGENCY_FUND")
      ) {
        return false;
      }
      if (activeTab === "TRANSFER") {
        return true;
      }
      if (selectedTrip) {
        if (selectedTrip.currency === "BRL") return !acc.is_international;
        return acc.is_international && acc.currency === selectedTrip.currency;
      }
      return !acc.is_international;
    });
    // ANTI-LOOP: accountId removido das deps — não influencia quais contas são listadas,
    // apenas causava recalcular a lista ao mudar a seleção, retroalimentando o loop #185.
  }, [accounts, selectedTrip, activeTab]);

  // ANTI-LOOP: Ref guarda o último accountId que foi invalidado para evitar chamar
  // setAccountId('') repetidamente quando já está vazio (loop: filteredAccounts → setAccountId → filteredAccounts).
  const lastInvalidatedAccountRef = useRef<string>("");
  useEffect(() => {
    if (accountId && filteredAccounts && filteredAccounts.length > 0) {
      const isAccountValid = filteredAccounts.some((acc) => acc.id === accountId);
      if (!isAccountValid && lastInvalidatedAccountRef.current !== accountId) {
        lastInvalidatedAccountRef.current = accountId;
        store.setAccountId("");
      }
    } else if (!accountId) {
      // Reset ref quando conta já está vazia — próxima seleção inválida pode ser detectada
      lastInvalidatedAccountRef.current = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAccounts, accountId]);

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      BRL: "R$",
      USD: "$",
      EUR: "€",
      GBP: "£",
      CAD: "C$",
      AUD: "A$",
      JPY: "¥",
    };
    return symbols[currency] || currency;
  };

  const performSubmit = async (transactionData: CreateTransactionInput) => {
    try {
      haptics.success();
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

      // Fire feedback immediately — before server responds (optimistic, like Nubank)
      showActionFeedback("success");

      // Close the modal slightly after the animation starts so it feels seamless
      setTimeout(() => {
        if (onSuccess) onSuccess();
        else navigate("/transacoes");
      }, 80);

      if (initialData && initialData.id) {
        updateTransaction.mutate({ ...transactionData, id: initialData.id });
      } else {
        createTransaction.mutate(transactionData);

        if (user && categoryId && description && activeTab !== "TRANSFER") {
          CategoryPredictionService.learnFromUser(
            description,
            categoryId,
            user.id,
            !!(predictedCategoryId && predictedCategoryId !== categoryId)
          ).catch((error) => logger.error("Erro ao registrar aprendizado:", error));
        }
      }

      setTimeout(() => setRippleState(null), 300);
    } catch (error: any) {
      logger.error("Erro ao salvar transação:", error);
      setRippleState("error");
      showActionFeedback("error");
      setTimeout(() => setRippleState(null), 800);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const handleError = (msg: string, opts?: any) => {
      showActionFeedback("error");
      if (opts) {
        toast.error(msg, opts);
      } else {
        toast.error(msg);
      }
    };
    setValidationErrors([]);
    setValidationWarnings([]);
    const numericAmount = moneyUtils.parse(amount) || 0;
    const transactionSplits =
      activeTab === "EXPENSE"
        ? splits.map((s) => ({
            member_id: s.memberId,
            percentage: s.percentage,
            amount: Number(((numericAmount * s.percentage) / 100).toFixed(2)),
          }))
        : [];
    const isShared = transactionSplits.length > 0 || (activeTab === "EXPENSE" && isPaidByOther);

    if (isShared && !isPaidByOther && transactionSplits.length === 0) {
      handleError("Selecione pelo menos um membro para dividir a despesa");
      setShowSplitModal(true);
      return;
    }
    if (numericAmount <= 0) {
      handleError("O valor da transação deve ser maior que zero");
      return;
    }
    if (!description.trim()) {
      handleError("A descrição é obrigatória");
      return;
    }
    if (activeTab === "EXPENSE" && !categoryId) {
      handleError("A categoria é obrigatória para despesas");
      return;
    }
    if (!accountId && !isPaidByOther) {
      handleError("A conta de origem é obrigatória");
      return;
    }
    if (activeTab === "TRANSFER") {
      if (transferType === "goal") {
        if (!goalId) {
          handleError("Selecione uma meta de destino");
          return;
        }
        setPendingSubmit(true);
        contributeToGoal(
          {
            id: goalId,
            amount: numericAmount,
            accountId: accountId,
            description: description || "Transferência para Meta",
          },
          {
            onSuccess: () => {
              setPendingSubmit(false);
              onSuccess?.();
            },
            onError: () => {
              setPendingSubmit(false);
            },
          }
        );
        return;
      }
      if (!destinationAccountId) {
        handleError("A conta de destino é obrigatória");
        return;
      }
    }

    if (tripId && selectedTrip && selectedAccount) {
      if (selectedAccount.currency !== selectedTrip.currency) {
        if (!destinationAmount || moneyUtils.parse(destinationAmount) <= 0) {
          handleError(
            `Para gastos multi-moeda, informe o valor real na moeda da viagem (${selectedTrip.currency}).`
          );
          return;
        }
      }
    }

    const resolvedPayerId = (() => {
      if (!isShared && payerId === "me") return undefined;
      if (payerId !== "me") return payerId || undefined;
      const me = familyMembers.find((m) => m.linked_user_id === user?.id);
      if (me) return me.id;
      const meFallback = familyMembers.find((m) => m.email === user?.email || m.role === "admin");
      return meFallback?.id;
    })();

    if (isShared && !resolvedPayerId) {
      handleError(
        "Não foi possível identificar seu perfil de membro na família. Verifique suas configurações."
      );
      return;
    }

    const isActuallyInstallment = isCreditCard
      ? totalInstallments > 1
      : isInstallment && totalInstallments > 1;

    let calculatedCompetenceDate = format(date, "yyyy-MM-01");
    const isEdit = !!initialData && !!initialData.id;
    const isInstallmentTx = isEdit ? initialData.is_installment : isActuallyInstallment;

    if (isEdit && isInstallmentTx && initialData.competence_date) {
      calculatedCompetenceDate = initialData.competence_date;
    } else if (selectedAccount?.type === "CREDIT_CARD" && selectedAccount.closing_day) {
      const txDay = date.getDate();
      if (txDay >= selectedAccount.closing_day) {
        // Se a data da compra for >= ao dia de fechamento, a competência é no mês seguinte
        const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
        calculatedCompetenceDate = format(nextMonth, "yyyy-MM-01");
      }
    }

    const transactionData: CreateTransactionInput = {
      amount: numericAmount,
      description: description.trim(),
      date: format(date, "yyyy-MM-dd"),
      competence_date: calculatedCompetenceDate,
      type: activeTab as TransactionType,
      account_id: !isPaidByOther ? accountId || undefined : undefined,
      destination_account_id: activeTab === "TRANSFER" ? destinationAccountId : undefined,
      category_id: categoryId || undefined,
      trip_id: tripId || undefined,
      currency: transactionCurrency,
      domain: tripId ? "TRAVEL" : isShared ? "SHARED" : "PERSONAL",
      is_shared: isShared,
      payer_id: resolvedPayerId,
      is_installment: isActuallyInstallment,
      total_installments: isActuallyInstallment ? totalInstallments : undefined,
      notes: notes || undefined,
      exchange_rate: showExchangePanel && exchangeRate ? moneyUtils.parse(exchangeRate) : undefined,
      destination_amount:
        showExchangePanel && destinationAmount ? moneyUtils.parse(destinationAmount) : undefined,
      destination_currency:
        isExchangeTransfer && selectedDestAccount
          ? selectedDestAccount.currency
          : isCrossCurrencyTripExpense && selectedTrip
            ? selectedTrip.currency
            : undefined,
      splits: transactionSplits,
      is_refund: isRefund,
      is_recurring: isRecurring,
      frequency: isRecurring ? frequency : undefined,
      recurrence_day: isRecurring && frequency === "MONTHLY" ? recurrenceDay : undefined,
      enable_notification: enableNotification,
      notification_date:
        enableNotification && notificationDate ? format(notificationDate, "yyyy-MM-dd") : undefined,
      status: saveAsPending ? "PENDING" : "CONFIRMED",
    };

    const validation = validateTransaction(
      {
        ...transactionData,
        id: isEdit ? initialData?.id : undefined,
        series_id: isEdit ? initialData?.series_id : undefined,
      } as Partial<Transaction>,
      selectedAccount,
      accounts?.find((a) => a.id === destinationAccountId),
      selectedTrip,
      allTransactions,
      isPaidByOther,
      myMemberRecord?.id,
      user?.id
    );
    if (!validation.isValid) {
      setRippleState("error");
      setTimeout(() => setRippleState(null), 800);
      setValidationErrors(validation.errors);
      handleError("Corrija os erros:", { description: validation.errors.join(" • ") });
      return;
    }
    if (validation.warnings.length > 0) {
      setValidationWarnings(validation.warnings);
      setPendingSubmit(transactionData);
      setShowWarningModal(true);
      return;
    }
    await performSubmit(transactionData);
  };

  return {
    navigate,
    setShowTransactionModal,
    user,
    accounts,
    accountsLoading,
    categories,
    categoriesLoading,
    trips,
    familyMembers,
    effectiveFamilyMembers,
    myMemberRecord,
    allTransactions,
    createTransaction,
    updateTransaction,

    ...store,

    duplicateWarning,
    validationErrors,
    validationWarnings,
    showWarningModal,
    setShowWarningModal,
    pendingSubmit,
    setPendingSubmit,
    performSubmit,
    handleSubmit,
    rippleState,

    isPredicting,

    availableMembers,
    creditCards,
    transferAccounts,
    isCreditCard,
    isExpense,
    selectedTrip,
    hasSharing,
    isPaidByOther,
    selectedAccount,
    selectedDestAccount,
    showExchangePanel,
    isCrossCurrencyTripExpense,
    transactionCurrency,
    filteredAccounts,

    handleDestAmountChange,
    getCurrencySymbol,
    goals,
  };
}
