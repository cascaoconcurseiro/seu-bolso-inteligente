import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, description, amount, trip_id, domain, type')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

run();
