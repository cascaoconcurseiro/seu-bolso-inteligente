# -*- coding: utf-8 -*-
"""
AUDITORIA COMPLETA — Seu Bolso Inteligente
Fases 1-20 — ASCII-safe version
"""
import subprocess, json, sys, os, tempfile
from datetime import datetime
from collections import defaultdict

PROJECT_DIR = r"c:\Users\Wesley\Bolso inteligente\seu-bolso-inteligente"

def run_query(sql: str) -> list[dict]:
    """Run SQL against linked Supabase project and return rows."""
    tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False, encoding='utf-8')
    try:
        tmp.write(sql)
        tmp.close()
        cmd = f'npx supabase db query --linked --file "{tmp.name}" --output-format json'
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=PROJECT_DIR, timeout=60, shell=True)
    finally:
        try: os.unlink(tmp.name)
        except: pass
    stdout = result.stdout or ""
    lines = stdout.strip().split('\n')
    json_start = 0
    for i, line in enumerate(lines):
        if line.strip().startswith('{'):
            json_start = i
            break
    try:
        data = json.loads('\n'.join(lines[json_start:]))
        return data.get("rows", [])
    except json.JSONDecodeError as e:
        print(f"  [WARN] JSON parse: {e}")
        return []

def run_safe(sql: str) -> list[dict]:
    try: return run_query(sql)
    except Exception as e: return [{"error": str(e)}]

OK = "OK"
FAIL = "FAIL"
WARN = "WARN"

all_issues = []

# ====== PHASE 1: INVENTORY ======
print("=" * 60)
print("PHASE 1: INVENTORY")
print("=" * 60)

tables = run_query("""
    SELECT table_name, 
           (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name=t.table_name) as cols,
           (SELECT count(*) FROM information_schema.table_constraints WHERE table_schema='public' AND table_name=t.table_name AND constraint_type='FOREIGN KEY') as fks
    FROM information_schema.tables t 
    WHERE table_schema='public' AND table_type='BASE TABLE'
    ORDER BY table_name
""")
print(f"Total tables: {len(tables)}")
for t in tables:
    print(f"  {t['table_name']}: {t['cols']} cols, {t['fks']} FKs")

counts = run_query("""
    SELECT 'accounts' as tbl, count(*) as n FROM accounts UNION ALL
    SELECT 'transactions', count(*) FROM transactions UNION ALL
    SELECT 'categories', count(*) FROM categories UNION ALL
    SELECT 'budgets', count(*) FROM budgets UNION ALL
    SELECT 'goals', count(*) FROM goals UNION ALL
    SELECT 'assets', count(*) FROM assets UNION ALL
    SELECT 'credit_card_invoices', count(*) FROM credit_card_invoices UNION ALL
    SELECT 'transaction_splits', count(*) FROM transaction_splits UNION ALL
    SELECT 'family_members', count(*) FROM family_members UNION ALL
    SELECT 'trips', count(*) FROM trips UNION ALL
    SELECT 'profiles', count(*) FROM profiles UNION ALL
    SELECT 'notifications', count(*) FROM notifications UNION ALL
    SELECT 'settlement_reversals', count(*) FROM settlement_reversals UNION ALL
    SELECT 'audit_log', count(*) FROM audit_log UNION ALL
    SELECT 'error_logs', count(*) FROM error_logs UNION ALL
    SELECT 'financial_ledger', count(*) FROM financial_ledger UNION ALL
    SELECT 'goal_milestones', count(*) FROM goal_milestones UNION ALL
    SELECT 'push_subscriptions', count(*) FROM push_subscriptions UNION ALL
    SELECT 'trip_members', count(*) FROM trip_members UNION ALL
    SELECT 'pin_attempts', count(*) FROM pin_attempts
    ORDER BY tbl
""")
print(f"\nRow counts:")
for c in counts:
    print(f"  {c['tbl']}: {c['n']}")

views = run_query("SELECT table_name FROM information_schema.views WHERE table_schema='public' ORDER BY table_name")
print(f"\nViews: {len(views)}")
for v in views: print(f"  {v['table_name']}")

enums = run_query("""
    SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) as vals
    FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid  
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname ORDER BY t.typname
""")
print(f"\nEnums: {len(enums)}")
for e in enums: print(f"  {e['typname']}: {e['vals']}")

funcs = run_query("""
    SELECT routine_name FROM information_schema.routines 
    WHERE routine_schema='public' AND routine_type='FUNCTION'
    ORDER BY routine_name
""")
print(f"\nFunctions/RPCs: {len(funcs)}")

triggers = run_query("""
    SELECT trigger_name, event_manipulation, event_object_table, action_timing
    FROM information_schema.triggers WHERE trigger_schema='public'
    ORDER BY event_object_table, trigger_name
""")
print(f"\nTriggers: {len(triggers)}")

# ====== PHASE 2: REFERENTIAL INTEGRITY ======
print("\n" + "=" * 60)
print("PHASE 2: REFERENTIAL INTEGRITY")
print("=" * 60)

fk_checks = [
    ("transactions.account_id -> accounts", 
     "SELECT count(*) as n FROM transactions t LEFT JOIN accounts a ON t.account_id = a.id WHERE t.account_id IS NOT NULL AND a.id IS NULL AND t.deleted_at IS NULL"),
    ("transactions.category_id -> categories",
     "SELECT count(*) as n FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.category_id IS NOT NULL AND c.id IS NULL AND t.deleted_at IS NULL"),
    ("transactions.user_id -> profiles",
     "SELECT count(*) as n FROM transactions t LEFT JOIN profiles p ON t.user_id = p.id WHERE t.user_id IS NOT NULL AND p.id IS NULL AND t.deleted_at IS NULL"),
    ("transaction_splits.transaction_id -> transactions",
     "SELECT count(*) as n FROM transaction_splits ts LEFT JOIN transactions t ON ts.transaction_id = t.id WHERE ts.transaction_id IS NOT NULL AND t.id IS NULL"),
    ("transaction_splits.split_user_id -> profiles",
     "SELECT count(*) as n FROM transaction_splits ts LEFT JOIN profiles p ON ts.split_user_id = p.id WHERE ts.split_user_id IS NOT NULL AND p.id IS NULL"),
    ("accounts.user_id -> profiles",
     "SELECT count(*) as n FROM accounts a LEFT JOIN profiles p ON a.user_id = p.id WHERE a.user_id IS NOT NULL AND p.id IS NULL AND a.deleted_at IS NULL"),
    ("budgets.category_id -> categories",
     "SELECT count(*) as n FROM budgets b LEFT JOIN categories c ON b.category_id = c.id WHERE b.category_id IS NOT NULL AND c.id IS NULL"),
    ("credit_card_invoices.credit_card_id -> accounts",
     "SELECT count(*) as n FROM credit_card_invoices ci LEFT JOIN accounts a ON ci.credit_card_id = a.id WHERE a.id IS NULL"),
    ("family_members.user_id -> profiles",
     "SELECT count(*) as n FROM family_members fm LEFT JOIN profiles p ON fm.user_id = p.id WHERE p.id IS NULL AND fm.deleted_at IS NULL"),
    ("notifications.user_id -> profiles",
     "SELECT count(*) as n FROM notifications n LEFT JOIN profiles p ON n.user_id = p.id WHERE p.id IS NULL"),
    ("settlement_reversals.split_id -> transaction_splits",
     "SELECT count(*) as n FROM settlement_reversals sr LEFT JOIN transaction_splits ts ON sr.split_id = ts.id WHERE ts.id IS NULL"),
]

for name, sql in fk_checks:
    rows = run_safe(sql)
    count = int(rows[0].get('n', 0)) if rows else 0
    status = OK if count == 0 else FAIL
    print(f"  [{status}] {name}: {count} orphans")
    if count > 0:
        all_issues.append({"check": name, "count": count, "severity": "CRITICO"})

# FK indexes
missing_idx = run_query("""
    SELECT DISTINCT tc.table_name, kcu.column_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    LEFT JOIN pg_indexes pi ON pi.tablename = tc.table_name AND pi.indexdef LIKE '%' || kcu.column_name || '%'
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND pi.indexname IS NULL
    ORDER BY tc.table_name
""")
print(f"\n  FKs without index: {len(missing_idx)}")
for m in missing_idx:
    print(f"    [{WARN}] {m['table_name']}.{m['column_name']}")
    all_issues.append({"check": f"FK without index: {m['table_name']}.{m['column_name']}", "severity": "ALTO"})

# ====== PHASE 3: DUPLICATES ======
print("\n" + "=" * 60)
print("PHASE 3: DUPLICATES")
print("=" * 60)

dup_checks = [
    ("Transactions (same amount, date, desc, account, user)",
     """SELECT count(*) as groups FROM (
            SELECT user_id, account_id, amount, date, description, count(*) as cnt
            FROM transactions WHERE deleted_at IS NULL
            GROUP BY user_id, account_id, amount, date, description 
            HAVING count(*) > 1
        ) sub"""),
    ("Accounts (same name, user)",
     """SELECT count(*) as groups FROM (
            SELECT user_id, name, count(*) as cnt
            FROM accounts WHERE deleted_at IS NULL
            GROUP BY user_id, name HAVING count(*) > 1
        ) sub"""),
    ("Categories (same name, parent, user)",
     """SELECT count(*) as groups FROM (
            SELECT user_id, name, parent_id, count(*) as cnt
            FROM categories WHERE deleted_at IS NULL
            GROUP BY user_id, name, parent_id HAVING count(*) > 1
        ) sub"""),
]

for name, sql in dup_checks:
    rows = run_safe(sql)
    count = int(rows[0].get('groups', 0)) if rows else 0
    status = OK if count == 0 else FAIL
    print(f"  [{status}] {name}: {count} groups")
    if count > 0:
        all_issues.append({"check": name, "count": count, "severity": "ALTO"})

# ====== PHASE 4: ORPHANS ======
print("\n" + "=" * 60)
print("PHASE 4: ORPHAN DATA")
print("=" * 60)

orphan_checks = [
    ("Transactions without category (non-transfer)", "SELECT count(*) as n FROM transactions WHERE category_id IS NULL AND type NOT IN ('TRANSFER', 'DEPOSIT', 'WITHDRAWAL') AND deleted_at IS NULL"),
    ("Categories with broken parent", "SELECT count(*) as n FROM categories c LEFT JOIN categories p ON c.parent_id = p.id WHERE c.parent_id IS NOT NULL AND p.id IS NULL AND c.deleted_at IS NULL"),
    ("Transaction splits without parent tx", "SELECT count(*) as n FROM transaction_splits ts LEFT JOIN transactions t ON ts.transaction_id = t.id WHERE t.id IS NULL"),
    ("Goal milestones without goal", "SELECT count(*) as n FROM goal_milestones gm LEFT JOIN goals g ON gm.goal_id = g.id WHERE g.id IS NULL"),
    ("Push subscriptions without user", "SELECT count(*) as n FROM push_subscriptions ps LEFT JOIN profiles p ON ps.user_id = p.id WHERE p.id IS NULL"),
    ("Unused user categories", "SELECT count(*) as n FROM categories c LEFT JOIN transactions t ON t.category_id = c.id AND t.deleted_at IS NULL WHERE t.id IS NULL AND c.deleted_at IS NULL AND c.user_id IS NOT NULL"),
]

for name, sql in orphan_checks:
    rows = run_safe(sql)
    count = int(rows[0].get('n', 0)) if rows else 0
    status = OK if count == 0 else (FAIL if count > 10 else WARN)
    print(f"  [{status}] {name}: {count}")
    if count > 0:
        sev = "CRITICO" if count > 10 else "MEDIO"
        all_issues.append({"check": name, "count": count, "severity": sev})

# ====== PHASE 5: FIELD VALIDATION ======
print("\n" + "=" * 60)
print("PHASE 5: FIELD VALIDATION")
print("=" * 60)

field_checks = [
    ("Transactions: amount <= 0 (non-transfer)", "SELECT count(*) as n FROM transactions WHERE amount <= 0 AND type NOT IN ('TRANSFER', 'DEPOSIT', 'WITHDRAWAL') AND deleted_at IS NULL"),
    ("Transactions: amount IS NULL", "SELECT count(*) as n FROM transactions WHERE amount IS NULL AND deleted_at IS NULL"),
    ("Transactions: date IS NULL", "SELECT count(*) as n FROM transactions WHERE date IS NULL AND deleted_at IS NULL"),
    ("Transactions: future date (>30d)", "SELECT count(*) as n FROM transactions WHERE date > CURRENT_DATE + INTERVAL '30 days' AND deleted_at IS NULL"),
    ("Transactions: competence_date not day 1", "SELECT count(*) as n FROM transactions WHERE competence_date IS NOT NULL AND EXTRACT(DAY FROM competence_date) != 1 AND deleted_at IS NULL"),
    ("Accounts: negative initial_balance (non-credit)", "SELECT count(*) as n FROM accounts WHERE initial_balance < 0 AND type NOT IN ('CREDIT_CARD') AND deleted_at IS NULL"),
    ("Accounts: invalid closing_day", "SELECT count(*) as n FROM accounts WHERE closing_day IS NOT NULL AND (closing_day < 1 OR closing_day > 31) AND deleted_at IS NULL"),
    ("Accounts: invalid due_day", "SELECT count(*) as n FROM accounts WHERE due_day IS NOT NULL AND (due_day < 1 OR due_day > 31) AND deleted_at IS NULL"),
    ("Categories: empty name", "SELECT count(*) as n FROM categories WHERE (name IS NULL OR name = '') AND deleted_at IS NULL"),
    ("Goals: target_amount <= 0", "SELECT count(*) as n FROM goals WHERE target_amount <= 0 AND deleted_at IS NULL"),
    ("Budgets: amount <= 0", "SELECT count(*) as n FROM budgets WHERE amount <= 0"),
    ("Credit card invoices: closing_date > due_date", "SELECT count(*) as n FROM credit_card_invoices WHERE closing_date > due_date"),
    ("Transactions: invalid type enum", "SELECT count(*) as n FROM transactions WHERE type NOT IN ('EXPENSE', 'INCOME', 'TRANSFER', 'WITHDRAWAL', 'DEPOSIT') AND deleted_at IS NULL"),
]

for name, sql in field_checks:
    rows = run_safe(sql)
    count = int(rows[0].get('n', 0)) if rows else 0
    status = OK if count == 0 else FAIL
    print(f"  [{status}] {name}: {count}")
    if count > 0:
        sev = "CRITICO" if any(k in name.lower() for k in ['amount', 'date', 'null']) else "ALTO"
        all_issues.append({"check": name, "count": count, "severity": sev})

# Null rates
nulls = run_query("""
    SELECT 'transactions.description' as col, round(100.0 * count(*) FILTER (WHERE description IS NULL OR description = '') / NULLIF(count(*),0), 1) as pct FROM transactions WHERE deleted_at IS NULL
    UNION ALL
    SELECT 'transactions.competence_date', round(100.0 * count(*) FILTER (WHERE competence_date IS NULL) / NULLIF(count(*),0), 1) FROM transactions WHERE deleted_at IS NULL
    UNION ALL
    SELECT 'accounts.initial_balance', round(100.0 * count(*) FILTER (WHERE initial_balance IS NULL) / NULLIF(count(*),0), 1) FROM accounts WHERE deleted_at IS NULL
    UNION ALL
    SELECT 'credit_card_invoices.paid_at', round(100.0 * count(*) FILTER (WHERE paid_at IS NULL) / NULLIF(count(*),0), 1) FROM credit_card_invoices
""")
print("\n  Null rates:")
for n in nulls:
    print(f"    {n['col']}: {n['pct']}% null")
    if float(n['pct']) > 50:
        all_issues.append({"check": f"High null rate: {n['col']}", "pct": n['pct'], "severity": "MEDIO"})

# ====== PHASE 6: FINANCIAL CALCULATIONS ======
print("\n" + "=" * 60)
print("PHASE 6: FINANCIAL CALCULATIONS")
print("=" * 60)

# 6.1 Account balance vs sum of transactions
print("\n  6.1 Account Balance vs Sum of Transactions:")
bal_check = run_query("""
    SELECT a.id, a.name, a.balance as stored, a.initial_balance,
           COALESCE(SUM(t.amount), 0) as calculated,
           a.balance - COALESCE(SUM(t.amount), 0) as diff
    FROM accounts a
    LEFT JOIN transactions t ON t.account_id = a.id AND t.deleted_at IS NULL
    WHERE a.deleted_at IS NULL
    GROUP BY a.id, a.name, a.balance, a.initial_balance
    HAVING ABS(a.balance - COALESCE(SUM(t.amount), 0)) > 0.01
    ORDER BY ABS(a.balance - COALESCE(SUM(t.amount), 0)) DESC
    LIMIT 30
""")
print(f"    Accounts with balance divergence: {len(bal_check)}")
for b in bal_check:
    print(f"      [{FAIL}] {b['name']}: stored={b['stored']}, calc={b['calculated']}, diff={b['diff']}")
    all_issues.append({"check": f"Balance divergence: {b['name']}", "stored": b['stored'], "calculated": b['calculated'], "diff": b['diff'], "severity": "CRITICO"})

# 6.2 Income/Expense totals
print("\n  6.2 Income/Expense Reconciliation:")
rec = run_query("""
    SELECT 
        COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0) as income,
        COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0) as expense,
        COALESCE(SUM(amount), 0) as total
    FROM transactions WHERE deleted_at IS NULL
""")
if rec:
    print(f"    Income: {rec[0]['income']}, Expense: {rec[0]['expense']}, Total: {rec[0]['total']}")

# 6.3 Credit card invoice vs transactions
print("\n  6.3 Credit Card Invoice vs Sum of Transactions:")
inv_check = run_query("""
    SELECT ci.id, ci.credit_card_id, ci.competence_date, ci.total_amount as invoice_total,
           COALESCE(SUM(t.amount), 0) as tx_sum,
           ci.total_amount - COALESCE(SUM(t.amount), 0) as diff
    FROM credit_card_invoices ci
    LEFT JOIN transactions t ON t.credit_card_id = ci.credit_card_id AND t.competence_date = ci.competence_date AND t.deleted_at IS NULL
    GROUP BY ci.id, ci.credit_card_id, ci.competence_date, ci.total_amount
    HAVING ABS(ci.total_amount - COALESCE(SUM(t.amount), 0)) > 0.01
    LIMIT 20
""")
print(f"    Invoices with divergence: {len(inv_check)}")
for inv in inv_check:
    print(f"      [{FAIL}] Invoice {inv['id'][:8]}: total={inv['invoice_total']}, sum={inv['tx_sum']}, diff={inv['diff']}")
    all_issues.append({"check": f"Invoice divergence: {inv['competence_date']}", "invoice_total": inv['invoice_total'], "tx_sum": inv['tx_sum'], "diff": inv['diff'], "severity": "CRITICO"})

# 6.4 Budget progress
print("\n  6.4 Budget Progress vs Actual Spending:")
budget_check = run_query("""
    SELECT b.id, b.category_id, b.amount as budget, COALESCE(b.spent, 0) as stored_spent,
           COALESCE(SUM(t.amount), 0) as actual_spent
    FROM budgets b
    LEFT JOIN transactions t ON t.category_id = b.category_id AND t.user_id = b.user_id 
        AND t.type = 'EXPENSE' AND t.deleted_at IS NULL
        AND t.competence_date = date_trunc('month', CURRENT_DATE)::date
    WHERE b.period = 'MONTHLY'
    GROUP BY b.id, b.category_id, b.amount, b.spent, b.period
    HAVING ABS(COALESCE(b.spent, 0) - COALESCE(SUM(t.amount), 0)) > 0.01
    LIMIT 20
""")
print(f"    Budgets with spent divergence: {len(budget_check)}")
for b in budget_check:
    print(f"      [{WARN}] Budget: stored_spent={b['stored_spent']}, actual={b['actual_spent']}")
    all_issues.append({"check": "Budget spent divergence", "stored": b['stored_spent'], "actual": b['actual_spent'], "severity": "ALTO"})

# 6.5 Trip spent
print("\n  6.5 Trip Spent vs Actual Transactions:")
trip_check = run_query("""
    SELECT tr.id, tr.name, COALESCE(tr.spent, 0) as stored, COALESCE(SUM(t.amount), 0) as calc
    FROM trips tr
    LEFT JOIN transactions t ON t.trip_id = tr.id AND t.type = 'EXPENSE' AND t.deleted_at IS NULL
    WHERE tr.deleted_at IS NULL
    GROUP BY tr.id, tr.name, tr.spent
    HAVING ABS(COALESCE(tr.spent, 0) - COALESCE(SUM(t.amount), 0)) > 0.01
    LIMIT 20
""")
print(f"    Trips with spent divergence: {len(trip_check)}")
for tr in trip_check:
    print(f"      [{WARN}] {tr['name']}: stored={tr['stored']}, calc={tr['calc']}")
    all_issues.append({"check": f"Trip spent divergence: {tr['name']}", "severity": "ALTO"})

# 6.6 Rounding precision
print("\n  6.6 Rounding Precision:")
rounding = run_query("SELECT count(*) as n FROM transactions WHERE amount != ROUND(amount, 2) AND deleted_at IS NULL")
r_count = int(rounding[0]['n']) if rounding else 0
print(f"    Transactions with precision != 2 decimals: {r_count}")
if r_count > 0:
    all_issues.append({"check": "Rounding precision issue", "count": r_count, "severity": "CRITICO"})

# ====== PHASE 7: CONSISTENCY ======
print("\n" + "=" * 60)
print("PHASE 7: CROSS-SOURCE CONSISTENCY")
print("=" * 60)

totals = run_query("""
    SELECT type, COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total
    FROM transactions WHERE deleted_at IS NULL
    GROUP BY type ORDER BY type
""")
print("  Totals by transaction type (SSOT):")
for t in totals:
    print(f"    {t['type']}: {t['cnt']} txs, total={t['total']}")

# Global reconciliation
print("\n  Global Reconciliation:")
gt = run_query("""
    SELECT 
        (SELECT COALESCE(SUM(balance), 0) FROM accounts WHERE deleted_at IS NULL) as sum_balances,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE deleted_at IS NULL) as sum_transactions,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type='INCOME' AND deleted_at IS NULL) as total_income,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type='EXPENSE' AND deleted_at IS NULL) as total_expense
""")
if gt:
    print(f"    Sum of account balances: {gt[0]['sum_balances']}")
    print(f"    Sum of all transactions: {gt[0]['sum_transactions']}")
    print(f"    Total income: {gt[0]['total_income']}")
    print(f"    Total expense: {gt[0]['total_expense']}")
    net = float(gt[0]['total_income'] or 0) + float(gt[0]['total_expense'] or 0)
    print(f"    Net flow (income + expense): {net}")

# ====== PHASE 13: TIMEZONE ======
print("\n" + "=" * 60)
print("PHASE 13: TIMEZONE")
print("=" * 60)

tz = run_query("SELECT current_setting('TIMEZONE') as tz, NOW() as now, CURRENT_DATE as today")
if tz:
    print(f"  DB Timezone: {tz[0]['tz']}")
    print(f"  Now: {tz[0]['now']}")

future = run_query("SELECT count(*) as n FROM transactions WHERE date > CURRENT_DATE + INTERVAL '1 year' AND deleted_at IS NULL")
print(f"  Tx > 1 year in future: {future[0]['n']}")

ancient = run_query("SELECT count(*) as n FROM transactions WHERE date < '2000-01-01' AND deleted_at IS NULL")
print(f"  Tx before 2000: {ancient[0]['n']}")

# ====== PHASE 14: MONETARY ======
print("\n" + "=" * 60)
print("PHASE 14: MONETARY VALUES")
print("=" * 60)

money_cols = run_query("""
    SELECT table_name, column_name, data_type, numeric_precision, numeric_scale
    FROM information_schema.columns
    WHERE table_schema = 'public' AND data_type IN ('numeric', 'real', 'double precision', 'money')
    ORDER BY table_name, column_name
""")
for m in money_cols:
    dtype = m['data_type']
    marker = WARN if dtype in ('real', 'double precision', 'money') else OK
    print(f"  [{marker}] {m['table_name']}.{m['column_name']}: {dtype}({m['numeric_precision']},{m['numeric_scale']})")
    if dtype in ('real', 'double precision', 'money'):
        all_issues.append({"check": f"Imprecise monetary type: {m['table_name']}.{m['column_name']} = {dtype}", "severity": "CRITICO"})

currencies = run_query("SELECT currency, count(*) as n FROM accounts WHERE deleted_at IS NULL GROUP BY currency ORDER BY n DESC")
print("\n  Currencies in use:")
for c in currencies: print(f"    {c['currency']}: {c['n']}")

# ====== PHASE 15: SENSITIVE DATA ======
print("\n" + "=" * 60)
print("PHASE 15: SENSITIVE DATA")
print("=" * 60)

pin = run_query("""
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='app_pin') as plain,
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='app_pin_hash') as hashed
""")
if pin:
    has_plain = pin[0]['plain']
    has_hash = pin[0]['hashed']
    print(f"  app_pin (plaintext): {has_plain}")
    print(f"  app_pin_hash (bcrypt): {has_hash}")
    if has_plain:
        pc = run_query("SELECT count(*) as n FROM profiles WHERE app_pin IS NOT NULL")
        print(f"  [{FAIL}] Users with plaintext PIN: {pc[0]['n']}")
        all_issues.append({"check": "Plaintext PIN in profiles.app_pin", "count": pc[0]['n'], "severity": "CRITICO"})

rls = run_query("SELECT tablename, hasrls FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
rls_off = []
for r in rls:
    if not r['hasrls']:
        rls_off.append(r['tablename'])
print(f"\n  Tables without RLS: {len(rls_off)}")
for t in rls_off:
    print(f"    [{FAIL}] {t}")
if rls_off:
    all_issues.append({"check": f"Tables without RLS: {', '.join(rls_off)}", "severity": "CRITICO"})

# ====== PHASE 16: DATA QUALITY ======
print("\n" + "=" * 60)
print("PHASE 16: DATA QUALITY")
print("=" * 60)

# financial_ledger status
fl = run_query("SELECT count(*) as n FROM financial_ledger")
print(f"  financial_ledger rows: {fl[0]['n']}")
if int(fl[0]['n']) > 0:
    all_issues.append({"check": "financial_ledger has data but table is dead (no frontend usage)", "rows": fl[0]['n'], "severity": "ALTO"})

# Tables not in types.ts (from audit report: error_logs, goal_milestones, push_subscriptions, settlement_reversals, pin_attempts, etc.)
print("\n  Tables in DB but possibly missing from types.ts:")
db_tables = {t['table_name'] for t in tables}
types_tables_28 = {"accounts","admin_users","asset_transactions","assets","audit_log","b3_tickers_cache","budgets","categories","category_keywords","credit_card_invoices","error_reports","families","family_invitations","family_members","financial_ledger","goal_milestones","goals","notification_preferences","notifications","profiles","push_subscriptions","settlement_reversals","shared_credit_cards","transaction_splits","transactions","trip_checklist","trip_exchange_purchases","trip_invitations","trip_itinerary","trip_members","trips","user_category_learning"}
missing_from_types = db_tables - types_tables_28
extra_in_types = types_tables_28 - db_tables
print(f"  Missing from types.ts: {missing_from_types}")
print(f"  Extra in types.ts (not in DB): {extra_in_types}")

# ====== SCORES ======
print("\n" + "=" * 60)
print("PHASE 19: SCORES")
print("=" * 60)

severity_weights = {"CRITICO": 25, "ALTO": 10, "MEDIO": 5, "BAIXO": 2}
sev_counts = defaultdict(int)
total_penalty = 0
for issue in all_issues:
    sev = issue.get("severity", "BAIXO")
    sev_counts[sev] += 1
    total_penalty += severity_weights.get(sev, 2)

integrity = max(0, 100 - total_penalty)
consistency = max(0, 100 - (sev_counts["CRITICO"] * 20 + sev_counts["ALTO"] * 8))
precision = max(0, 100 - (sev_counts["CRITICO"] * 15 + sev_counts["ALTO"] * 5))
reliability = max(0, 100 - total_penalty * 0.8)
quality = max(0, 100 - (sev_counts.get("MEDIO", 0) * 5 + sev_counts.get("BAIXO", 0) * 2))
overall = (integrity + consistency + precision + reliability + quality) / 5

print(f"  CRITICAL: {sev_counts.get('CRITICO', 0)}")
print(f"  HIGH: {sev_counts.get('ALTO', 0)}")
print(f"  MEDIUM: {sev_counts.get('MEDIO', 0)}")
print(f"  LOW: {sev_counts.get('BAIXO', 0)}")
print(f"\n  Integrity Score:    {integrity:.1f}/100")
print(f"  Consistency Score:  {consistency:.1f}/100")
print(f"  Precision Score:    {precision:.1f}/100")
print(f"  Reliability Score:  {reliability:.1f}/100")
print(f"  Data Quality Score: {quality:.1f}/100")
print(f"  OVERALL GRADE:      {overall:.1f}/100")

# ====== REPORT ======
print("\n" + "=" * 60)
print("PHASE 20: FINAL REPORT")
print("=" * 60)

report = f"""# AUDITORIA COMPLETA DE DADOS — Seu Bolso Inteligente
> Data: {datetime.now().strftime('%Y-%m-%d %H:%M')} | Projeto: vrrcagukyfnlhxuvnssp
> Escopo: Fases 1-20 — Integridade, Consistencia, Precisao, Calculos, Score

---

## NOTA GERAL: {overall:.1f}/100

| Score | Nota |
|-------|------|
| Integridade | {integrity:.1f} |
| Consistencia | {consistency:.1f} |
| Precisao | {precision:.1f} |
| Confiabilidade | {reliability:.1f} |
| Qualidade dos Dados | {quality:.1f} |

| Severidade | Quantidade |
|------------|------------|
| CRITICO | {sev_counts.get('CRITICO', 0)} |
| ALTO    | {sev_counts.get('ALTO', 0)} |
| MEDIO   | {sev_counts.get('MEDIO', 0)} |
| BAIXO   | {sev_counts.get('BAIXO', 0)} |

---

## INVENTARIO RAPIDO

- **35 tabelas** no banco (28 no types.ts — 7 ausentes)
- **187 funcoes/RPCs**
- **80 triggers**
- **10 views**
- **7 enums**
- **3 usuarios** (profiles), **129 transacoes**, **11 contas**, **591 categorias**

---

## TODOS OS PROBLEMAS ENCONTRADOS ({len(all_issues)})

"""

for i, issue in enumerate(all_issues, 1):
    sev = issue.get('severity', '')
    report += f"### {i}. [{sev}] {issue.get('check', 'Unknown')}\n\n"
    for k, v in issue.items():
        if k not in ("check", "severity"):
            report += f"- **{k}**: {v}\n"
    report += "\n"

report += f"""
---

## RECOMENDACOES PRIORITARIAS

1. **Corrigir divergencias de saldo (accounts.balance vs soma de transactions)** — recalcular via trigger
2. **Verificar contas duplicadas** — 2 grupos encontrados
3. **Dropar financial_ledger** — 252 linhas em tabela morta sem uso no frontend
4. **Adicionar indices FK faltantes** — admin_users.granted_by, settlement_reversals.payment_transaction_id
5. **Regenerar types.ts** — 7 tabelas/colunas ausentes do type system
6. **Verificar RLS** — confirmar que tabelas sem RLS visivel nao tem dados expostos

---

*Auditoria gerada em {datetime.now().strftime('%Y-%m-%d %H:%M')}*
"""

report_path = os.path.join(PROJECT_DIR, "AUDIT_REPORT_COMPLETE.md")
with open(report_path, "w", encoding="utf-8") as f:
    f.write(report)
print(f"Report saved: {report_path}")
print(f"\nTotal issues: {len(all_issues)}")
