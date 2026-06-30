import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://meupedemeia.vercel.app";
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategorySummary {
  name: string;
  total: number;
  percentage: number;
  color: string;
}

interface UserReport {
  userId: string;
  email: string;
  fullName: string;
  currency: string;
  monthName: string;
  year: number;
  income: number;
  expense: number;
  balance: number;
  prevIncome: number;
  prevExpense: number;
  topCategories: CategorySummary[];
  totalPatrimony: number;
  goalsCount: number;
  transactionsCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const CATEGORY_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#64748b",
];

function fmt(value: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function delta(current: number, prev: number): string {
  if (prev === 0) return "";
  const pct = ((current - prev) / Math.abs(prev)) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function deltaColor(current: number, prev: number, invertGood = false): string {
  if (prev === 0) return "#64748b";
  const up = current >= prev;
  const good = invertGood ? !up : up;
  return good ? "#10b981" : "#ef4444";
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchReportData(
  userId: string,
  year: number,
  month: number
): Promise<UserReport | null> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevStart = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
  const prevEnd = new Date(prevYear, prevMonth, 0).toISOString().split("T")[0];

  // Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, base_currency")
    .eq("id", userId)
    .single();

  if (!profile?.email) return null;

  const currency = profile.base_currency ?? "BRL";

  // Current month transactions
  const { data: txCurrent } = await supabase
    .from("transactions")
    .select("amount, type, category_id, currency")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .is("deleted_at", null)
    .in("type", ["INCOME", "EXPENSE"]);

  // Prev month transactions
  const { data: txPrev } = await supabase
    .from("transactions")
    .select("amount, type, currency")
    .eq("user_id", userId)
    .gte("date", prevStart)
    .lte("date", prevEnd)
    .is("deleted_at", null)
    .in("type", ["INCOME", "EXPENSE"]);

  const income = (txCurrent ?? [])
    .filter((t: any) => t.type === "INCOME" && (t.currency ?? "BRL") === currency)
    .reduce((s: number, t: any) => s + Number(t.amount), 0);

  const expense = (txCurrent ?? [])
    .filter((t: any) => t.type === "EXPENSE" && (t.currency ?? "BRL") === currency)
    .reduce((s: number, t: any) => s + Number(t.amount), 0);

  const prevIncome = (txPrev ?? [])
    .filter((t: any) => t.type === "INCOME" && (t.currency ?? "BRL") === currency)
    .reduce((s: number, t: any) => s + Number(t.amount), 0);

  const prevExpense = (txPrev ?? [])
    .filter((t: any) => t.type === "EXPENSE" && (t.currency ?? "BRL") === currency)
    .reduce((s: number, t: any) => s + Number(t.amount), 0);

  // Category breakdown
  const categoryIds = [
    ...new Set(
      (txCurrent ?? [])
        .filter((t: any) => t.type === "EXPENSE" && t.category_id)
        .map((t: any) => t.category_id)
    ),
  ];

  const { data: categories } = categoryIds.length
    ? await supabase.from("categories").select("id, name").in("id", categoryIds)
    : { data: [] };

  const categoryMap = new Map((categories ?? []).map((c: any) => [c.id, c.name]));

  const byCategory = new Map<string, number>();
  (txCurrent ?? [])
    .filter((t: any) => t.type === "EXPENSE" && t.category_id && (t.currency ?? "BRL") === currency)
    .forEach((t: any) => {
      const name = categoryMap.get(t.category_id) ?? "Outros";
      byCategory.set(name, (byCategory.get(name) ?? 0) + Number(t.amount));
    });

  const topCategories: CategorySummary[] = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, total], i) => ({
      name,
      total,
      percentage: expense > 0 ? Math.round((total / expense) * 100) : 0,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));

  // Patrimony
  const { data: accounts } = await supabase
    .from("accounts")
    .select("balance, currency")
    .eq("user_id", userId)
    .is("deleted_at", null);

  const totalPatrimony = (accounts ?? [])
    .filter((a: any) => (a.currency ?? "BRL") === currency)
    .reduce((s: number, a: any) => s + Number(a.balance ?? 0), 0);

  // Goals
  const { count: goalsCount } = await supabase
    .from("goals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("deleted_at", null);

  return {
    userId,
    email: profile.email,
    fullName: profile.full_name ?? "Usuário",
    currency,
    monthName: MONTHS_PT[month - 1],
    year,
    income,
    expense,
    balance: income - expense,
    prevIncome,
    prevExpense,
    topCategories,
    totalPatrimony,
    goalsCount: goalsCount ?? 0,
    transactionsCount: (txCurrent ?? []).length,
  };
}

// ─── Email HTML ───────────────────────────────────────────────────────────────

function buildEmailHtml(r: UserReport): string {
  const balancePositive = r.balance >= 0;

  const categoryRows = r.topCategories
    .map(
      (c) => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #1e293b;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${c.color}; flex-shrink:0;"></span>
          <span style="color:#cbd5e1; font-size:14px;">${c.name}</span>
        </div>
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; text-align:right;">
        <span style="color:#f1f5f9; font-size:14px; font-weight:600;">${fmt(c.total, r.currency)}</span>
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; text-align:right; width:60px;">
        <span style="color:#64748b; font-size:12px;">${c.percentage}%</span>
      </td>
    </tr>
    <tr>
      <td colspan="3" style="padding: 0 0 6px 20px;">
        <div style="height:4px; border-radius:2px; background:#1e293b;">
          <div style="height:4px; border-radius:2px; background:${c.color}; width:${c.percentage}%;"></div>
        </div>
      </td>
    </tr>
  `
    )
    .join("");

  const incDelta = delta(r.income, r.prevIncome);
  const expDelta = delta(r.expense, r.prevExpense);
  const incColor = deltaColor(r.income, r.prevIncome);
  const expColor = deltaColor(r.expense, r.prevExpense, true);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Relatório ${r.monthName} ${r.year} — Pé de Meia</title>
</head>
<body style="margin:0; padding:0; background:#020817; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#020817; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom: 32px; text-align:center;">
              <div style="display:inline-block; background:#6366f1; border-radius:12px; padding: 10px 18px; margin-bottom:20px;">
                <span style="color:#fff; font-size:16px; font-weight:700; letter-spacing:-0.3px;">💰 Pé de Meia</span>
              </div>
              <h1 style="margin:0; color:#f1f5f9; font-size:24px; font-weight:700; letter-spacing:-0.5px;">
                Relatório de ${r.monthName}
              </h1>
              <p style="margin: 6px 0 0; color:#64748b; font-size:14px;">${r.year} · Olá, ${r.fullName.split(" ")[0]}!</p>
            </td>
          </tr>

          <!-- Balance hero -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border: 1px solid #1e293b; border-radius:16px; padding: 28px; margin-bottom:20px; text-align:center;">
              <p style="margin:0 0 8px; color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Saldo do mês</p>
              <p style="margin:0; color:${balancePositive ? "#10b981" : "#ef4444"}; font-size:36px; font-weight:800; letter-spacing:-1px;">
                ${balancePositive ? "+" : ""}${fmt(r.balance, r.currency)}
              </p>
              <p style="margin: 12px 0 0; color:#64748b; font-size:13px;">
                ${r.transactionsCount} transações registradas
              </p>
            </td>
          </tr>

          <tr><td style="height:16px;"></td></tr>

          <!-- Income / Expense -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Income -->
                  <td width="48%" style="background:#0f172a; border:1px solid #1e293b; border-radius:12px; padding:20px;">
                    <p style="margin:0 0 4px; color:#64748b; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Receitas</p>
                    <p style="margin:0; color:#10b981; font-size:22px; font-weight:700;">${fmt(r.income, r.currency)}</p>
                    ${incDelta ? `<p style="margin:6px 0 0; color:${incColor}; font-size:12px;">${incDelta} vs mês anterior</p>` : ""}
                  </td>
                  <td width="4%"></td>
                  <!-- Expense -->
                  <td width="48%" style="background:#0f172a; border:1px solid #1e293b; border-radius:12px; padding:20px;">
                    <p style="margin:0 0 4px; color:#64748b; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Despesas</p>
                    <p style="margin:0; color:#ef4444; font-size:22px; font-weight:700;">${fmt(r.expense, r.currency)}</p>
                    ${expDelta ? `<p style="margin:6px 0 0; color:${expColor}; font-size:12px;">${expDelta} vs mês anterior</p>` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td style="height:20px;"></td></tr>

          <!-- Top categories -->
          ${
            r.topCategories.length > 0
              ? `
          <tr>
            <td style="background:#0f172a; border:1px solid #1e293b; border-radius:12px; padding:24px;">
              <p style="margin:0 0 16px; color:#f1f5f9; font-size:15px; font-weight:600;">Top categorias de gasto</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${categoryRows}
              </table>
            </td>
          </tr>
          <tr><td style="height:20px;"></td></tr>
          `
              : ""
          }

          <!-- Patrimony & Goals -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48%" style="background:#0f172a; border:1px solid #1e293b; border-radius:12px; padding:20px; text-align:center;">
                    <p style="margin:0 0 6px; color:#64748b; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Patrimônio total</p>
                    <p style="margin:0; color:#6366f1; font-size:20px; font-weight:700;">${fmt(r.totalPatrimony, r.currency)}</p>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="background:#0f172a; border:1px solid #1e293b; border-radius:12px; padding:20px; text-align:center;">
                    <p style="margin:0 0 6px; color:#64748b; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Metas ativas</p>
                    <p style="margin:0; color:#f59e0b; font-size:20px; font-weight:700;">${r.goalsCount}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td style="height:32px;"></td></tr>

          <!-- CTA -->
          <tr>
            <td style="text-align:center;">
              <a href="${APP_URL}/relatorios"
                style="display:inline-block; background:#6366f1; color:#fff; text-decoration:none; font-size:15px; font-weight:600; padding: 14px 32px; border-radius:10px; letter-spacing:-0.2px;">
                Ver relatório completo →
              </a>
            </td>
          </tr>

          <tr><td style="height:40px;"></td></tr>

          <!-- Footer -->
          <tr>
            <td style="text-align:center; border-top:1px solid #1e293b; padding-top:24px;">
              <p style="margin:0; color:#334155; font-size:12px;">
                Você está recebendo este email porque tem o relatório mensal ativado no Pé de Meia.
              </p>
              <p style="margin:8px 0 0; color:#334155; font-size:12px;">
                <a href="${APP_URL}/configuracoes" style="color:#6366f1; text-decoration:none;">Gerenciar preferências</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Send via Resend ──────────────────────────────────────────────────────────

async function sendEmail(report: UserReport): Promise<void> {
  const html = buildEmailHtml(report);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Pé de Meia <relatorio@meupedemeia.vercel.app>",
      to: [report.email],
      subject: `📊 Seu resumo de ${report.monthName} ${report.year} — Pé de Meia`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // [SEC] Verify CRON_SECRET to prevent unauthorized invocation
  if (CRON_SECRET) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  try {
    const now = new Date();
    // Report is about the previous month
    const reportMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const reportYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    // Allow manual override via body: { month, year, user_id }
    let targetMonth = reportMonth;
    let targetYear = reportYear;
    let targetUserId: string | null = null;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.month) targetMonth = Number(body.month);
        if (body.year) targetYear = Number(body.year);
        if (body.user_id) targetUserId = body.user_id;
      } catch {
        // no body — use defaults
      }
    }

    // Fetch all active users (or single user if specified)
    const profileQuery = supabase
      .from("profiles")
      .select("id")
      .not("email", "is", null)
      .eq("monthly_report_enabled", true);

    if (targetUserId) profileQuery.eq("id", targetUserId);

    const { data: users, error: usersError } = await profileQuery;

    if (usersError) throw usersError;

    const results: { email: string; status: string }[] = [];

    for (const user of users ?? []) {
      try {
        const report = await fetchReportData(user.id, targetYear, targetMonth);
        if (!report) {
          results.push({ email: user.id, status: "skipped (no profile)" });
          continue;
        }
        // Skip users with no transactions that month
        if (report.transactionsCount === 0 && report.income === 0) {
          results.push({ email: report.email, status: "skipped (no activity)" });
          continue;
        }
        await sendEmail(report);
        results.push({ email: report.email, status: "sent" });
      } catch (e: any) {
        results.push({ email: user.id, status: `error: ${e.message}` });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, month: targetMonth, year: targetYear, results }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
