const { createClient } = require('@supabase/supabase-js'); 
const supabase = createClient('https://vrrcagukyfnlhxuvnssp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycmNhZ3VreWZubGh4dXZuc3NwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcwMDg0NiwiZXhwIjoyMDgyMjc2ODQ2fQ.FrCVUHQ_4x0RCzpnNBFRRAfJj6_uezKJb2pNQ26xfiE'); 
async function main() { 
  const { data, error } = await supabase.rpc('get_shared_invoice_data', { p_user_id: 'd0551cfa-2384-4ec5-a0bc-30b5894b6387' }); 
  console.log(error ? error : JSON.stringify(data)); 
} 
main();
