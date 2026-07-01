const { createClient } = require('@supabase/supabase-js'); 
const supabase = createClient('https://vrrcagukyfnlhxuvnssp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycmNhZ3VreWZubGh4dXZuc3NwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcwMDg0NiwiZXhwIjoyMDgyMjc2ODQ2fQ.FrCVUHQ_4x0RCzpnNBFRRAfJj6_uezKJb2pNQ26xfiE'); 
async function main() { 
  const { data } = await supabase.from('audit_logs').select('*').limit(1); 
  console.log('audit_logs:', data !== null ? 'exists' : 'does not exist');
  const { data: d2 } = await supabase.from('transactions_audit').select('*').limit(1); 
  console.log('transactions_audit:', d2 !== null ? 'exists' : 'does not exist');
} 
main();
