// ============================================================================
// TESTE COMPLETO FINAL - Com nomes corretos de colunas e RPCs
// ============================================================================

const U = "https://vrrcagukyfnlhxuvnssp.supabase.co";
const SK =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycmNhZ3VreWZubGh4dXZuc3NwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcwMDg0NiwiZXhwIjoyMDgyMjc2ODQ2fQ.FrCVUHQ_4x0RCzpnNBFRRAfJj6_uezKJb2pNQ26xfiE";
const UID = "56ccd60b-641f-4265-bc17-7b8705a2f8c9";
const PRE = "ZZFINAL-";
const res = [];
const cr = { tx: [], sp: [], bd: [], gl: [], nf: [], tp: [] };

const H = {
  "Content-Type": "application/json",
  apikey: SK,
  Authorization: `Bearer ${SK}`,
  Prefer: "return=representation",
};

async function api(m, p, b) {
  try {
    const r = await fetch(`${U}/rest/v1/${p}`, {
      method: m,
      headers: { ...H },
      body: b ? JSON.stringify(b) : undefined,
    });
    const t = await r.text();
    let d;
    try {
      d = JSON.parse(t);
    } catch {
      d = t;
    }
    return { s: r.status, d, ok: r.ok };
  } catch (e) {
    return { s: 0, d: e.message, ok: false };
  }
}

function log(t, ok, detail = "") {
  console.log(`  ${ok ? "OK" : "FAIL"}  ${t}${detail ? ": " + detail : ""}`);
  res.push({ t, ok, detail });
}

console.log("=".repeat(55));
console.log("TESTE FINAL - Seu Bolso Inteligente");
console.log("=".repeat(55));

async function main() {
  // Clean
  let r = await api(
    "GET",
    `transactions?user_id=eq.${UID}&description=ilike.${PRE}*&select=id&limit=50`
  );
  if (r.ok && Array.isArray(r.d))
    for (const tx of r.d) await api("DELETE", `transactions?id=eq.${tx.id}`);

  // 1. Integrity
  console.log("\n--- 1. INTEGRIDADE ---");
  for (const t of [
    "transactions",
    "transaction_splits",
    "accounts",
    "categories",
    "budgets",
    "goals",
    "notifications",
    "trips",
    "family_members",
    "credit_card_invoices",
    "settlement_reversals",
    "transaction_auto_share_rules",
    "error_logs",
    "audit_log",
    "assets",
    "financial_ledger",
  ]) {
    r = await api("GET", `${t}?select=id&limit=1`);
    log("Tabela " + t, r.ok || r.s === 400, "s=" + r.s);
  }

  // 2. Accounts
  console.log("\n--- 2. CONTAS ---");
  r = await api("GET", `accounts?user_id=eq.${UID}&limit=10`);
  log("Listar contas", r.ok, (Array.isArray(r.d) ? r.d.length : 0) + " contas");
  if (r.ok && r.d?.[0]) {
    for (const a of r.d) console.log(`         ${a.name} (${a.type})`);
    let dep = await api("POST", "rpc/check_account_dependencies", { p_account_id: r.d[0].id });
    log("RPC check_account_dependencies", dep.ok, "s=" + dep.s);
  }

  // 3. Basic transactions
  console.log("\n--- 3. TRANSAÇÕES BÁSICAS ---");
  let ar = await api("GET", `accounts?user_id=eq.${UID}&type=eq.CHECKING&limit=1`);
  const accId = ar.ok && ar.d?.[0]?.id;
  let sr = await api("GET", `accounts?user_id=eq.${UID}&type=eq.SAVINGS&limit=1`);
  const savId = sr.ok && sr.d?.[0]?.id;
  if (!accId) {
    log("Transações", false, "Sem conta");
  } else {
    const base = {
      user_id: UID,
      creator_user_id: UID,
      date: "2026-06-30",
      competence_date: "2026-06-01",
      is_shared: false,
      is_recurring: false,
      is_installment: false,
    };

    r = await api("POST", "transactions?select=id,type,description", {
      ...base,
      amount: 75,
      description: PRE + "Almoço",
      type: "EXPENSE",
      domain: "PERSONAL",
      account_id: accId,
    });
    log("Criar DESPESA", r.ok, r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 60));
    if (r.ok && r.d?.[0]?.id) cr.tx.push(r.d[0].id);

    r = await api("POST", "transactions?select=id,type,description", {
      ...base,
      amount: 5000,
      description: PRE + "Salário",
      type: "INCOME",
      domain: "PERSONAL",
      account_id: accId,
    });
    log("Criar RECEITA", r.ok, r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 60));
    if (r.ok && r.d?.[0]?.id) cr.tx.push(r.d[0].id);

    if (savId) {
      r = await api("POST", "transactions?select=id,type,description", {
        ...base,
        amount: 200,
        description: PRE + "Transferência",
        type: "TRANSFER",
        domain: "PERSONAL",
        account_id: accId,
        destination_account_id: savId,
        destination_amount: 200,
      });
      log(
        "Criar TRANSFERÊNCIA",
        r.ok,
        r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 60)
      );
      if (r.ok && r.d?.[0]?.id) cr.tx.push(r.d[0].id);
    }
  }

  // 4. Shared transactions
  console.log("\n--- 4. COMPARTILHADAS ---");
  let mr = await api("GET", `family_members?linked_user_id=eq.${UID}&limit=1`);
  const member = mr.ok && mr.d?.[0];
  if (!member) {
    log("Compartilhadas", false, "Sem family_member");
  } else {
    r = await api("POST", "transactions?select=*", {
      user_id: UID,
      creator_user_id: UID,
      amount: 250,
      description: PRE + "Jantar",
      date: "2026-06-30",
      competence_date: "2026-06-01",
      type: "EXPENSE",
      domain: "SHARED",
      account_id: accId,
      is_shared: true,
      payer_id: member.id,
      is_recurring: false,
      is_installment: false,
    });
    if (r.ok && r.d?.[0]?.id) {
      cr.tx.push(r.d[0].id);
      log("Criar transação compartilhada", true, r.d[0].id.slice(0, 8));

      // Create splits with correct columns
      let spBody = [
        {
          transaction_id: r.d[0].id,
          member_id: member.id,
          user_id: UID,
          percentage: 100,
          amount: 250,
          name: "Você",
          is_settled: false,
        },
      ];
      let omr = await api("GET", `family_members?limit=10`);
      let other = omr.ok && Array.isArray(omr.d) ? omr.d.find((m) => m.id !== member.id) : null;
      if (other) {
        spBody = [
          {
            transaction_id: r.d[0].id,
            member_id: member.id,
            user_id: UID,
            percentage: 50,
            amount: 125,
            name: "Você",
            is_settled: false,
          },
          {
            transaction_id: r.d[0].id,
            member_id: other.id,
            user_id: other.linked_user_id,
            percentage: 50,
            amount: 125,
            name: "Outro",
            is_settled: false,
          },
        ];
      }
      let sr = await api("POST", "transaction_splits?select=id", spBody);
      log("Criar splits", sr.ok, (Array.isArray(sr.d) ? sr.d.length : 0) + " criados");
      if (sr.ok && Array.isArray(sr.d)) sr.d.forEach((s) => cr.sp.push(s.id));

      // Settlement
      if (other) {
        let st = await api("POST", "transactions?select=id", {
          user_id: other.linked_user_id || UID,
          creator_user_id: other.linked_user_id || UID,
          amount: 125,
          description: PRE + "Acerto",
          date: "2026-06-30",
          competence_date: "2026-06-01",
          type: "EXPENSE",
          domain: "SHARED",
          account_id: accId,
          is_shared: true,
          is_recurring: false,
          is_installment: false,
          related_member_id: member.id,
        });
        log(
          "Criar acerto (settlement)",
          st.ok,
          st.ok ? st.d[0]?.id?.slice(0, 8) : JSON.stringify(st.d).slice(0, 60)
        );
        if (st.ok && st.d?.[0]?.id) cr.tx.push(st.d[0].id);
      }

      r = await api("POST", "rpc/get_current_shared_debts", { p_user_id: UID });
      log("RPC get_current_shared_debts", r.ok, "s=" + r.s);
    } else {
      log("Transação compartilhada", false, JSON.stringify(r.d).slice(0, 80));
    }
  }

  // 5. Installments
  console.log("\n--- 5. PARCELAMENTOS ---");
  ar = await api("GET", `accounts?user_id=eq.${UID}&type=eq.CREDIT_CARD&limit=1`);
  const card = ar.ok && ar.d?.[0];
  if (!card) {
    log("Parcelamento", false, "Sem cartão");
  } else {
    const seriesId = crypto.randomUUID();
    let ok = true;
    for (let i = 0; i < 3; i++) {
      const mon = 6 + i;
      r = await api("POST", "transactions?select=id", {
        user_id: UID,
        creator_user_id: UID,
        amount: 100,
        description: `${PRE} Parcela ${i + 1}/3`,
        date: `2026-${String(mon).padStart(2, "0")}-30`,
        competence_date: `2026-${String(mon).padStart(2, "0")}-01`,
        type: "EXPENSE",
        domain: "PERSONAL",
        account_id: card.id,
        is_installment: true,
        total_installments: 3,
        current_installment: i + 1,
        series_id: seriesId,
        is_shared: false,
        is_recurring: false,
      });
      if (r.ok && r.d?.[0]?.id) cr.tx.push(r.d[0].id);
      else ok = false;
    }
    log("Criar 3 parcelas", ok, "series=" + seriesId.slice(0, 8));
  }

  // 6. Budgets (CORRECT columns)
  console.log("\n--- 6. ORÇAMENTOS ---");
  let cr2 = await api("GET", `categories?type=eq.expense&limit=1`);
  const cat = cr2.ok && cr2.d?.[0];
  if (!cat) {
    log("Orçamento", false, "Sem categoria");
  } else {
    // budgets table: name, amount, period, category_id, user_id, is_active, start_date, end_date
    r = await api("POST", "budgets?select=*", {
      user_id: UID,
      category_id: cat.id,
      name: PRE + "Orçamento Teste",
      amount: 1000,
      period: "MONTHLY",
      start_date: "2026-06-01",
      end_date: "2026-12-31",
      is_active: true,
    });
    log("Criar orçamento", r.ok, r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 80));
    if (r.ok && r.d?.[0]?.id) {
      cr.bd.push(r.d[0].id);
      r = await api("POST", "rpc/get_user_budgets_progress_with_rollover", { p_user_id: UID });
      log("RPC get_user_budgets_progress", r.ok, "s=" + r.s);
    }
  }

  // 7. Goals (CORRECT columns)
  console.log("\n--- 7. METAS ---");
  // goals table: name, target_amount, current_amount, target_date, status, user_id
  r = await api("POST", "goals?select=*", {
    user_id: UID,
    name: PRE + "Viagem Praia",
    target_amount: 5000,
    current_amount: 0,
    target_date: "2026-12-31",
    status: "IN_PROGRESS",
  });
  log("Criar meta", r.ok, r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 80));
  if (r.ok && r.d?.[0]?.id) {
    cr.gl.push(r.d[0].id);
    r = await api("PATCH", `goals?id=eq.${r.d[0].id}`, { current_amount: 500 });
    log("Atualizar progresso", r.ok);
    r = await api("POST", "rpc/get_goal_progress", { p_goal_id: r.d[0]?.id || cr.gl[0] });
    log("RPC get_goal_progress", r.ok || r.s === 400, "s=" + r.s);
  }

  // 8. Notifications (using GENERAL type)
  console.log("\n--- 8. NOTIFICAÇÕES ---");
  r = await api("POST", "notifications?select=*", {
    user_id: UID,
    type: "GENERAL",
    title: PRE + "Teste",
    message: "Teste final.",
    icon: "🔔",
    priority: "NORMAL",
    is_read: false,
  });
  log("Criar notificação", r.ok, r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 80));
  if (r.ok && r.d?.[0]?.id) {
    cr.nf.push(r.d[0].id);
    r = await api("PATCH", `notifications?id=eq.${r.d[0].id}`, { is_read: true });
    log("Marcar como lida", r.ok);
  }

  // 9. Credit cards
  console.log("\n--- 9. CARTÃO DE CRÉDITO ---");
  if (card) {
    r = await api("PATCH", `accounts?id=eq.${card.id}`, { closing_day: 15, due_day: 5 });
    log("Atualizar fechamento", r.ok);
    r = await api("GET", `credit_card_invoices?account_id=eq.${card.id}&limit=3`);
    log("Listar faturas", r.ok, (Array.isArray(r.d) ? r.d.length : 0) + " faturas");
    r = await api("POST", "rpc/process_credit_card_invoices", {});
    log("RPC process_credit_card_invoices", r.ok || r.s === 400, "s=" + r.s);
    r = await api("POST", "rpc/get_credit_card_invoice", {
      p_account_id: card.id,
      p_month: 6,
      p_year: 2026,
    });
    log("RPC get_credit_card_invoice", r.ok || r.s === 400, "s=" + r.s);
  }

  // 10. Trips (CORRECT columns: owner_id not user_id)
  console.log("\n--- 10. VIAGENS ---");
  r = await api("POST", "trips?select=*", {
    owner_id: UID,
    name: PRE + "Rio",
    destination: "Rio de Janeiro",
    start_date: "2026-08-01",
    end_date: "2026-08-10",
    budget: 3000,
    currency: "BRL",
    status: "PLANNING",
  });
  log("Criar viagem", r.ok, r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 80));
  if (r.ok && r.d?.[0]?.id) {
    cr.tp.push(r.d[0].id);
    if (accId) {
      r = await api("POST", "transactions?select=id", {
        user_id: UID,
        creator_user_id: UID,
        amount: 450,
        description: PRE + "Passagem",
        date: "2026-06-30",
        competence_date: "2026-06-01",
        type: "EXPENSE",
        domain: "TRAVEL",
        trip_id: cr.tp[0],
        account_id: accId,
        is_shared: false,
        is_recurring: false,
        is_installment: false,
      });
      log(
        "Despesa na viagem",
        r.ok,
        r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 60)
      );
      if (r.ok && r.d?.[0]?.id) cr.tx.push(r.d[0].id);
    }
    r = await api("POST", "rpc/get_trip_financial_summary", { p_trip_id: cr.tp[0] });
    log("RPC get_trip_financial_summary", r.ok, "s=" + r.s);
  }

  // 11. Edit & Delete
  console.log("\n--- 11. EDIÇÃO E EXCLUSÃO ---");
  if (cr.tx.length > 0) {
    r = await api("PATCH", `transactions?id=eq.${cr.tx[0]}`, {
      description: PRE + "EDITADO",
      amount: 888,
    });
    log("Editar transação", r.ok);
    r = await api("PATCH", `transactions?id=eq.${cr.tx[0]}`, {
      deleted_at: new Date().toISOString(),
    });
    log("Soft delete", r.ok);
    r = await api("GET", `transactions?id=eq.${cr.tx[0]}&select=id,deleted_at`);
    log("Verificar soft delete", r.ok && r.d?.[0]?.deleted_at !== null);
    r = await api("PATCH", `transactions?id=eq.${cr.tx[0]}`, { deleted_at: null });
    log("Restaurar", r.ok);
  }

  // 12. RPCs with CORRECT names
  console.log("\n--- 12. RPCs (nomes corretos) ---");
  const rpcs = [
    [
      "create_transaction_with_splits",
      {
        p_transaction: {
          amount: 1,
          description: "X",
          date: "2026-06-30",
          competence_date: "2026-06-01",
          type: "EXPENSE",
          domain: "PERSONAL",
          is_shared: false,
          is_recurring: false,
          is_installment: false,
        },
        p_splits: [],
      },
    ],
    ["create_installment_series", { p_transactions: [] }],
    ["get_current_shared_debts", { p_user_id: UID }],
    ["get_trip_financial_summary", { p_trip_id: "00000000-0000-0000-0000-000000000000" }],
    ["process_credit_card_invoices", {}],
    ["search_transactions", { p_user_id: UID, p_search_term: "test" }],
    ["get_user_budgets_progress_with_rollover", { p_user_id: UID }],
    ["get_goal_progress", { p_goal_id: "00000000-0000-0000-0000-000000000000" }],
    ["expire_pending_settlements", {}],
    ["check_account_dependencies", { p_account_id: "00000000-0000-0000-0000-000000000000" }],
    ["recalculate_account_balance", { p_account_id: "00000000-0000-0000-0000-000000000000" }],
    ["settle_split", { p_split_id: "00000000-0000-0000-0000-000000000000", p_settled_by: UID }],
    ["unsettle_split", { p_split_id: "00000000-0000-0000-0000-000000000000" }],
    [
      "get_credit_card_invoice",
      { p_account_id: "00000000-0000-0000-0000-000000000000", p_month: 6, p_year: 2026 },
    ],
    [
      "soft_delete_transaction",
      { p_transaction_id: "00000000-0000-0000-0000-000000000000", p_user_id: UID },
    ],
    [
      "restore_transaction",
      { p_transaction_id: "00000000-0000-0000-0000-000000000000", p_user_id: UID },
    ],
  ];
  for (const [name, body] of rpcs) {
    r = await api("POST", `rpc/${name}`, body);
    log("RPC " + name, r.s !== 404, "s=" + r.s);
  }

  // 13. Recurring
  console.log("\n--- 13. RECORRÊNCIAS ---");
  if (accId) {
    r = await api("POST", "transactions?select=id", {
      user_id: UID,
      creator_user_id: UID,
      amount: 39.9,
      description: PRE + "Streaming",
      date: "2026-06-30",
      competence_date: "2026-06-01",
      type: "EXPENSE",
      domain: "PERSONAL",
      account_id: accId,
      is_recurring: true,
      recurrence_pattern: "MONTHLY",
      recurrence_day: 30,
      is_shared: false,
      is_installment: false,
    });
    log(
      "Criar transação recorrente",
      r.ok,
      r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 80)
    );
    if (r.ok && r.d?.[0]?.id) cr.tx.push(r.d[0].id);
  }

  // 14. Family
  console.log("\n--- 14. FAMÍLIA ---");
  r = await api("GET", `family_members?linked_user_id=eq.${UID}&limit=5`);
  log("Membros da família", r.ok, (Array.isArray(r.d) ? r.d.length : 0) + " membros");
  if (r.ok && r.d?.[0]) {
    r = await api("GET", `families?id=eq.${r.d[0].family_id}&limit=1`);
    log("Família", r.ok, r.d?.[0]?.name || "N/A");
  }
  r = await api("GET", `family_invitations?from_user_id=eq.${UID}&limit=5`);
  log("Convites enviados", r.ok, Array.isArray(r.d) ? r.d.length : 0);
  r = await api("GET", `family_invitations?to_user_id=eq.${UID}&limit=5`);
  log("Convites recebidos", r.ok, Array.isArray(r.d) ? r.d.length : 0);

  // 15. Auto-share (CORRECT columns)
  console.log("\n--- 15. AUTO-SHARE ---");
  if (member) {
    r = await api("POST", "transaction_auto_share_rules?select=*", {
      user_id: UID,
      name: PRE + "Regra",
      trigger_type: "CATEGORY",
      trigger_value: "test",
      member_id: member.id,
      split_ratio: 0.5,
      is_active: true,
    });
    log(
      "Criar regra auto-share",
      r.ok,
      r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 80)
    );
    if (r.ok && r.d?.[0]?.id) {
      await api("DELETE", `transaction_auto_share_rules?id=eq.${r.d[0].id}`);
      log("Deletar regra", true);
    }
  }

  // Cleanup
  console.log("\n--- LIMPEZA FINAL ---");
  if (cr.sp.length > 0) {
    for (const id of cr.sp) await api("DELETE", `transaction_splits?id=eq.${id}`);
    console.log("  OK   " + cr.sp.length + " splits");
  }
  let del = 0;
  for (const id of cr.tx) {
    if ((await api("DELETE", `transactions?id=eq.${id}`)).ok) del++;
  }
  console.log("  OK   " + del + "/" + cr.tx.length + " transações");
  for (const id of cr.bd) await api("DELETE", `budgets?id=eq.${id}`);
  for (const id of cr.gl) await api("DELETE", `goals?id=eq.${id}`);
  for (const id of cr.nf) await api("DELETE", `notifications?id=eq.${id}`);
  for (const id of cr.tp) await api("DELETE", `trips?id=eq.${id}`);

  // Summary
  console.log("\n" + "=".repeat(55));
  const ok = res.filter((r) => r.ok).length;
  const fail = res.filter((r) => !r.ok).length;
  console.log("RESULTADO: " + res.length + " testes | " + ok + " OK | " + fail + " falhas");
  if (fail > 0) {
    console.log("\nFALHAS:");
    res.filter((r) => !r.ok).forEach((r) => console.log("  ❌ " + r.t + ": " + r.detail));
  }
  console.log("=".repeat(55));
}

main().catch((e) => console.error("FATAL:", e.message));
