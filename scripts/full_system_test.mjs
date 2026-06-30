// ============================================================================
// TESTE COMPLETO DO SISTEMA - Seu Bolso Inteligente v2
// ============================================================================

const SUPABASE_URL = "https://vrrcagukyfnlhxuvnssp.supabase.co";
const SK =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycmNhZ3VreWZubGh4dXZuc3NwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcwMDg0NiwiZXhwIjoyMDgyMjc2ODQ2fQ.FrCVUHQ_4x0RCzpnNBFRRAfJj6_uezKJb2pNQ26xfiE";
const UID = "56ccd60b-641f-4265-bc17-7b8705a2f8c9";
const PRE = "ZZTEST-";
const results = [];
const created = { tx: [], splits: [], budgets: [], goals: [], notif: [], trips: [] };

const H = {
  "Content-Type": "application/json",
  apikey: SK,
  Authorization: `Bearer ${SK}`,
  Prefer: "return=representation",
};

async function api(method, path, body) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const opts = { method, headers: { ...H } };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, data, ok: res.ok };
  } catch (e) {
    return { status: 0, data: e.message, ok: false };
  }
}

function log(test, ok, detail = "") {
  const icon = ok ? "OK" : "FAIL";
  console.log(`  ${icon}  ${test}${detail ? ": " + detail : ""}`);
  results.push({ test, ok, detail });
}

function section(name) {
  console.log(`\n--- ${name} ---`);
}

// CLEANUP ALL PREVIOUS TEST DATA
async function cleanupAll() {
  section("LIMPEZA PRÉVIA");
  let r = await api(
    "GET",
    `transactions?user_id=eq.${UID}&description=ilike.${PRE}*&select=id&limit=100`
  );
  if (r.ok && Array.isArray(r.data)) {
    for (const tx of r.data) await api("DELETE", `transactions?id=eq.${tx.id}`);
    console.log(`  OK   ${r.data.length} transações antigas removidas`);
  }
  for (const tbl of ["budgets", "goals", "notifications", "trips"]) {
    r = await api("GET", `${tbl}?user_id=eq.${UID}&limit=30`);
    if (r.ok && Array.isArray(r.data)) {
      const testItems = r.data.filter((item) => (item.name || item.title || "").startsWith(PRE));
      for (const item of testItems) await api("DELETE", `${tbl}?id=eq.${item.id}`);
      if (testItems.length > 0) console.log(`  OK   ${testItems.length} ${tbl} antigos removidos`);
    }
  }
}

// 1. INTEGRIDADE
async function t1() {
  section("1. INTEGRIDADE DAS TABELAS");
  const tables = [
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
  ];
  for (const t of tables) {
    const r = await api("GET", `${t}?select=id&limit=1`);
    log(`Tabela ${t}`, r.ok || r.status === 400, `status=${r.status}`);
  }
}

// 2. CONTAS
async function t2() {
  section("2. CONTAS");
  let r = await api("GET", `accounts?user_id=eq.${UID}&limit=10`);
  log("Listar contas", r.ok, `${Array.isArray(r.data) ? r.data.length : 0} contas`);
  if (!r.ok || !Array.isArray(r.data) || r.data.length === 0) return;
  for (const acc of r.data) {
    console.log(`         ${acc.name} (${acc.type}) saldo=${acc.current_balance ?? "N/A"}`);
  }
  const acc = r.data[0];
  let dep = await api("POST", "rpc/check_account_dependencies", { p_account_id: acc.id });
  log("RPC check_account_dependencies", dep.ok || dep.status === 400, `status=${dep.status}`);
}

// 3. TRANSAÇÕES BÁSICAS
async function t3() {
  section("3. TRANSAÇÕES BÁSICAS");
  let ar = await api("GET", `accounts?user_id=eq.${UID}&type=eq.CHECKING&limit=1`);
  const accId = ar.ok && ar.data?.[0]?.id;
  let sr = await api("GET", `accounts?user_id=eq.${UID}&type=eq.SAVINGS&limit=1`);
  const savId = sr.ok && sr.data?.[0]?.id;
  let cr = await api("GET", `categories?type=eq.expense&limit=1`);
  const catId = cr.ok && cr.data?.[0]?.id;
  let ir = await api("GET", `categories?type=eq.income&limit=1`);
  const incId = ir.ok && ir.data?.[0]?.id;

  if (!accId) {
    log("Transações", false, "Sem conta corrente");
    return;
  }

  const base = {
    user_id: UID,
    creator_user_id: UID,
    date: "2026-06-30",
    competence_date: "2026-06-01",
    is_shared: false,
    is_recurring: false,
    is_installment: false,
  };

  // Expense
  let r = await api("POST", "transactions?select=id,amount,description,type", {
    ...base,
    amount: 75,
    description: PRE + "Almoço",
    type: "EXPENSE",
    domain: "PERSONAL",
    account_id: accId,
    category_id: catId,
  });
  log(
    "Criar DESPESA",
    r.ok,
    r.ok ? `id=${r.data[0]?.id?.slice(0, 8)}` : JSON.stringify(r.data).slice(0, 80)
  );
  if (r.ok && r.data?.[0]?.id) created.tx.push(r.data[0].id);

  // Income
  r = await api("POST", "transactions?select=id,amount,description,type", {
    ...base,
    amount: 5000,
    description: PRE + "Salário",
    type: "INCOME",
    domain: "PERSONAL",
    account_id: accId,
    category_id: incId,
  });
  log(
    "Criar RECEITA",
    r.ok,
    r.ok ? `id=${r.data[0]?.id?.slice(0, 8)}` : JSON.stringify(r.data).slice(0, 80)
  );
  if (r.ok && r.data?.[0]?.id) created.tx.push(r.data[0].id);

  // Transfer
  if (savId) {
    r = await api("POST", "transactions?select=id,amount,description,type", {
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
      r.ok ? `id=${r.data[0]?.id?.slice(0, 8)}` : JSON.stringify(r.data).slice(0, 80)
    );
    if (r.ok && r.data?.[0]?.id) created.tx.push(r.data[0].id);
  }

  // List
  r = await api("GET", `transactions?user_id=eq.${UID}&order=created_at.desc&limit=10`);
  log("Listar recentes", r.ok, `${Array.isArray(r.data) ? r.data.length : 0} transações`);
}

// 4. COMPARTILHADAS
async function t4() {
  section("4. COMPARTILHADAS");
  let mr = await api("GET", `family_members?linked_user_id=eq.${UID}&limit=1`);
  const member = mr.ok && mr.data?.[0];
  if (!member) {
    log("Compartilhadas", false, "Sem family_member");
    return;
  }
  let ar = await api("GET", `accounts?user_id=eq.${UID}&type=eq.CHECKING&limit=1`);
  const accId = ar.ok && ar.data?.[0]?.id;
  let cr = await api("GET", `categories?type=eq.expense&limit=1`);
  const catId = cr.ok && cr.data?.[0]?.id;
  let omr = await api("GET", `family_members?limit=10`);
  const other = omr.ok && Array.isArray(omr.data) ? omr.data.find((m) => m.id !== member.id) : null;

  let r = await api("POST", "transactions?select=*", {
    user_id: UID,
    creator_user_id: UID,
    amount: 250,
    description: PRE + "Jantar Compartilhado",
    date: "2026-06-30",
    competence_date: "2026-06-01",
    type: "EXPENSE",
    domain: "SHARED",
    account_id: accId,
    category_id: catId,
    is_shared: true,
    payer_id: member.id,
    is_recurring: false,
    is_installment: false,
  });
  if (r.ok && r.data?.[0]?.id) {
    created.tx.push(r.data[0].id);
    log("Criar transação compartilhada", true, `id=${r.data[0].id.slice(0, 8)}`);

    const splits = [
      {
        transaction_id: r.data[0].id,
        member_id: member.id,
        user_id: UID,
        percentage: 50,
        amount: 125,
        name: "Você",
        is_settled: false,
      },
    ];
    if (other)
      splits.push({
        transaction_id: r.data[0].id,
        member_id: other.id,
        user_id: other.linked_user_id,
        percentage: 50,
        amount: 125,
        name: "Outro",
        is_settled: false,
      });

    let sr = await api("POST", "transaction_splits?select=id", splits);
    log("Criar splits", sr.ok, `${Array.isArray(sr.data) ? sr.data.length : 0} criados`);
    if (sr.ok && Array.isArray(sr.data)) sr.data.forEach((s) => created.splits.push(s.id));

    // Settlement
    if (other) {
      let st = await api("POST", "transactions?select=id", {
        user_id: other.linked_user_id || UID,
        creator_user_id: other.linked_user_id || UID,
        amount: 125,
        description: PRE + "Acerto Jantar",
        date: "2026-06-30",
        competence_date: "2026-06-01",
        type: "EXPENSE",
        domain: "SHARED",
        account_id: accId,
        is_shared: true,
        is_recurring: false,
        is_installment: false,
        related_member_id: member.id,
        is_settled: true,
      });
      log(
        "Criar acerto (settlement)",
        st.ok,
        st.ok ? `id=${st.data[0]?.id?.slice(0, 8)}` : JSON.stringify(st.data).slice(0, 80)
      );
      if (st.ok && st.data?.[0]?.id) created.tx.push(st.data[0].id);
    }

    let dr = await api("POST", "rpc/get_current_shared_debts", { p_user_id: UID });
    log("RPC get_current_shared_debts", dr.ok, `status=${dr.status}`);
  } else {
    log("Transação compartilhada", false, JSON.stringify(r.data).slice(0, 80));
  }
}

// 5. PARCELAMENTOS
async function t5() {
  section("5. PARCELAMENTOS");
  let ar = await api("GET", `accounts?user_id=eq.${UID}&type=eq.CREDIT_CARD&limit=1`);
  const card = ar.ok && ar.data?.[0];
  if (!card) {
    log("Parcelamento", false, "Sem cartão");
    return;
  }
  const seriesId = crypto.randomUUID();
  let allOk = true;
  for (let i = 0; i < 3; i++) {
    const mon = 6 + i;
    const r = await api("POST", "transactions?select=id", {
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
    if (r.ok && r.data?.[0]?.id) created.tx.push(r.data[0].id);
    else allOk = false;
  }
  log("Criar 3 parcelas", allOk, `series=${seriesId.slice(0, 8)}`);
}

// 6. ORÇAMENTOS
async function t6() {
  section("6. ORÇAMENTOS");
  let cr = await api("GET", `categories?type=eq.expense&limit=1`);
  const cat = cr.ok && cr.data?.[0];
  if (!cat) {
    log("Orçamento", false, "Sem categoria");
    return;
  }
  let r = await api("POST", "budgets?select=*", {
    user_id: UID,
    category_id: cat.id,
    amount: 1000,
    period: "MONTHLY",
    start_date: "2026-06-01",
    end_date: "2026-12-31",
    is_active: true,
    notification_threshold: 80,
  });
  log(
    "Criar orçamento",
    r.ok,
    r.ok ? `id=${r.data[0]?.id?.slice(0, 8)}` : JSON.stringify(r.data).slice(0, 80)
  );
  if (r.ok && r.data?.[0]?.id) {
    created.budgets.push(r.data[0].id);
    let pr = await api("POST", "rpc/get_budget_progress", { p_budget_id: r.data[0].id });
    log("Progresso do orçamento", pr.ok, `status=${pr.status}`);
  }
}

// 7. METAS
async function t7() {
  section("7. METAS");
  let r = await api("POST", "goals?select=*", {
    user_id: UID,
    name: PRE + "Viagem Praia",
    target_amount: 5000,
    current_amount: 0,
    start_date: "2026-06-30",
    target_date: "2026-12-31",
    type: "GOAL",
    status: "ACTIVE",
    currency: "BRL",
  });
  log(
    "Criar meta",
    r.ok,
    r.ok ? `id=${r.data[0]?.id?.slice(0, 8)}` : JSON.stringify(r.data).slice(0, 80)
  );
  if (r.ok && r.data?.[0]?.id) {
    created.goals.push(r.data[0].id);
    let up = await api("PATCH", `goals?id=eq.${r.data[0].id}`, { current_amount: 500 });
    log("Atualizar progresso", up.ok);
  }
}

// 8. NOTIFICAÇÕES
async function t8() {
  section("8. NOTIFICAÇÕES");
  let r = await api("POST", "notifications?select=*", {
    user_id: UID,
    type: "SYSTEM",
    title: PRE + "Notificação Teste",
    message: "Teste automatizado.",
    icon: "🔔",
    priority: "NORMAL",
    is_read: false,
  });
  log(
    "Criar notificação",
    r.ok,
    r.ok ? `id=${r.data[0]?.id?.slice(0, 8)}` : JSON.stringify(r.data).slice(0, 80)
  );
  if (r.ok && r.data?.[0]?.id) {
    created.notif.push(r.data[0].id);
    let mr = await api("PATCH", `notifications?id=eq.${r.data[0].id}`, { is_read: true });
    log("Marcar como lida", mr.ok);
  }
}

// 9. CARTÃO DE CRÉDITO
async function t9() {
  section("9. CARTÃO DE CRÉDITO");
  let ar = await api("GET", `accounts?user_id=eq.${UID}&type=eq.CREDIT_CARD&limit=1`);
  const card = ar.ok && ar.data?.[0];
  if (!card) {
    log("Cartão", false, "Sem cartão");
    return;
  }
  let up = await api("PATCH", `accounts?id=eq.${card.id}`, { closing_day: 15, due_day: 5 });
  log("Atualizar fechamento", up.ok);
  let inv = await api("GET", `credit_card_invoices?account_id=eq.${card.id}&limit=3`);
  log("Listar faturas", inv.ok, `${Array.isArray(inv.data) ? inv.data.length : 0} faturas`);
  let pr = await api("POST", "rpc/process_credit_card_invoice", {
    p_account_id: card.id,
    p_reference_date: "2026-07-01",
  });
  log("Processar fatura (RPC)", pr.ok, `status=${pr.status}`);
}

// 10. VIAGENS
async function t10() {
  section("10. VIAGENS");
  let r = await api("POST", "trips?select=*", {
    user_id: UID,
    name: PRE + "Rio de Janeiro",
    destination: "Rio de Janeiro",
    start_date: "2026-08-01",
    end_date: "2026-08-10",
    budget: 3000,
    currency: "BRL",
    status: "PLANNING",
  });
  log(
    "Criar viagem",
    r.ok,
    r.ok ? `id=${r.data[0]?.id?.slice(0, 8)}` : JSON.stringify(r.data).slice(0, 80)
  );
  if (!r.ok || !r.data?.[0]?.id) return;
  created.trips.push(r.data[0].id);
  let ar = await api("GET", `accounts?user_id=eq.${UID}&type=eq.CHECKING&limit=1`);
  const accId = ar.ok && ar.data?.[0]?.id;
  if (accId) {
    let tx = await api("POST", "transactions?select=id", {
      user_id: UID,
      creator_user_id: UID,
      amount: 450,
      description: PRE + "Passagem RJ",
      date: "2026-06-30",
      competence_date: "2026-06-01",
      type: "EXPENSE",
      domain: "TRAVEL",
      trip_id: r.data[0].id,
      account_id: accId,
      is_shared: false,
      is_recurring: false,
      is_installment: false,
    });
    log(
      "Despesa na viagem",
      tx.ok,
      tx.ok ? `id=${tx.data[0]?.id?.slice(0, 8)}` : JSON.stringify(tx.data).slice(0, 80)
    );
    if (tx.ok && tx.data?.[0]?.id) created.tx.push(tx.data[0].id);
  }
  let ts = await api("POST", "rpc/get_trip_financial_summary", { p_trip_id: r.data[0].id });
  log("Resumo financeiro (RPC)", ts.ok, `status=${ts.status}`);
}

// 11. EDIÇÃO E EXCLUSÃO
async function t11() {
  section("11. EDIÇÃO E EXCLUSÃO");
  if (created.tx.length === 0) {
    log("Edição/Exclusão", false, "Sem transações");
    return;
  }
  const txId = created.tx[0];
  let ed = await api("PATCH", `transactions?id=eq.${txId}`, {
    description: PRE + "EDITADO",
    amount: 888,
  });
  log("Editar transação", ed.ok);
  let sd = await api("PATCH", `transactions?id=eq.${txId}`, {
    deleted_at: new Date().toISOString(),
  });
  log("Soft delete", sd.ok);
  let vf = await api("GET", `transactions?id=eq.${txId}&select=id,deleted_at`);
  log("Verificar soft delete", vf.ok && vf.data?.[0]?.deleted_at !== null, "deleted_at preenchido");
  let rs = await api("PATCH", `transactions?id=eq.${txId}`, { deleted_at: null });
  log("Restaurar", rs.ok);
}

// 12. RPCs
async function t12() {
  section("12. FUNÇÕES RPC");
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
    [
      "process_credit_card_invoice",
      { p_account_id: "00000000-0000-0000-0000-000000000000", p_reference_date: "2026-07-01" },
    ],
    ["search_transactions", { p_user_id: UID, p_search_term: "test" }],
    ["get_budget_progress", { p_budget_id: "00000000-0000-0000-0000-000000000000" }],
    ["delete_user_account_rpc", { p_account_id: "00000000-0000-0000-0000-000000000000" }],
    ["expire_pending_settlements", {}],
    ["check_account_dependencies", { p_account_id: "00000000-0000-0000-0000-000000000000" }],
    ["recalculate_account_balance", { p_account_id: "00000000-0000-0000-0000-000000000000" }],
    [
      "settle_transaction_split",
      { p_split_id: "00000000-0000-0000-0000-000000000000", p_settled_by: UID },
    ],
    ["unsettle_transaction_split", { p_split_id: "00000000-0000-0000-0000-000000000000" }],
  ];
  for (const [name, body] of rpcs) {
    const r = await api("POST", `rpc/${name}`, body);
    log(`RPC ${name}`, r.status !== 404, `status=${r.status}`);
  }
}

// 13. RECORRÊNCIAS
async function t13() {
  section("13. RECORRÊNCIAS");
  let ar = await api("GET", `accounts?user_id=eq.${UID}&type=eq.CHECKING&limit=1`);
  const accId = ar.ok && ar.data?.[0]?.id;
  if (!accId) {
    log("Recorrência", false, "Sem conta");
    return;
  }
  let r = await api("POST", "transactions?select=id", {
    user_id: UID,
    creator_user_id: UID,
    amount: 39.9,
    description: PRE + "Streaming Mensal",
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
    r.ok ? `id=${r.data[0]?.id?.slice(0, 8)}` : JSON.stringify(r.data).slice(0, 80)
  );
  if (r.ok && r.data?.[0]?.id) created.tx.push(r.data[0].id);
}

// 14. FAMÍLIA
async function t14() {
  section("14. FAMÍLIA E CONVITES");
  let fm = await api("GET", `family_members?linked_user_id=eq.${UID}&limit=5`);
  log("Membros da família", fm.ok, `${Array.isArray(fm.data) ? fm.data.length : 0} membros`);
  if (fm.ok && Array.isArray(fm.data) && fm.data.length > 0) {
    let fam = await api("GET", `families?id=eq.${fm.data[0].family_id}&limit=1`);
    log("Família", fam.ok, fam.data?.[0]?.name || "N/A");
  }
  let inv = await api(
    "GET",
    `family_invitations?email=eq.wesley.diaslima@gmail.com&status=eq.PENDING&limit=5`
  );
  log("Convites pendentes", inv.ok, `${Array.isArray(inv.data) ? inv.data.length : 0}`);
}

// 15. AUTO-SHARE
async function t15() {
  section("15. REGRAS AUTO-SHARE");
  let fm = await api("GET", `family_members?linked_user_id=eq.${UID}&limit=1`);
  if (!fm.ok || !fm.data?.[0]) {
    log("Auto-share", false, "Sem family_member");
    return;
  }
  let r = await api("POST", "transaction_auto_share_rules?select=*", {
    user_id: UID,
    member_id: fm.data[0].id,
    description_pattern: PRE,
    split_ratio: 0.5,
    is_active: true,
  });
  log(
    "Criar regra auto-share",
    r.ok,
    r.ok ? `id=${r.data[0]?.id?.slice(0, 8)}` : JSON.stringify(r.data).slice(0, 80)
  );
  if (r.ok && r.data?.[0]?.id)
    await api("DELETE", `transaction_auto_share_rules?id=eq.${r.data[0].id}`);
}

// FINAL CLEANUP
async function finalCleanup() {
  section("LIMPEZA FINAL");
  if (created.splits.length > 0) {
    for (const id of created.splits) await api("DELETE", `transaction_splits?id=eq.${id}`);
    console.log(`  OK   ${created.splits.length} splits`);
  }
  let del = 0;
  for (const id of created.tx) {
    if ((await api("DELETE", `transactions?id=eq.${id}`)).ok) del++;
  }
  console.log(`  OK   ${del}/${created.tx.length} transações`);
  for (const id of created.budgets) await api("DELETE", `budgets?id=eq.${id}`);
  if (created.budgets.length) console.log(`  OK   ${created.budgets.length} orçamentos`);
  for (const id of created.goals) await api("DELETE", `goals?id=eq.${id}`);
  if (created.goals.length) console.log(`  OK   ${created.goals.length} metas`);
  for (const id of created.notif) await api("DELETE", `notifications?id=eq.${id}`);
  if (created.notif.length) console.log(`  OK   ${created.notif.length} notificações`);
  for (const id of created.trips) await api("DELETE", `trips?id=eq.${id}`);
  if (created.trips.length) console.log(`  OK   ${created.trips.length} viagens`);
}

async function main() {
  console.log("=".repeat(55));
  console.log("TESTE COMPLETO - Seu Bolso Inteligente");
  console.log("Data: " + new Date().toISOString());
  console.log("=".repeat(55));

  await cleanupAll();
  await t1();
  await t2();
  await t3();
  await t4();
  await t5();
  await t6();
  await t7();
  await t8();
  await t9();
  await t10();
  await t11();
  await t12();
  await t13();
  await t14();
  await t15();
  await finalCleanup();

  console.log("\n" + "=".repeat(55));
  const ok = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  console.log(`RESULTADO: ${results.length} testes | ${ok} OK | ${fail} falhas`);
  if (fail > 0) {
    console.log("\nFALHAS:");
    results.filter((r) => !r.ok).forEach((r) => console.log(`  ❌ ${r.test}: ${r.detail}`));
  }
  console.log("=".repeat(55));
}

main().catch((e) => console.error("FATAL:", e.message));
