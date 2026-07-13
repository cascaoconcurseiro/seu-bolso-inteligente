import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

const APP_VERSION =
  typeof import.meta.env.VITE_APP_VERSION === "string"
    ? import.meta.env.VITE_APP_VERSION
    : "unknown";

interface ErrorPayload {
  error_type: string;
  message: string;
  stack?: string;
  url?: string;
  file?: string;
  line?: number;
  col?: number;
  extra?: Json;
}

function toJson(value: unknown): Json {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
    return value as string | number | boolean | null;
  }

  if (Array.isArray(value)) return value.map(toJson);

  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toJson(item)]));
  }

  return String(value);
}

function isErrorPayload(value: unknown): value is ErrorPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.error_type === "string" && typeof candidate.message === "string";
}

async function send(payload: ErrorPayload) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("error_logs").insert({
      user_id: user?.id ?? null,
      user_agent: navigator.userAgent.slice(0, 300),
      app_version: APP_VERSION,
      url: window.location.href,
      ...payload,
    });
  } catch {
    // silencioso — nunca deixar o logger quebrar o app
  }
}

export function logError(error: unknown, extra?: Record<string, unknown>) {
  const err = error instanceof Error ? error : new Error(String(error));
  send({
    error_type: err.name || "Error",
    message: err.message,
    stack: err.stack?.slice(0, 2000),
    extra: extra ? toJson(extra) : undefined,
  });
}

async function flushPendingErrors() {
  try {
    const raw = localStorage.getItem("pending_error_log");
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    const pending = Array.isArray(parsed) ? parsed.filter(isErrorPayload) : [];
    if (pending.length === 0) return;
    localStorage.removeItem("pending_error_log");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("error_logs").insert(
      pending.map((p: ErrorPayload) => ({
        user_id: user?.id ?? null,
        user_agent: navigator.userAgent.slice(0, 300),
        app_version: APP_VERSION,
        url: window.location.href,
        ...p,
      }))
    );
  } catch {
    // silencioso
  }
}

export function initGlobalErrorLogger() {
  // Envia erros de chunk que ocorreram antes do React carregar
  flushPendingErrors();
  // Erros JS não tratados
  window.addEventListener("error", (e) => {
    send({
      error_type: e.error?.name || "GlobalError",
      message: e.message,
      stack: e.error?.stack?.slice(0, 2000),
      file: e.filename,
      line: e.lineno,
      col: e.colno,
      extra: { type: "unhandled_error" },
    });
  });

  // Promises não tratadas
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    const isError = reason instanceof Error;
    send({
      error_type: isError ? reason.name : "UnhandledRejection",
      message: isError ? reason.message : String(reason),
      stack: isError ? reason.stack?.slice(0, 2000) : undefined,
      extra: { type: "unhandled_rejection" },
    });
  });
}
