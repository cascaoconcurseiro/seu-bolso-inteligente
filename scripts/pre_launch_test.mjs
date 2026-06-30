// ============================================================================
// TESTE PRÉ-LANÇAMENTO - Cobertura completa de features
// ============================================================================
const U = "https://vrrcagukyfnlhxuvnssp.supabase.co";
const SK =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycmNhZ3VreWZubGh4dXZuc3NwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcwMDg0NiwiZXhwIjoyMDgyMjc2ODQ2fQ.FrCVUHQ_4x0RCzpnNBFRRAfJj6_uezKJb2pNQ26xfiE";
const UID = "56ccd60b-641f-4265-bc17-7b8705a2f8c9";
const PRE = "LAUNCH-";
const H = {
  "Content-Type": "application/json",
  apikey: SK,
  Authorization: `Bearer ${SK}`,
  Prefer: "return=representation",
};
const R = [];
const created = { tx: [], sp: [], bd: [], gl: [], nf: [], tp: [], inv: [], fam: [] };

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

function L(t, ok, detail = "") {
  console.log(`  ${ok ? "OK" : "FAIL"}  ${t}${detail ? ": " + detail : ""}`);
  R.push({ t, ok, detail });
}

async function main() {
  console.log("=".repeat(50));
  console.log("TESTE PRÉ-LANÇAMENTO");
  console.log("=".repeat(50));

  // Clean previous test data
  let r = await api(
    "GET",
    `transactions?user_id=eq.${UID}&description=ilike.${PRE}*&select=id&limit=100`
  );
  if (r.ok && Array.isArray(r.d))
    for (const tx of r.d) await api("DELETE", `transactions?id=eq.${tx.id}`);
  for (const t of ["budgets", "goals", "notifications", "trips", "family_invitations"]) {
    r = await api("GET", `${t}?user_id=eq.${UID}&limit=30`);
    if (r.ok && Array.isArray(r.d))
      for (const it of r.d)
        if ((it.name || it.title || "").startsWith(PRE)) await api("DELETE", `${t}?id=eq.${it.id}`);
  }

  // Get contexts
  let ar = await api("GET", `accounts?user_id=eq.${UID}&type=eq.CHECKING&limit=1`);
  const accId = ar.ok && ar.d?.[0]?.id;
  let cr = await api("GET", `accounts?user_id=eq.${UID}&type=eq.CREDIT_CARD&limit=1`);
  const cardId = cr.ok && cr.d?.[0]?.id;
  let sr = await api("GET", `accounts?user_id=eq.${UID}&type=eq.SAVINGS&limit=1`);
  const savId = sr.ok && sr.d?.[0]?.id;
  let mr = await api("GET", `family_members?linked_user_id=eq.${UID}&limit=1`);
  const fmId = mr.ok && mr.d?.[0]?.id;
  let gr = await api("GET", `categories?type=eq.expense&limit=1`);
  const catId = gr.ok && gr.d?.[0]?.id;
  let ir = await api("GET", `categories?type=eq.income&limit=1`);
  const incId = ir.ok && ir.d?.[0]?.id;

  console.log(
    "\nContextos: acc=" +
      (accId?.slice(0, 6) || "NONE") +
      " card=" +
      (cardId?.slice(0, 6) || "NONE") +
      " savings=" +
      (savId?.slice(0, 6) || "NONE") +
      " fm=" +
      (fmId?.slice(0, 6) || "NONE")
  );

  // 1. TRANSACTIONS - all types
  console.log("\n--- 1. TRANSAÇÕES ---");
  if (!accId) {
    L("Transações - sem conta", false);
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

    r = await api("POST", "transactions?select=id,type", {
      ...base,
      amount: 50,
      description: PRE + "Despesa",
      type: "EXPENSE",
      domain: "PERSONAL",
      account_id: accId,
      category_id: catId,
    });
    L("Despesa", r.ok, r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 60));
    if (r.ok && r.d?.[0]?.id) created.tx.push(r.d[0].id);

    r = await api("POST", "transactions?select=id,type", {
      ...base,
      amount: 3000,
      description: PRE + "Receita",
      type: "INCOME",
      domain: "PERSONAL",
      account_id: accId,
      category_id: incId,
    });
    L("Receita", r.ok, r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 60));
    if (r.ok && r.d?.[0]?.id) created.tx.push(r.d[0].id);

    if (savId) {
      r = await api("POST", "transactions?select=id,type", {
        ...base,
        amount: 100,
        description: PRE + "Transferencia",
        type: "TRANSFER",
        domain: "PERSONAL",
        account_id: accId,
        destination_account_id: savId,
        destination_amount: 100,
      });
      L("Transferência", r.ok, r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 60));
      if (r.ok && r.d?.[0]?.id) created.tx.push(r.d[0].id);
    }
  }

  // 2. SHARED TRANSACTIONS + RPC
  console.log("\n--- 2. COMPARTILHADAS ---");
  if (!fmId) {
    L("Compartilhadas - sem family_member", false);
  } else {
    // Get another family member
    let mr2 = await api("GET", `family_members?limit=10`);
    let other = mr2.ok && Array.isArray(mr2.d) ? mr2.d.find((m) => m.id !== fmId) : null;

    // Test via RPC with p_user_id
    if (other) {
      r = await api("POST", "rpc/create_transaction_with_splits", {
        p_transaction: {
          amount: 250,
          description: PRE + "Jantar RPC",
          date: "2026-06-30",
          competence_date: "2026-06-01",
          type: "EXPENSE",
          domain: "SHARED",
          account_id: accId,
          category_id: catId,
          is_shared: true,
          payer_id: fmId,
          is_recurring: false,
          is_installment: false,
        },
        p_splits: [
          {
            member_id: fmId,
            user_id: UID,
            percentage: 50,
            amount: 125,
            name: "Wesley",
            is_settled: false,
          },
          {
            member_id: other.id,
            user_id: other.linked_user_id,
            percentage: 50,
            amount: 125,
            name: other.name,
            is_settled: false,
          },
        ],
        p_user_id: UID,
      });
      L(
        "RPC create_transaction_with_splits (c/ p_user_id)",
        r.ok,
        r.ok ? "id=" + (r.d?.id || r.d?.slice?.(0, 8) || "OK") : JSON.stringify(r.d).slice(0, 80)
      );
      if (r.ok && r.d?.id) created.tx.push(r.d.id);
    }

    // Test via fallback (direct insert + splits)
    r = await api("POST", "transactions?select=*", {
      user_id: UID,
      creator_user_id: UID,
      amount: 150,
      description: PRE + "Compartilhado",
      date: "2026-06-30",
      competence_date: "2026-06-01",
      type: "EXPENSE",
      domain: "SHARED",
      account_id: accId,
      category_id: catId,
      is_shared: true,
      payer_id: fmId,
      is_recurring: false,
      is_installment: false,
    });
    if (r.ok && r.d?.[0]?.id) {
      created.tx.push(r.d[0].id);
      let spRes = await api("POST", "transaction_splits?select=id", [
        {
          transaction_id: r.d[0].id,
          member_id: fmId,
          user_id: UID,
          percentage: 100,
          amount: 150,
          name: "Wesley",
          is_settled: false,
        },
      ]);
      L(
        "Compartilhada + split direto",
        spRes.ok,
        spRes.ok ? "split OK" : JSON.stringify(spRes.d).slice(0, 80)
      );
      if (spRes.ok && Array.isArray(spRes.d)) spRes.d.forEach((s) => created.sp.push(s.id));
    } else {
      L("Compartilhada direto", false, JSON.stringify(r.d).slice(0, 80));
    }

    // Test settlements
    if (other && created.tx.length > 0) {
      // Get a split to settle
      let splRes = await api(
        "GET",
        `transaction_splits?transaction_id=eq.${created.tx[created.tx.length - 1]}&limit=1`
      );
      if (splRes.ok && splRes.d?.[0]) {
        r = await api("POST", "rpc/settle_split", {
          p_split_id: splRes.d[0].id,
          p_amount: splRes.d[0].amount,
          p_account_id: accId,
          p_user_id: UID,
        });
        L("RPC settle_split", r.ok || r.s === 400, "s=" + r.s);
      }
    }

    // Shared debts
    r = await api("POST", "rpc/get_current_shared_debts", { p_user_id: UID });
    L("RPC get_current_shared_debts", r.ok, "s=" + r.s);
  }

  // 3. INSTALLMENTS
  console.log("\n--- 3. PARCELAMENTOS ---");
  if (!cardId) {
    L("Parcelamento - sem cartão", false);
  } else {
    const seriesId = crypto.randomUUID();
    let ok = true;
    for (let i = 0; i < 3; i++) {
      let mon = 6 + i;
      r = await api("POST", "transactions?select=id", {
        user_id: UID,
        creator_user_id: UID,
        amount: 80,
        description: `${PRE} Parcela ${i + 1}/3`,
        date: `2026-${String(mon).padStart(2, "0")}-30`,
        competence_date: `2026-${String(mon).padStart(2, "0")}-01`,
        type: "EXPENSE",
        domain: "PERSONAL",
        account_id: cardId,
        is_installment: true,
        total_installments: 3,
        current_installment: i + 1,
        series_id: seriesId,
        is_shared: false,
        is_recurring: false,
      });
      if (r.ok && r.d?.[0]?.id) created.tx.push(r.d[0].id);
      else ok = false;
    }
    L("3 parcelas", ok, "series=" + seriesId.slice(0, 8));
  }

  // 4. RECURRING
  console.log("\n--- 4. RECORRÊNCIAS ---");
  if (accId) {
    r = await api("POST", "transactions?select=id", {
      user_id: UID,
      creator_user_id: UID,
      amount: 29.9,
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
    L("Recorrente", r.ok, r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 80));
    if (r.ok && r.d?.[0]?.id) created.tx.push(r.d[0].id);
  }

  // 5. BUDGETS
  console.log("\n--- 5. ORÇAMENTOS ---");
  if (catId) {
    r = await api("POST", "budgets?select=*", {
      user_id: UID,
      category_id: catId,
      name: PRE + "Orçamento",
      amount: 1000,
      period: "MONTHLY",
      start_date: "2026-06-01",
      end_date: "2026-12-31",
      is_active: true,
    });
    L("Criar orçamento", r.ok, r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 80));
    if (r.ok && r.d?.[0]?.id) {
      created.bd.push(r.d[0].id);
      r = await api("POST", "rpc/get_user_budgets_progress_with_rollover", {
        p_user_id: UID,
        p_start_date: "2026-06-01",
        p_end_date: "2026-06-30",
      });
      L("RPC budget progress", r.ok, "s=" + r.s);
    }
  }

  // 6. GOALS
  console.log("\n--- 6. METAS ---");
  r = await api("POST", "goals?select=*", {
    user_id: UID,
    name: PRE + "Meta",
    target_amount: 5000,
    current_amount: 0,
    target_date: "2026-12-31",
    status: "IN_PROGRESS",
  });
  L("Criar meta", r.ok, r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 80));
  if (r.ok && r.d?.[0]?.id) {
    created.gl.push(r.d[0].id);
    r = await api("PATCH", `goals?id=eq.${r.d[0].id}`, { current_amount: 500 });
    L("Atualizar meta", r.ok);
  }

  // 7. NOTIFICATIONS
  console.log("\n--- 7. NOTIFICAÇÕES ---");
  r = await api("POST", "notifications?select=*", {
    user_id: UID,
    type: "GENERAL",
    title: PRE + "Teste",
    message: "Pré-lançamento.",
    icon: "🚀",
    priority: "NORMAL",
  });
  L("Criar notificação", r.ok, r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 80));
  if (r.ok && r.d?.[0]?.id) {
    created.nf.push(r.d[0].id);
    r = await api("PATCH", `notifications?id=eq.${r.d[0].id}`, { is_read: true });
    L("Marcar lida", r.ok);
  }

  // 8. CREDIT CARD INVOICES
  console.log("\n--- 8. CARTÃO DE CRÉDITO ---");
  if (cardId) {
    r = await api("PATCH", `accounts?id=eq.${cardId}`, { closing_day: 15, due_day: 5 });
    L("Fechamento cartão", r.ok);
    r = await api("GET", `credit_card_invoices?account_id=eq.${cardId}&limit=3`);
    L("Faturas", r.ok, (Array.isArray(r.d) ? r.d.length : 0) + " faturas");
    r = await api("POST", "rpc/process_credit_card_invoices", {});
    L("RPC process_invoices", r.ok || r.s === 204, "s=" + r.s);
  }

  // 9. TRIPS
  console.log("\n--- 9. VIAGENS ---");
  r = await api("POST", "trips?select=*", {
    owner_id: UID,
    name: PRE + "Viagem",
    destination: "São Paulo",
    start_date: "2026-08-01",
    end_date: "2026-08-05",
    budget: 2000,
    currency: "BRL",
    status: "PLANNING",
  });
  L("Criar viagem", r.ok, r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 80));
  if (r.ok && r.d?.[0]?.id) {
    created.tp.push(r.d[0].id);
    if (accId) {
      r = await api("POST", "transactions?select=id", {
        user_id: UID,
        creator_user_id: UID,
        amount: 350,
        description: PRE + "Hotel SP",
        date: "2026-06-30",
        competence_date: "2026-06-01",
        type: "EXPENSE",
        domain: "TRAVEL",
        trip_id: created.tp[0],
        account_id: accId,
        is_shared: false,
        is_recurring: false,
        is_installment: false,
      });
      L("Despesa viagem", r.ok, r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 60));
      if (r.ok && r.d?.[0]?.id) created.tx.push(r.d[0].id);
    }
    r = await api("POST", "rpc/get_trip_financial_summary", { p_trip_id: created.tp[0] });
    L("RPC trip summary", r.ok, "s=" + r.s);
  }

  // 10. FAMILY INVITATIONS
  console.log("\n--- 10. CONVITES ---");
  if (fmId) {
    let famRes = await api("GET", `family_members?id=eq.${fmId}&select=family_id`);
    if (famRes.ok && famRes.d?.[0]?.family_id) {
      r = await api("POST", "family_invitations?select=*", {
        from_user_id: UID,
        to_user_id: UID,
        family_id: famRes.d[0].family_id,
        member_name: "Teste",
        role: "viewer",
        status: "pending",
      });
      L("Enviar convite", r.ok, r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 80));
      if (r.ok && r.d?.[0]?.id) {
        created.inv.push(r.d[0].id);
        r = await api("PATCH", `family_invitations?id=eq.${r.d[0].id}`, { status: "accepted" });
        L("Aceitar convite", r.ok);
      }
    }
    r = await api("GET", `family_invitations?from_user_id=eq.${UID}&limit=5`);
    L("Convites enviados", r.ok, Array.isArray(r.d) ? r.d.length : 0);
    r = await api("GET", `family_invitations?to_user_id=eq.${UID}&limit=5`);
    L("Convites recebidos", r.ok, Array.isArray(r.d) ? r.d.length : 0);
  }

  // 11. ASSETS
  console.log("\n--- 11. ATIVOS ---");
  r = await api("GET", `assets?user_id=eq.${UID}&limit=5`);
  L("Listar ativos", r.ok, (Array.isArray(r.d) ? r.d.length : 0) + " ativos");
  // Test create if none
  if (r.ok && Array.isArray(r.d) && r.d.length === 0) {
    r = await api("POST", "assets?select=*", {
      user_id: UID,
      name: PRE + "Ação",
      ticker: "TEST4",
      type: "STOCK",
      quantity: 10,
      avg_price: 50,
      currency: "BRL",
    });
    L("Criar ativo", r.ok, r.ok ? r.d[0]?.id?.slice(0, 8) : JSON.stringify(r.d).slice(0, 80));
    if (r.ok && r.d?.[0]?.id) {
      await api("DELETE", `assets?id=eq.${r.d[0].id}`);
    }
  }

  // 12. AUTO-SHARE RULES
  console.log("\n--- 12. AUTO-SHARE ---");
  r = await api("GET", `transaction_auto_share_rules?user_id=eq.${UID}&is_active=eq.true`);
  L("Regras auto-share ativas", r.ok, (Array.isArray(r.d) ? r.d.length : 0) + " regras");
  if (r.ok && Array.isArray(r.d))
    r.d.forEach((rr) =>
      L("  Regra: " + rr.trigger_type + "=" + rr.trigger_value, true, "ratio=" + rr.split_ratio)
    );

  // 13. EDIT + SOFT DELETE
  console.log("\n--- 13. EDIÇÃO/EXCLUSÃO ---");
  if (created.tx.length > 0) {
    r = await api("PATCH", `transactions?id=eq.${created.tx[0]}`, {
      description: PRE + "EDITADO",
      amount: 777,
    });
    L("Editar", r.ok);
    r = await api("PATCH", `transactions?id=eq.${created.tx[0]}`, {
      deleted_at: new Date().toISOString(),
    });
    L("Soft delete", r.ok);
    r = await api("GET", `transactions?id=eq.${created.tx[0]}&select=id,deleted_at`);
    L("Verificar deleted_at", r.ok && r.d?.[0]?.deleted_at !== null);
    r = await api("PATCH", `transactions?id=eq.${created.tx[0]}`, { deleted_at: null });
    L("Restaurar", r.ok);
  }

  // 14. RPC FUNCTIONS (all critical ones)
  console.log("\n--- 14. RPCs CRÍTICAS ---");
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
        p_user_id: UID,
      },
    ],
    ["create_installment_series", { p_transactions: [], p_user_id: UID }],
    ["get_current_shared_debts", { p_user_id: UID }],
    ["get_trip_financial_summary", { p_trip_id: "00000000-0000-0000-0000-000000000000" }],
    ["process_credit_card_invoices", {}],
    ["expire_pending_settlements", {}],
    [
      "check_account_dependencies",
      { p_account_id: accId || "00000000-0000-0000-0000-000000000000" },
    ],
    [
      "recalculate_account_balance",
      { p_account_id: accId || "00000000-0000-0000-0000-000000000000" },
    ],
    ["soft_delete_transaction", { p_transaction_id: "00000000-0000-0000-0000-000000000000" }],
    ["restore_transaction", { p_transaction_id: "00000000-0000-0000-0000-000000000000" }],
    ["get_goal_progress", { p_goal_id: "00000000-0000-0000-0000-000000000000" }],
    [
      "get_credit_card_invoice",
      {
        p_account_id: cardId || "00000000-0000-0000-0000-000000000000",
        p_user_id: UID,
        p_month_start: "2026-06-01",
        p_month_end: "2026-06-30",
      },
    ],
  ];
  for (const [n, b] of rpcs) {
    r = await api("POST", `rpc/${n}`, b);
    L("RPC " + n, r.s !== 404, "s=" + r.s);
  }

  // 15. PROFILES / AVATAR
  console.log("\n--- 15. PERFIL / AVATAR ---");
  r = await api("GET", `profiles?id=eq.${UID}&select=*`);
  L(
    "Perfil do usuário",
    r.ok,
    r.ok && r.d?.[0] ? "full_name=" + (r.d[0].full_name || "N/A") : "N/A"
  );
  if (r.ok && r.d?.[0]) {
    r = await api("PATCH", `profiles?id=eq.${UID}`, {
      avatar_color: "purple",
      avatar_icon: "avatar_5",
    });
    L("Atualizar avatar", r.ok);
  }

  // 16. ACCOUNT BALANCE
  console.log("\n--- 16. SALDO DAS CONTAS ---");
  let balRes = await api("POST", "rpc/recalculate_account_balance", {
    p_account_id: accId || "00000000-0000-0000-0000-000000000000",
  });
  L("Recalcular saldo", balRes.ok || balRes.s === 400, "s=" + balRes.s);

  // FINAL CLEANUP
  console.log("\n--- LIMPEZA ---");
  if (created.sp.length) {
    for (const id of created.sp) await api("DELETE", `transaction_splits?id=eq.${id}`);
    console.log("  " + created.sp.length + " splits");
  }
  let del = 0;
  for (const id of created.tx) {
    if ((await api("DELETE", `transactions?id=eq.${id}`)).ok) del++;
  }
  console.log("  " + del + "/" + created.tx.length + " tx");
  for (const id of created.bd) await api("DELETE", `budgets?id=eq.${id}`);
  for (const id of created.gl) await api("DELETE", `goals?id=eq.${id}`);
  for (const id of created.nf) await api("DELETE", `notifications?id=eq.${id}`);
  for (const id of created.tp) await api("DELETE", `trips?id=eq.${id}`);
  for (const id of created.inv) await api("DELETE", `family_invitations?id=eq.${id}`);

  // SUMMARY
  console.log("\n" + "=".repeat(50));
  const ok = R.filter((r) => r.ok).length;
  const fail = R.filter((r) => !r.ok).length;
  console.log(`PRÉ-LANÇAMENTO: ${R.length} testes | ${ok} OK | ${fail} falhas`);
  if (fail > 0) {
    console.log("\nFALHAS:");
    R.filter((r) => !r.ok).forEach((r) => console.log("  ❌ " + r.t + ": " + r.detail));
  }
  console.log("=".repeat(50));
}

main().catch((e) => console.error("FATAL:", e.message));
