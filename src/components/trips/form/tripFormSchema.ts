import { moneyUtils } from "@/utils/money";
import { isAfter, isValid, parseISO } from "date-fns";
import { z } from "zod";

export const TRIP_CURRENCIES = [
  { code: "BRL", symbol: "R$", name: "Real brasileiro" },
  { code: "USD", symbol: "$", name: "Dólar americano" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "Libra esterlina" },
  { code: "JPY", symbol: "¥", name: "Iene japonês" },
  { code: "CAD", symbol: "C$", name: "Dólar canadense" },
  { code: "AUD", symbol: "A$", name: "Dólar australiano" },
  { code: "ARS", symbol: "$", name: "Peso argentino" },
  { code: "CLP", symbol: "$", name: "Peso chileno" },
  { code: "UYU", symbol: "$", name: "Peso uruguaio" },
  { code: "PYG", symbol: "₲", name: "Guarani paraguaio" },
] as const;

const currencyCodes = TRIP_CURRENCIES.map((currency) => currency.code);

export interface TripFormValues {
  name: string;
  destination: string;
  notes: string;
  startDate: string;
  endDate: string;
  currency: string;
  budget: string;
  coverImage: string;
  memberIds: string[];
}

export interface TripFormPayload {
  name: string;
  destination: string;
  notes: string | null;
  start_date: string;
  end_date: string;
  currency: string;
  budget: number | null;
  cover_image: string | null;
  memberIds: string[];
}

export class TripFormValidationError extends Error {
  constructor(
    message: string,
    readonly fieldErrors: Partial<Record<keyof TripFormValues, string>>
  ) {
    super(message);
    this.name = "TripFormValidationError";
  }
}

const requiredDate = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return isValid(parseISO(value));
}, "Informe uma data válida");

const schema = z
  .object({
    name: z.string().trim().min(1, "Dê um nome para a viagem").max(100, "Use até 100 caracteres"),
    destination: z.string().trim().min(1, "Informe o destino").max(120, "Use até 120 caracteres"),
    notes: z.string().trim().max(1000, "Use até 1.000 caracteres"),
    startDate: requiredDate,
    endDate: requiredDate,
    currency: z
      .string()
      .refine((value) => currencyCodes.includes(value as (typeof currencyCodes)[number]), {
        message: "Selecione uma moeda válida",
      }),
    budget: z.string(),
    coverImage: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^https:\/\/\S+$/i.test(value),
        "Use um endereço de imagem seguro (https)"
      ),
    memberIds: z.array(z.string()).default([]),
  })
  .superRefine((values, context) => {
    if (isAfter(parseISO(values.startDate), parseISO(values.endDate))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "A data final não pode ser anterior à inicial",
      });
    }

    if (values.budget.trim()) {
      if (!/^-?\d+(?:[.,]\d{1,2})?$/.test(values.budget.trim())) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["budget"],
          message: "Informe um orçamento válido com até 2 casas decimais",
        });
        return;
      }
      const parsed = moneyUtils.parse(values.budget);
      if (!Number.isFinite(parsed)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["budget"],
          message: "Informe um orçamento válido",
        });
      } else if (parsed < 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["budget"],
          message: "O orçamento não pode ser negativo",
        });
      } else if (parsed > 999_999_999_999_999) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["budget"],
          message: "O orçamento excede o limite permitido",
        });
      }
    }
  });

export function parseTripForm(values: TripFormValues): TripFormPayload {
  const result = schema.safeParse(values);
  if (!result.success) {
    const fieldErrors: TripFormValidationError["fieldErrors"] = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof TripFormValues | undefined;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    throw new TripFormValidationError(
      result.error.issues[0]?.message ?? "Revise o formulário",
      fieldErrors
    );
  }

  const valuesParsed = result.data;
  return {
    name: valuesParsed.name,
    destination: valuesParsed.destination,
    notes: valuesParsed.notes || null,
    start_date: valuesParsed.startDate,
    end_date: valuesParsed.endDate,
    currency: valuesParsed.currency,
    budget: valuesParsed.budget.trim() ? moneyUtils.parse(valuesParsed.budget) : null,
    cover_image: valuesParsed.coverImage || null,
    memberIds: [...new Set(valuesParsed.memberIds)],
  };
}
