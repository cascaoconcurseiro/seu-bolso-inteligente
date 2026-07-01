const { createClient } = require('@supabase/supabase-js'); 
const supabase = createClient('https://vrrcagukyfnlhxuvnssp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycmNhZ3VreWZubGh4dXZuc3NwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcwMDg0NiwiZXhwIjoyMDgyMjc2ODQ2fQ.FrCVUHQ_4x0RCzpnNBFRRAfJj6_uezKJb2pNQ26xfiE'); 
async function main() { 
  const { data, error } = await supabase.rpc('request_settlement', { p_split_ids: ['d252be9f-725b-46ea-a456-6ef43d68a44e'], p_account_id: '815b7d40-afae-4a85-b824-bffa00c778a3', p_user_id: '56ccd60b-641f-4265-bc17-7b8705a2f8c9', p_is_payment: true }); 
  console.log(error || data); 
} 
main();
