import { supabase } from '@/integrations/supabase/client';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'unknown';

interface ErrorPayload {
  error_type: string;
  message: string;
  stack?: string;
  url?: string;
  file?: string;
  line?: number;
  col?: number;
  extra?: Record<string, unknown>;
}

async function send(payload: ErrorPayload) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('error_logs').insert({
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
    error_type: err.name || 'Error',
    message: err.message,
    stack: err.stack?.slice(0, 2000),
    extra,
  });
}

async function flushPendingErrors() {
  try {
    const raw = localStorage.getItem('pending_error_log');
    if (!raw) return;
    const pending = JSON.parse(raw);
    if (!pending?.length) return;
    localStorage.removeItem('pending_error_log');
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('error_logs').insert(
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
  window.addEventListener('error', (e) => {
    send({
      error_type: e.error?.name || 'GlobalError',
      message: e.message,
      stack: e.error?.stack?.slice(0, 2000),
      file: e.filename,
      line: e.lineno,
      col: e.colno,
      extra: { type: 'unhandled_error' },
    });
  });

  // Promises não tratadas
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    const isError = reason instanceof Error;
    send({
      error_type: isError ? reason.name : 'UnhandledRejection',
      message: isError ? reason.message : String(reason),
      stack: isError ? reason.stack?.slice(0, 2000) : undefined,
      extra: { type: 'unhandled_rejection' },
    });
  });
}
