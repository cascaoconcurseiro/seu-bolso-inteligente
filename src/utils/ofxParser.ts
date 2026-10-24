import { XMLParser } from "fast-xml-parser";
import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";

export interface OfxTransaction {
  amount: number;
  type: "EXPENSE" | "INCOME";
  description: string;
  date: string;
  external_id: string | null;
}

interface ExistingTransactionForOfxDedup {
  account_id: string | null;
  amount: number | string;
  type: string;
  date: string;
  external_id?: string | null;
  description: string;
}

const scalarTags = "TRNTYPE|DTPOSTED|TRNAMT|FITID|NAME|MEMO";
const scalarTagPattern = new RegExp(`<(${scalarTags})>([^<]*)(?=<)`, "gi");

function normalizeOfxSgml(content: string): string {
  return content.replace(scalarTagPattern, (match, tag: string, value: string, offset, source) => {
    const nextTag = source.slice(offset + match.length).match(/^<\/([^>]+)>/);
    if (nextTag?.[1]?.toUpperCase() === tag.toUpperCase()) return match;
    return `<${tag}>${value}</${tag}>`;
  });
}

function extractStatementTransactions(value: unknown): Record<string, unknown>[] {
  if (typeof value !== "object" || value === null) return [];

  const object = value as Record<string, unknown>;
  if ("STMTTRN" in object) {
    const rows = object.STMTTRN;
    return Array.isArray(rows)
      ? rows.filter(
          (row): row is Record<string, unknown> => typeof row === "object" && row !== null
        )
      : typeof rows === "object" && rows !== null
        ? [rows as Record<string, unknown>]
        : [];
  }

  return Object.values(object).flatMap(extractStatementTransactions);
}

function fieldText(transaction: Record<string, unknown>, key: string): string {
  const value = transaction[key];
  return value === undefined || value === null ? "" : String(value).trim();
}

function parseOfxDate(value: string): string {
  const digits = value.match(/^\d{8}/)?.[0];
  if (!digits) throw new Error("OFX transaction has no valid DTPOSTED date");

  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("OFX transaction has an impossible DTPOSTED date");
  }

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function parseOfxTransactions(fileText: string): OfxTransaction[] {
  const ofxStart = fileText.search(/<OFX(?:\s|>)/i);
  if (ofxStart < 0) throw new Error("File does not contain an OFX document");

  const document = normalizeOfxSgml(fileText.slice(ofxStart));
  const parsed = new XMLParser({ trimValues: true, parseTagValue: false }).parse(document);
  const rawTransactions = extractStatementTransactions(parsed);

  return rawTransactions.map((transaction) => {
    const rawAmount = fieldText(transaction, "TRNAMT");
    const amount = Number(rawAmount);
    if (!rawAmount || !Number.isFinite(amount)) {
      throw new Error("OFX transaction has an invalid TRNAMT amount");
    }

    const rawDate = fieldText(transaction, "DTPOSTED");
    const date = parseOfxDate(rawDate);
    const externalId = fieldText(transaction, "FITID");

    return {
      amount: Math.abs(amount),
      type: amount < 0 ? "EXPENSE" : "INCOME",
      description:
        fieldText(transaction, "MEMO") || fieldText(transaction, "NAME") || "Transação Importada",
      date,
      external_id: externalId || null,
    };
  });
}

export function isDuplicateOfxTransaction(
  existing: ExistingTransactionForOfxDedup,
  incoming: OfxTransaction,
  accountId: string
): boolean {
  if (
    existing.account_id !== accountId ||
    existing.type !== incoming.type ||
    existing.date !== incoming.date ||
    SafeFinancialCalculator.toSafeNumber(existing.amount) !==
      SafeFinancialCalculator.toSafeNumber(incoming.amount)
  ) {
    return false;
  }

  const existingExternalId = existing.external_id?.trim() || null;
  const incomingExternalId = incoming.external_id?.trim() || null;
  if (existingExternalId && incomingExternalId) {
    return existingExternalId === incomingExternalId;
  }

  return existing.description.trim().toLowerCase() === incoming.description.trim().toLowerCase();
}

export function ofxBatchDuplicateKey(transaction: OfxTransaction, accountId: string): string {
  const externalId = transaction.external_id?.trim();
  if (externalId) return `fitid:${accountId}:${externalId}`;

  return [
    "content",
    accountId,
    transaction.type,
    transaction.date,
    SafeFinancialCalculator.toSafeNumber(transaction.amount),
    transaction.description.trim().toLowerCase(),
  ].join(":");
}

export function ofxContentDuplicateKey(
  transaction: { amount: number | string; type: string; date: string; description: string },
  accountId: string
): string {
  return [
    "content",
    accountId,
    transaction.type,
    transaction.date,
    SafeFinancialCalculator.toSafeNumber(transaction.amount),
    transaction.description.trim().toLowerCase(),
  ].join(":");
}

export function ofxTransactionDuplicateBaseKey(
  transaction: { amount: number | string; type: string; date: string },
  accountId: string
): string {
  return [
    "base",
    accountId,
    transaction.type,
    transaction.date,
    SafeFinancialCalculator.toSafeNumber(transaction.amount),
  ].join(":");
}
