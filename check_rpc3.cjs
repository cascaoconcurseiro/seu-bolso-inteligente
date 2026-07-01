const { createClient } = require('@supabase/supabase-js'); 
const supabase = createClient('https://vrrcagukyfnlhxuvnssp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycmNhZ3VreWZubGh4dXZuc3NwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcwMDg0NiwiZXhwIjoyMDgyMjc2ODQ2fQ.FrCVUHQ_4x0RCzpnNBFRRAfJj6_uezKJb2pNQ26xfiE'); 
async function main() { 
  const { data } = await supabase.from('transactions').select('user_id').limit(1); 
  if (data.length > 0) { 
    const { data: d2 } = await supabase.rpc('get_shared_invoice_data', { p_user_id: data[0].user_id }); 
    const splits = d2?.transactions?.flatMap(t => t.transaction_splits) || [];
    const settled = splits.filter(s => s.settled_by_debtor || s.settled_by_creditor);
    console.log("Settled splits found:", settled.length);
    if(settled.length > 0) console.log(JSON.stringify(settled[0]));
  } 
} 
main();
