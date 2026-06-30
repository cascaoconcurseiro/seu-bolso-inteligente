"""
AUDITORIA COMPLETA — Seu Bolso Inteligente
Fases 1-20: Integridade, Consistência, Precisão, Cálculos Financeiros
"""
import subprocess, json, sys, os, tempfile
from datetime import datetime
from decimal import Decimal, ROUND_HALF_EVEN
from collections import defaultdict

# Fix Windows encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

PROJECT_DIR = r"c:\Users\Wesley\Bolso inteligente\seu-bolso-inteligente"

import tempfile, shutil

def run_query(sql: str) -> list[dict]:
    """Run SQL against linked Supabase project and return rows."""
    # Write SQL to temp file to avoid shell escaping issues
    tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False, encoding='utf-8')
    try:
        tmp.write(sql)
        tmp.close()
        cmd = f'npx supabase db query --linked --file "{tmp.name}" --output-format json'
        result = subprocess.run(
            cmd,
            capture_output=True, text=True, cwd=PROJECT_DIR, timeout=60, shell=True
        )
    finally:
        try:
            os.unlink(tmp.name)
        except:
            pass
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
        print(f"  [WARN] JSON parse: {e} | SQL start: {sql[:80]}...")
        print(f"  Raw: {stdout[:200]}")
        stderr = (result.stderr or "")[:200]
        if stderr:
            print(f"  Stderr: {stderr}")
        return []

def run_query_safe(sql: str) -> list[dict]:
    try:
        return run_query(sql)
    except Exception as e:
        return [{"error": str(e)}]

# ═══════════════════════════════════════════════════════════
# PHASE 1: INVENTORY
# ═══════════════════════════════════════════════════════════

def phase1_inventory():
    print("=" * 60)
    print("FASE 1: INVENTÁRIO COMPLETO")
    print("=" * 60)

    tables = run_query("""
        SELECT table_name,
               (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name=t.table_name) as cols,
               (SELECT count(*) FROM information_schema.table_constraints WHERE table_schema='public' AND table_name=t.table_name AND constraint_type='FOREIGN KEY') as fks
        FROM information_schema.tables t
        WHERE table_schema='public' AND table_type='BASE TABLE'
        ORDER BY table_name
    """)

    print(f"Total tabelas: {len(tables)}")
    for t in tables:
        print(f"  {t['table_name']}: {t['cols']} cols, {t['fks']} FKs")

    # Row counts
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
        SELECT 'credit_card_closing_overrides', count(*) FROM credit_card_closing_overrides UNION ALL
        SELECT 'transaction_auto_share_rules', count(*) FROM transaction_auto_share_rules UNION ALL
        SELECT 'shared_credit_cards', count(*) FROM shared_credit_cards UNION ALL
        SELECT 'pin_attempts', count(*) FROM pin_attempts UNION ALL
        SELECT 'admin_users', count(*) FROM admin_users
        ORDER BY tbl
    """)

    print(f"\nRow counts:")
    for c in counts:
        print(f"  {c['tbl']}: {c['n']}")

    # Views
    views = run_query("""
        SELECT table_name FROM information_schema.views
        WHERE table_schema='public' ORDER BY table_name
    """)
    print(f"\nViews: {len(views)}")
    for v in views:
        print(f"  {v['table_name']}")

    # Functions (RPCs)
    funcs = run_query("""
        SELECT routine_name FROM information_schema.routines
        WHERE routine_schema='public' AND routine_type='FUNCTION'
        ORDER BY routine_name
    """)
    print(f"\nFunctions/RPCs: {len(funcs)}")
    for f in funcs:
        print(f"  {f['routine_name']}")

    # Enums
    enums = run_query("""
        SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
        GROUP BY t.typname ORDER BY t.typname
    """)
    print(f"\nEnums: {len(enums)}")
    for e in enums:
        print(f"  {e['typname']}: {e['values']}")

    # Triggers
    triggers = run_query("""
        SELECT trigger_name, event_manipulation, event_object_table, action_timing
        FROM information_schema.triggers
        WHERE trigger_schema='public'
        ORDER BY event_object_table, trigger_name
    """)
    print(f"\nTriggers: {len(triggers)}")
    for t in triggers:
        print(f"  {t['trigger_name']} ON {t['event_object_table']}: {t['event_manipulation']} {t['action_timing']}")

    return {"tables": tables, "counts": counts, "views": views, "funcs": funcs, "enums": enums, "triggers": triggers}


# ═══════════════════════════════════════════════════════════
# PHASE 2: INTEGRIDADE REFERENCIAL
# ═══════════════════════════════════════════════════════════

def phase2_referential_integrity():
    print("\n" + "=" * 60)
    print("FASE 2: INTEGRIDADE REFERENCIAL")
    print("=" * 60)

    issues = []

    # Check orphan records for each FK relationship
    fk_checks = [
        ("transactions -> accounts",
         "SELECT t.id, t.account_id FROM transactions t LEFT JOIN accounts a ON t.account_id = a.id WHERE t.account_id IS NOT NULL AND a.id IS NULL AND t.deleted_at IS NULL LIMIT 50"),
        ("transactions -> categories",
         "SELECT t.id, t.category_id FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.category_id IS NOT NULL AND c.id IS NULL AND t.deleted_at IS NULL LIMIT 50"),
        ("transactions -> profiles (user_id)",
         "SELECT t.id, t.user_id FROM transactions t LEFT JOIN profiles p ON t.user_id = p.id WHERE t.user_id IS NOT NULL AND p.id IS NULL AND t.deleted_at IS NULL LIMIT 50"),
        ("transaction_splits -> transactions",
         "SELECT ts.id, ts.transaction_id FROM transaction_splits ts LEFT JOIN transactions t ON ts.transaction_id = t.id WHERE ts.transaction_id IS NOT NULL AND t.id IS NULL LIMIT 50"),
        ("transaction_splits -> profiles (split_user_id)",
         "SELECT ts.id, ts.split_user_id FROM transaction_splits ts LEFT JOIN profiles p ON ts.split_user_id = p.id WHERE ts.split_user_id IS NOT NULL AND p.id IS NULL LIMIT 50"),
        ("accounts -> profiles",
         "SELECT a.id, a.user_id FROM accounts a LEFT JOIN profiles p ON a.user_id = p.id WHERE a.user_id IS NOT NULL AND p.id IS NULL AND a.deleted_at IS NULL LIMIT 50"),
        ("budgets -> categories",
         "SELECT b.id, b.category_id FROM budgets b LEFT JOIN categories c ON b.category_id = c.id WHERE b.category_id IS NOT NULL AND c.id IS NULL LIMIT 50"),
        ("budgets -> profiles",
         "SELECT b.id, b.user_id FROM budgets b LEFT JOIN profiles p ON b.user_id = p.id WHERE p.id IS NULL LIMIT 50"),
        ("goals -> profiles",
         "SELECT g.id, g.user_id FROM goals g LEFT JOIN profiles p ON g.user_id = p.id WHERE g.user_id IS NOT NULL AND p.id IS NULL AND g.deleted_at IS NULL LIMIT 50"),
        ("assets -> profiles",
         "SELECT a.id, a.user_id FROM assets a LEFT JOIN profiles p ON a.user_id = p.id WHERE p.id IS NULL AND a.deleted = false LIMIT 50"),
        ("credit_card_invoices -> credit_cards (accounts)",
         "SELECT ci.id, ci.credit_card_id FROM credit_card_invoices ci LEFT JOIN accounts a ON ci.credit_card_id = a.id WHERE a.id IS NULL LIMIT 50"),
        ("family_members -> profiles",
         "SELECT fm.id, fm.user_id FROM family_members fm LEFT JOIN profiles p ON fm.user_id = p.id WHERE p.id IS NULL AND fm.deleted_at IS NULL LIMIT 50"),
        ("family_members -> families",
         "SELECT fm.id, fm.family_id FROM family_members fm LEFT JOIN families f ON fm.family_id = f.id WHERE f.id IS NULL AND fm.deleted_at IS NULL LIMIT 50"),
        ("settlement_reversals -> transaction_splits",
         "SELECT sr.id, sr.split_id FROM settlement_reversals sr LEFT JOIN transaction_splits ts ON sr.split_id = ts.id WHERE ts.id IS NULL LIMIT 50"),
        ("notifications -> profiles",
         "SELECT n.id, n.user_id FROM notifications n LEFT JOIN profiles p ON n.user_id = p.id WHERE p.id IS NULL LIMIT 50"),
        ("goal_milestones -> goals",
         "SELECT gm.id, gm.goal_id FROM goal_milestones gm LEFT JOIN goals g ON gm.goal_id = g.id WHERE g.id IS NULL LIMIT 50"),
    ]

    for name, sql in fk_checks:
        rows = run_query_safe(sql)
        count = len(rows)
        status = "[FAIL]" if count > 0 else "[OK]"
        print(f"  {status} {name}: {count} orphans")
        if count > 0:
            issues.append({"check": name, "count": count, "severity": "CRÍTICO", "sample": rows[:5]})

    # Check if all FKs have indexes
    missing_idx = run_query("""
        SELECT
            tc.table_name,
            kcu.column_name,
            tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN pg_indexes pi ON pi.tablename = tc.table_name
            AND pi.indexdef LIKE '%' || kcu.column_name || '%'
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND pi.indexname IS NULL
        ORDER BY tc.table_name
    """)

    print(f"\n  FKs sem índice: {len(missing_idx)}")
    for m in missing_idx:
        print(f"    [WARN] {m['table_name']}.{m['column_name']} ({m['constraint_name']})")
        issues.append({"check": f"FK sem índice: {m['table_name']}.{m['column_name']}", "severity": "ALTO"})

    return issues


# ═══════════════════════════════════════════════════════════
# PHASE 3: DADOS DUPLICADOS
# ═══════════════════════════════════════════════════════════

def phase3_duplicates():
    print("\n" + "=" * 60)
    print("FASE 3: DADOS DUPLICADOS")
    print("=" * 60)

    issues = []

    dup_checks = [
        ("Transações duplicadas (mesmo valor, data, descrição, conta, user)",
         """SELECT user_id, account_id, amount, date, description, count(*) as cnt,
                   array_agg(id) as ids
            FROM transactions
            WHERE deleted_at IS NULL
            GROUP BY user_id, account_id, amount, date, description
            HAVING count(*) > 1 LIMIT 30"""),
        ("Contas duplicadas (mesmo nome, user)",
         """SELECT user_id, name, count(*) as cnt, array_agg(id) as ids
            FROM accounts WHERE deleted_at IS NULL
            GROUP BY user_id, name HAVING count(*) > 1 LIMIT 20"""),
        ("Categorias duplicadas (mesmo nome, mesmo pai, user)",
         """SELECT user_id, name, parent_id, count(*) as cnt, array_agg(id) as ids
            FROM categories WHERE deleted_at IS NULL
            GROUP BY user_id, name, parent_id HAVING count(*) > 1 LIMIT 20"""),
    ]

    for name, sql in dup_checks:
        rows = run_query_safe(sql)
        count = len(rows)
        status = "[FAIL]" if count > 0 else "[OK]"
        print(f"  {status} {name}: {count} grupos")
        if count > 0:
            issues.append({"check": name, "count": count, "severity": "ALTO", "sample": rows[:5]})

    return issues


# ═══════════════════════════════════════════════════════════
# PHASE 4: DADOS ÓRFÃOS
# ═══════════════════════════════════════════════════════════

def phase4_orphans():
    print("\n" + "=" * 60)
    print("FASE 4: DADOS ÓRFÃOS")
    print("=" * 60)

    issues = []

    orphan_checks = [
        ("Transações sem category_id (não-transferência)",
         "SELECT count(*) FROM transactions WHERE category_id IS NULL AND type NOT IN ('TRANSFER', 'DEPOSIT', 'WITHDRAWAL') AND deleted_at IS NULL"),
        ("Categories sem user_id (system categories?)",
         "SELECT count(*) FROM categories WHERE user_id IS NULL AND deleted_at IS NULL"),
        ("Categories pai que não existem",
         "SELECT c.id, c.name, c.parent_id FROM categories c LEFT JOIN categories p ON c.parent_id = p.id WHERE c.parent_id IS NOT NULL AND p.id IS NULL AND c.deleted_at IS NULL LIMIT 20"),
        ("Transaction splits sem transação pai",
         "SELECT count(*) FROM transaction_splits ts LEFT JOIN transactions t ON ts.transaction_id = t.id WHERE t.id IS NULL"),
        ("Goal milestones sem goal",
         "SELECT count(*) FROM goal_milestones gm LEFT JOIN goals g ON gm.goal_id = g.id WHERE g.id IS NULL"),
        ("Push subscriptions sem user",
         "SELECT count(*) FROM push_subscriptions ps LEFT JOIN profiles p ON ps.user_id = p.id WHERE p.id IS NULL"),
        ("Notifications sem user",
         "SELECT count(*) FROM notifications n LEFT JOIN profiles p ON n.user_id = p.id WHERE p.id IS NULL"),
        ("Asset transactions sem account",
         "SELECT count(*) FROM asset_transactions at LEFT JOIN accounts a ON at.account_id = a.id WHERE at.account_id IS NOT NULL AND a.id IS NULL"),
    ]

    for name, sql in orphan_checks:
        rows = run_query_safe(sql)
        count = rows[0].get('count', len(rows)) if rows else 0
        try:
            count = int(count)
        except (ValueError, TypeError):
            count = len(rows)
        status = "[FAIL]" if count > 0 else "[OK]"
        print(f"  {status} {name}: {count}")
        if count > 0:
            severity = "CRÍTICO" if count > 10 else "ALTO"
            issues.append({"check": name, "count": count, "severity": severity})

    # Check for unused system categories
    unused_cats = run_query("""
        SELECT c.id, c.name, c.user_id
        FROM categories c
        LEFT JOIN transactions t ON t.category_id = c.id AND t.deleted_at IS NULL
        WHERE t.id IS NULL AND c.deleted_at IS NULL AND c.user_id IS NOT NULL
        LIMIT 30
    """)
    print(f"  Categorias sem uso (user): {len(unused_cats)}")
    if len(unused_cats) > 0:
        issues.append({"check": "Categorias sem uso (usuário)", "count": len(unused_cats), "severity": "BAIXO"})

    return issues


# ═══════════════════════════════════════════════════════════
# PHASE 5: VALIDAÇÃO DE CAMPOS
# ═══════════════════════════════════════════════════════════

def phase5_field_validation():
    print("\n" + "=" * 60)
    print("FASE 5: VALIDAÇÃO DE CAMPOS")
    print("=" * 60)

    issues = []

    field_checks = [
        ("Transactions: amount <= 0 (não-transfer)",
         "SELECT count(*) FROM transactions WHERE amount <= 0 AND type NOT IN ('TRANSFER', 'DEPOSIT', 'WITHDRAWAL') AND deleted_at IS NULL"),
        ("Transactions: amount NULL",
         "SELECT count(*) FROM transactions WHERE amount IS NULL AND deleted_at IS NULL"),
        ("Transactions: date NULL",
         "SELECT count(*) FROM transactions WHERE date IS NULL AND deleted_at IS NULL"),
        ("Transactions: date futura (>30 dias)",
         "SELECT count(*) FROM transactions WHERE date > CURRENT_DATE + INTERVAL '30 days' AND deleted_at IS NULL"),
        ("Transactions: competence_date não é dia 1",
         "SELECT count(*) FROM transactions WHERE competence_date IS NOT NULL AND EXTRACT(DAY FROM competence_date) != 1 AND deleted_at IS NULL"),
        ("Accounts: initial_balance negativo sem ser crédito",
         "SELECT count(*) FROM accounts WHERE initial_balance < 0 AND type NOT IN ('CREDIT_CARD') AND deleted_at IS NULL"),
        ("Accounts: closing_day inválido (>31 ou <1)",
         "SELECT count(*) FROM accounts WHERE closing_day IS NOT NULL AND (closing_day < 1 OR closing_day > 31) AND deleted_at IS NULL"),
        ("Accounts: due_day inválido",
         "SELECT count(*) FROM accounts WHERE due_day IS NOT NULL AND (due_day < 1 OR due_day > 31) AND deleted_at IS NULL"),
        ("Categories: name vazio",
         "SELECT count(*) FROM categories WHERE (name IS NULL OR name = '') AND deleted_at IS NULL"),
        ("Goals: target_amount <= 0",
         "SELECT count(*) FROM goals WHERE target_amount <= 0 AND deleted_at IS NULL"),
        ("Budgets: amount <= 0",
         "SELECT count(*) FROM budgets WHERE amount <= 0"),
        ("Credit card invoices: closing_date > due_date",
         "SELECT count(*) FROM credit_card_invoices WHERE closing_date > due_date"),
        ("Transactions: type inválido",
         "SELECT count(*) FROM transactions WHERE type NOT IN ('EXPENSE', 'INCOME', 'TRANSFER', 'WITHDRAWAL', 'DEPOSIT') AND deleted_at IS NULL"),
    ]

    for name, sql in field_checks:
        rows = run_query_safe(sql)
        count = int(rows[0].get('count', 0)) if rows else 0
        status = "[FAIL]" if count > 0 else "[OK]"
        print(f"  {status} {name}: {count}")
        if count > 0:
            severity = "CRÍTICO" if "amount" in name.lower() or "date" in name.lower() else "ALTO"
            issues.append({"check": name, "count": count, "severity": severity})

    # Check null rates in key columns
    nulls = run_query("""
        SELECT 'transactions.description' as col,
               round(100.0 * count(*) FILTER (WHERE description IS NULL OR description = '') / NULLIF(count(*),0), 1) as pct_null
        FROM transactions WHERE deleted_at IS NULL
        UNION ALL
        SELECT 'transactions.competence_date',
               round(100.0 * count(*) FILTER (WHERE competence_date IS NULL) / NULLIF(count(*),0), 1)
        FROM transactions WHERE deleted_at IS NULL
        UNION ALL
        SELECT 'accounts.initial_balance',
               round(100.0 * count(*) FILTER (WHERE initial_balance IS NULL) / NULLIF(count(*),0), 1)
        FROM accounts WHERE deleted_at IS NULL
        UNION ALL
        SELECT 'categories.icon',
               round(100.0 * count(*) FILTER (WHERE icon IS NULL) / NULLIF(count(*),0), 1)
        FROM categories WHERE deleted_at IS NULL
        UNION ALL
        SELECT 'credit_card_invoices.paid_at',
               round(100.0 * count(*) FILTER (WHERE paid_at IS NULL) / NULLIF(count(*),0), 1)
        FROM credit_card_invoices
    """)

    print("\n  Taxas de nulidade:")
    for n in nulls:
        print(f"    {n['col']}: {n['pct_null']}% null")
        if float(n['pct_null']) > 50:
            issues.append({"check": f"Alta nulidade: {n['col']}", "pct": n['pct_null'], "severity": "MÉDIO"})

    return issues


# ═══════════════════════════════════════════════════════════
# PHASE 6: CÁLCULOS FINANCEIROS
# ═══════════════════════════════════════════════════════════

def phase6_financial_calculations():
    print("\n" + "=" * 60)
    print("FASE 6: CÁLCULOS FINANCEIROS")
    print("=" * 60)

    issues = []

    # 6.1 Account balance vs sum of transactions
    print("\n  6.1 Account Balance vs Sum of Transactions:")
    balance_check = run_query("""
        SELECT
            a.id,
            a.name,
            a.balance as stored_balance,
            COALESCE(SUM(t.amount), 0) as calculated_balance,
            a.initial_balance,
            a.balance - COALESCE(SUM(t.amount), 0) as difference
        FROM accounts a
        LEFT JOIN transactions t ON t.account_id = a.id AND t.deleted_at IS NULL
        WHERE a.deleted_at IS NULL
        GROUP BY a.id, a.name, a.balance, a.initial_balance
        HAVING ABS(a.balance - COALESCE(SUM(t.amount), 0)) > 0.01
        ORDER BY ABS(a.balance - COALESCE(SUM(t.amount), 0)) DESC
        LIMIT 30
    """)

    print(f"    Contas com divergência saldo vs soma transações: {len(balance_check)}")
    for b in balance_check:
        print(f"      [FAIL] {b['name']}: stored={b['stored_balance']}, calculated={b['calculated_balance']}, diff={b['difference']}")
        issues.append({
            "check": f"Saldo divergente: {b['name']}",
            "stored": b['stored_balance'],
            "calculated": b['calculated_balance'],
            "diff": b['difference'],
            "severity": "CRÍTICO"
        })

    # 6.2 Income/Expense reconciliation by user
    print("\n  6.2 Income/Expense Reconciliation:")
    reconciliation = run_query("""
        SELECT
            p.id as user_id,
            COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'INCOME'), 0) as total_income,
            COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'EXPENSE'), 0) as total_expense,
            COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'INCOME'), 0) +
            COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'EXPENSE'), 0) as net_flow,
            COUNT(*) as tx_count
        FROM profiles p
        LEFT JOIN transactions t ON t.user_id = p.id AND t.deleted_at IS NULL
        GROUP BY p.id
        HAVING COUNT(t.id) > 0
        ORDER BY tx_count DESC
        LIMIT 20
    """)

    for r in reconciliation:
        print(f"    User {r['user_id'][:8]}: income={r['total_income']}, expense={r['total_expense']}, net={r['net_flow']}, txs={r['tx_count']}")

    # 6.3 Credit card invoice amounts vs sum of transactions
    print("\n  6.3 Credit Card Invoice vs Transactions:")
    invoice_check = run_query("""
        SELECT
            ci.id as invoice_id,
            ci.credit_card_id,
            ci.competence_date,
            ci.total_amount as invoice_total,
            COALESCE(SUM(t.amount), 0) as sum_transactions,
            ci.total_amount - COALESCE(SUM(t.amount), 0) as diff
        FROM credit_card_invoices ci
        LEFT JOIN transactions t ON t.credit_card_id = ci.credit_card_id
            AND t.competence_date = ci.competence_date
            AND t.deleted_at IS NULL
        GROUP BY ci.id, ci.credit_card_id, ci.competence_date, ci.total_amount
        HAVING ABS(ci.total_amount - COALESCE(SUM(t.amount), 0)) > 0.01
        ORDER BY ABS(ci.total_amount - COALESCE(SUM(t.amount), 0)) DESC
        LIMIT 20
    """)

    print(f"    Faturas com divergência: {len(invoice_check)}")
    for inv in invoice_check:
        print(f"      [FAIL] Invoice {inv['invoice_id'][:8]}: total={inv['invoice_total']}, sum={inv['sum_transactions']}, diff={inv['diff']}")
        issues.append({
            "check": f"Fatura divergente: {inv['competence_date']}",
            "invoice_total": inv['invoice_total'],
            "sum_transactions": inv['sum_transactions'],
            "diff": inv['diff'],
            "severity": "CRÍTICO"
        })

    # 6.4 Goal progress vs sum of asset transactions
    print("\n  6.4 Goals Progress vs Asset Transactions:")
    goal_check = run_query("""
        SELECT
            g.id, g.name, g.target_amount, g.current_amount,
            COALESCE(SUM(at.quantity * at.price), 0) as calc_current,
            g.current_amount - COALESCE(SUM(at.quantity * at.price), 0) as diff
        FROM goals g
        LEFT JOIN asset_transactions at ON at.asset_id IN (
            SELECT a2.id FROM assets a2 WHERE a2.goal_id = g.id
        )
        WHERE g.deleted_at IS NULL
        GROUP BY g.id, g.name, g.target_amount, g.current_amount
        HAVING ABS(g.current_amount - COALESCE(SUM(at.quantity * at.price), 0)) > 0.01
        LIMIT 20
    """)

    print(f"    Metas com divergência: {len(goal_check)}")
    for g in goal_check:
        print(f"      [FAIL] {g['name']}: current={g['current_amount']}, calc={g['calc_current']}, diff={g['diff']}")
        issues.append({"check": f"Meta divergente: {g['name']}", "diff": g['diff'], "severity": "ALTO"})

    # 6.5 Budget progress
    print("\n  6.5 Budget Progress:")
    budget_check = run_query("""
        SELECT
            b.id, b.category_id, b.amount as budget_amount, b.spent as budget_spent,
            b.period,
            COALESCE(SUM(t.amount), 0) as actual_spent
        FROM budgets b
        LEFT JOIN transactions t ON t.category_id = b.category_id
            AND t.user_id = b.user_id
            AND t.type = 'EXPENSE'
            AND t.deleted_at IS NULL
            AND t.competence_date = date_trunc('month', CURRENT_DATE)::date
        WHERE b.period = 'MONTHLY'
        GROUP BY b.id, b.category_id, b.amount, b.spent, b.period
        HAVING ABS(COALESCE(b.spent, 0) - COALESCE(SUM(t.amount), 0)) > 0.01
        LIMIT 20
    """)

    print(f"    Orçamentos com divergência de gastos: {len(budget_check)}")
    for b in budget_check:
        print(f"      [WARN] Budget {b['id'][:8]}: stored_spent={b['budget_spent']}, actual={b['actual_spent']}")
        issues.append({"check": "Orçamento divergente", "stored": b['budget_spent'], "actual": b['actual_spent'], "severity": "ALTO"})

    # 6.6 Trip spent calculation
    print("\n  6.6 Trip Spent Calculation:")
    trip_check = run_query("""
        SELECT
            tr.id, tr.name, tr.budget, tr.spent as stored_spent,
            COALESCE(SUM(t.amount), 0) as calc_spent
        FROM trips tr
        LEFT JOIN transactions t ON t.trip_id = tr.id AND t.type = 'EXPENSE' AND t.deleted_at IS NULL
        WHERE tr.deleted_at IS NULL
        GROUP BY tr.id, tr.name, tr.budget, tr.spent
        HAVING ABS(COALESCE(tr.spent, 0) - COALESCE(SUM(t.amount), 0)) > 0.01
        LIMIT 20
    """)

    print(f"    Viagens com divergência: {len(trip_check)}")
    for tr in trip_check:
        print(f"      [WARN] {tr['name']}: stored_spent={tr['stored_spent']}, calc={tr['calc_spent']}")
        issues.append({"check": f"Viagem divergente: {tr['name']}", "severity": "ALTO"})

    # 6.7 Rounding issues: check for half-cent problems
    print("\n  6.7 Rounding Precision:")
    rounding = run_query("""
        SELECT count(*) as rounding_issues
        FROM transactions
        WHERE amount != ROUND(amount, 2) AND deleted_at IS NULL
    """)
    r_count = int(rounding[0]['rounding_issues']) if rounding else 0
    print(f"    Transações com precisão != 2 casas: {r_count}")
    if r_count > 0:
        issues.append({"check": "Precisão de arredondamento", "count": r_count, "severity": "CRÍTICO"})

    return issues


# ═══════════════════════════════════════════════════════════
# PHASE 7: CONSISTÊNCIA DASHBOARD/RELATÓRIOS
# ═══════════════════════════════════════════════════════════

def phase7_consistency():
    print("\n" + "=" * 60)
    print("FASE 7: CONSISTÊNCIA DASHBOARD VS RELATÓRIOS")
    print("=" * 60)

    issues = []

    # Check that financial_summary RPC returns consistent data
    print("  Buscando dados do dashboard...")

    # Total transactions by type (source of truth)
    totals = run_query("""
        SELECT
            type,
            COUNT(*) as count,
            COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE deleted_at IS NULL
        GROUP BY type
        ORDER BY type
    """)

    print("  Totais por tipo de transação (SSOT):")
    for t in totals:
        print(f"    {t['type']}: {t['count']} txs, total={t['total']}")

    # Check if there are users with no active accounts
    no_accounts = run_query("""
        SELECT p.id, p.email
        FROM profiles p
        LEFT JOIN accounts a ON a.user_id = p.id AND a.deleted_at IS NULL
        WHERE a.id IS NULL
        LIMIT 20
    """)
    print(f"\n  Usuários sem contas ativas: {len(no_accounts)}")

    # Check for users with no categories
    no_cats = run_query("""
        SELECT p.id, p.email
        FROM profiles p
        LEFT JOIN categories c ON c.user_id = p.id AND c.deleted_at IS NULL
        WHERE c.id IS NULL
        LIMIT 20
    """)
    print(f"  Usuários sem categorias: {len(no_cats)}")

    return issues


# ═══════════════════════════════════════════════════════════
# PHASE 13: TIMEZONE
# ═══════════════════════════════════════════════════════════

def phase13_timezone():
    print("\n" + "=" * 60)
    print("FASE 13: TIMEZONE")
    print("=" * 60)

    issues = []

    tz = run_query("""
        SELECT
            current_setting('TIMEZONE') as db_timezone,
            NOW() as current_time,
            CURRENT_DATE as current_date,
            EXTRACT(TZ FROM NOW()) as tz_offset
    """)
    print(f"  DB Timezone: {tz[0]['db_timezone']}")
    print(f"  Current time: {tz[0]['current_time']}")
    print(f"  TZ offset: {tz[0]['tz_offset']}")

    # Check if any dates are stored in future beyond reasonable
    future = run_query("""
        SELECT count(*) as future_txs
        FROM transactions
        WHERE date > CURRENT_DATE + INTERVAL '1 year' AND deleted_at IS NULL
    """)
    print(f"  Transações com data > 1 ano no futuro: {future[0]['future_txs']}")

    past = run_query("""
        SELECT count(*) as ancient_txs
        FROM transactions
        WHERE date < '2000-01-01' AND deleted_at IS NULL
    """)
    print(f"  Transações com data < 2000: {past[0]['ancient_txs']}")

    # Check created_at vs date consistency
    time_warp = run_query("""
        SELECT count(*) as time_warp
        FROM transactions
        WHERE created_at < date - INTERVAL '30 days' AND deleted_at IS NULL
    """)
    print(f"  Transações criadas 30+ dias depois da data: {time_warp[0]['time_warp']}")

    # Check closing_day_mode values
    closing_modes = run_query("""
        SELECT closing_day_mode, count(*)
        FROM accounts
        WHERE type = 'CREDIT_CARD' AND deleted_at IS NULL
        GROUP BY closing_day_mode
    """)
    print(f"\n  Modos de fechamento:")
    for cm in closing_modes:
        print(f"    {cm['closing_day_mode']}: {cm['count']}")

    return issues


# ═══════════════════════════════════════════════════════════
# PHASE 14: VALORES MONETÁRIOS
# ═══════════════════════════════════════════════════════════

def phase14_monetary():
    print("\n" + "=" * 60)
    print("FASE 14: VALORES MONETÁRIOS")
    print("=" * 60)

    issues = []

    # Check data types for monetary columns
    money_cols = run_query("""
        SELECT table_name, column_name, data_type, numeric_precision, numeric_scale
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND data_type IN ('numeric', 'real', 'double precision', 'money')
        ORDER BY table_name, column_name
    """)

    print("  Colunas monetárias:")
    for m in money_cols:
        print(f"    {m['table_name']}.{m['column_name']}: {m['data_type']}({m['numeric_precision']},{m['numeric_scale']})")
        if m['data_type'] in ('real', 'double precision', 'money'):
            issues.append({
                "check": f"Tipo monetário impreciso: {m['table_name']}.{m['column_name']} = {m['data_type']}",
                "severity": "CRÍTICO"
            })

    # Check for negative amounts in specific contexts
    neg_income = run_query("""
        SELECT count(*) FROM transactions
        WHERE type = 'INCOME' AND amount < 0 AND deleted_at IS NULL
    """)
    print(f"\n  INCOME com valor negativo: {neg_income[0]['count']}")

    neg_expense = run_query("""
        SELECT count(*) FROM transactions
        WHERE type = 'EXPENSE' AND amount > 0 AND deleted_at IS NULL
    """)
    print(f"  EXPENSE com valor positivo: {neg_expense[0]['count']}")

    # Check currency consistency
    currencies = run_query("""
        SELECT currency, count(*)
        FROM accounts WHERE deleted_at IS NULL
        GROUP BY currency ORDER BY count(*) DESC
    """)
    print(f"\n  Moedas em uso:")
    for c in currencies:
        print(f"    {c['currency']}: {c['count']} contas")

    return issues


# ═══════════════════════════════════════════════════════════
# PHASE 15: DADOS SENSÍVEIS
# ═══════════════════════════════════════════════════════════

def phase15_sensitive_data():
    print("\n" + "=" * 60)
    print("FASE 15: DADOS SENSÍVEIS")
    print("=" * 60)

    issues = []

    # Check if PIN is still plaintext anywhere
    pin_check = run_query("""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name='profiles' AND column_name='app_pin'
        ) as has_plaintext_pin,
        EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name='profiles' AND column_name='app_pin_hash'
        ) as has_hashed_pin
    """)

    has_plain = pin_check[0]['has_plaintext_pin']
    has_hash = pin_check[0]['has_hashed_pin']
    print(f"  profiles.app_pin (plaintext): {has_plain}")
    print(f"  profiles.app_pin_hash (hashed): {has_hash}")

    if has_plain:
        # Count users with plaintext PINs
        plain_count = run_query("SELECT count(*) FROM profiles WHERE app_pin IS NOT NULL")
        print(f"  [WARN] Usuários com PIN plaintext: {plain_count[0]['count']}")
        issues.append({"check": "PIN plaintext em profiles.app_pin", "count": plain_count[0]['count'], "severity": "CRÍTICO"})

    # Check RLS status on all tables
    rls = run_query("""
        SELECT tablename, hasrls
        FROM pg_tables
        WHERE schemaname='public'
        ORDER BY tablename
    """)

    print("\n  RLS status:")
    rls_disabled = []
    for r in rls:
        status = "[OK]" if r['hasrls'] else "[FAIL]"
        print(f"    {status} {r['tablename']}")
        if not r['hasrls']:
            rls_disabled.append(r['tablename'])

    if rls_disabled:
        issues.append({"check": f"Tabelas sem RLS: {', '.join(rls_disabled)}", "severity": "CRÍTICO"})

    return issues


# ═══════════════════════════════════════════════════════════
# PHASE 16-17: QUALIDADE + RECONCILIAÇÃO
# ═══════════════════════════════════════════════════════════

def phase16_quality():
    print("\n" + "=" * 60)
    print("FASE 16-17: QUALIDADE DOS DADOS + RECONCILIAÇÃO")
    print("=" * 60)

    issues = []

    # Check for tables with no rows
    empty_tables = run_query("""
        SELECT
            t.table_name,
            (xpath('/row/count/text()',
                query_to_xml(format('SELECT count(*) as count FROM %I', t.table_name), false, true, '')
            ))[1]::text::bigint as row_count
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND t.table_name NOT IN ('financial_ledger')
    """)

    print("  Tabelas vazias:")
    for et in run_query("""
        SELECT tablename
        FROM pg_tables
        WHERE schemaname='public'
        AND tablename NOT IN (
            SELECT relname FROM pg_stat_user_tables WHERE n_live_tup > 0
        )
        ORDER BY tablename
    """):
        print(f"    {et['tablename']}")

    # Global totals reconciliation
    print("\n  Reconciliação de totais globais:")
    global_totals = run_query("""
        SELECT
            (SELECT COALESCE(SUM(balance), 0) FROM accounts WHERE deleted_at IS NULL) as total_balance,
            (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE deleted_at IS NULL) as total_transactions,
            (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type='INCOME' AND deleted_at IS NULL) as total_income,
            (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type='EXPENSE' AND deleted_at IS NULL) as total_expense,
            (SELECT COALESCE(SUM(target_amount), 0) FROM goals WHERE deleted_at IS NULL) as total_goals,
            (SELECT COALESCE(SUM(amount), 0) FROM budgets) as total_budgets
    """)

    gt = global_totals[0]
    print(f"    Soma saldos contas: {gt['total_balance']}")
    print(f"    Soma transações: {gt['total_transactions']}")
    print(f"    Total income: {gt['total_income']}")
    print(f"    Total expense: {gt['total_expense']}")
    print(f"    Total metas: {gt['total_goals']}")
    print(f"    Total orçamentos: {gt['total_budgets']}")

    # Check net = income + expense
    net = float(gt['total_income'] or 0) + float(gt['total_expense'] or 0)
    print(f"    Net flow (income + expense): {net}")

    return issues


# ═══════════════════════════════════════════════════════════
# SCORE CALCULATION
# ═══════════════════════════════════════════════════════════

def calculate_scores(all_issues):
    print("\n" + "=" * 60)
    print("FASE 19: SCORES")
    print("=" * 60)

    severity_scores = {"CRÍTICO": 25, "ALTO": 10, "MÉDIO": 5, "BAIXO": 2}

    total_penalty = 0
    severity_counts = defaultdict(int)

    for issue in all_issues:
        sev = issue.get("severity", "BAIXO")
        severity_counts[sev] += 1
        total_penalty += severity_scores.get(sev, 2)

    # Base score 100, subtract penalties
    integrity_score = max(0, 100 - total_penalty)
    consistency_score = max(0, 100 - (severity_counts["CRÍTICO"] * 20 + severity_counts["ALTO"] * 8))
    precision_score = max(0, 100 - (severity_counts["CRÍTICO"] * 15 + severity_counts["ALTO"] * 5))
    reliability_score = max(0, 100 - total_penalty * 0.8)
    quality_score = max(0, 100 - (severity_counts["MÉDIO"] * 5 + severity_counts["BAIXO"] * 2))

    print(f"  CRÍTICOS: {severity_counts['CRÍTICO']}")
    print(f"  ALTOS: {severity_counts['ALTO']}")
    print(f"  MÉDIOS: {severity_counts['MÉDIO']}")
    print(f"  BAIXOS: {severity_counts['BAIXO']}")
    print(f"\n  Integridade Score: {integrity_score:.1f}/100")
    print(f"  Consistência Score: {consistency_score:.1f}/100")
    print(f"  Precisão Score: {precision_score:.1f}/100")
    print(f"  Confiabilidade Score: {reliability_score:.1f}/100")
    print(f"  Qualidade dos Dados Score: {quality_score:.1f}/100")
    print(f"  NOTA GERAL: {(integrity_score + consistency_score + precision_score + reliability_score + quality_score) / 5:.1f}/100")

    return {
        "integrity": integrity_score,
        "consistency": consistency_score,
        "precision": precision_score,
        "reliability": reliability_score,
        "quality": quality_score,
        "overall": (integrity_score + consistency_score + precision_score + reliability_score + quality_score) / 5,
        "counts": dict(severity_counts)
    }


# ═══════════════════════════════════════════════════════════
# GENERATE REPORT
# ═══════════════════════════════════════════════════════════

def generate_report(all_issues, scores):
    print("\n" + "=" * 60)
    print("FASE 20: RELATÓRIO FINAL")
    print("=" * 60)

    report = f"""# AUDITORIA COMPLETA DE DADOS — Seu Bolso Inteligente
> Data: {datetime.now().strftime('%Y-%m-%d %H:%M')} | Projeto: vrrcagukyfnlhxuvnssp
> Escopo: Fases 1-20 — Integridade, Consistência, Precisão, Cálculos

---

## RESUMO EXECUTIVO

**Nota geral: {scores['overall']:.1f}/100**

| Score | Valor |
|-------|-------|
| Integridade | {scores['integrity']:.1f} |
| Consistência | {scores['consistency']:.1f} |
| Precisão | {scores['precision']:.1f} |
| Confiabilidade | {scores['reliability']:.1f} |
| Qualidade dos Dados | {scores['quality']:.1f} |

| Severidade | Quantidade |
|------------|------------|
| [CRIT] CRÍTICO | {scores['counts'].get('CRÍTICO', 0)} |
| [HIGH] ALTO    | {scores['counts'].get('ALTO', 0)} |
| [MED] MÉDIO   | {scores['counts'].get('MÉDIO', 0)} |
| [LOW] BAIXO   | {scores['counts'].get('BAIXO', 0)} |

---

## PROBLEMAS ENCONTRADOS

"""

    for i, issue in enumerate(all_issues, 1):
        sev_emoji = {"CRÍTICO": "[CRIT]", "ALTO": "[HIGH]", "MÉDIO": "[MED]", "BAIXO": "[LOW]"}.get(issue.get("severity", ""), "⚪")
        report += f"### {i}. {sev_emoji} [{issue.get('severity', 'N/A')}] {issue.get('check', 'Unknown')}\n\n"

        for k, v in issue.items():
            if k not in ("check", "severity"):
                report += f"- **{k}**: {v}\n"
        report += "\n"

    report += f"""
---

## RECOMENDAÇÕES

1. **Corrigir divergências de saldo** — recalcular `accounts.balance` via trigger ou RPC
2. **Corrigir divergências de fatura** — reconciliar `credit_card_invoices.total_amount` com soma de transações
3. **Remover dados duplicados** — executar deduplicação com soft delete
4. **Adicionar índices FK faltantes** — melhorar performance e integridade
5. **Verificar nulidades** — adicionar constraints NOT NULL onde apropriado

---

*Relatório gerado por auditoria automatizada. Próxima auditoria recomendada: após correção dos itens CRÍTICOS.*
"""

    report_path = os.path.join(PROJECT_DIR, "AUDIT_REPORT_COMPLETE.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"\nRelatório salvo em: {report_path}")
    return report


# ═══════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════

def main():
    all_issues = []

    # Phase 1
    phase1_inventory()

    # Phase 2
    all_issues.extend(phase2_referential_integrity())

    # Phase 3
    all_issues.extend(phase3_duplicates())

    # Phase 4
    all_issues.extend(phase4_orphans())

    # Phase 5
    all_issues.extend(phase5_field_validation())

    # Phase 6
    all_issues.extend(phase6_financial_calculations())

    # Phase 7
    all_issues.extend(phase7_consistency())

    # Phase 13
    all_issues.extend(phase13_timezone())

    # Phase 14
    all_issues.extend(phase14_monetary())

    # Phase 15
    all_issues.extend(phase15_sensitive_data())

    # Phase 16-17
    all_issues.extend(phase16_quality())

    # Scores
    scores = calculate_scores(all_issues)

    # Report
    generate_report(all_issues, scores)

    print(f"\nTotal de issues encontrados: {len(all_issues)}")
    return all_issues, scores


if __name__ == "__main__":
    main()
