const { Client } = require('pg');

const connectionString = "postgres://postgres.vrrcagukyfnlhxuvnssp:QvEds5x3KcdnQhi2@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require";
const client = new Client({ connectionString });

async function resetData() {
  await client.connect();
  const userIds = "'56ccd60b-641f-4265-bc17-7b8705a2f8c9', '9545d0c1-94be-4b69-b110-f939bce072ee'";
  
  try {
    await client.query('BEGIN');
    console.log("Deleting transaction splits...");
    await client.query(`DELETE FROM transaction_splits WHERE transaction_id IN (SELECT id FROM transactions WHERE user_id IN (${userIds}))`);
    
    console.log("Deleting transactions...");
    await client.query(`DELETE FROM transactions WHERE user_id IN (${userIds})`);
    
    console.log("Deleting accounts...");
    await client.query(`DELETE FROM accounts WHERE user_id IN (${userIds})`);
    
    console.log("Deleting categories...");
    await client.query(`DELETE FROM categories WHERE user_id IN (${userIds})`);
    
    console.log("Deleting budgets...");
    await client.query(`DELETE FROM budgets WHERE user_id IN (${userIds})`);
    
    console.log("Deleting goals...");
    await client.query(`DELETE FROM goals WHERE user_id IN (${userIds})`);
    
    console.log("Deleting asset transactions...");
    await client.query(`DELETE FROM asset_transactions WHERE asset_id IN (SELECT id FROM assets WHERE user_id IN (${userIds}))`);
    
    console.log("Deleting assets...");
    await client.query(`DELETE FROM assets WHERE user_id IN (${userIds})`);
    
    console.log("Deleting trip checklist...");
    await client.query(`DELETE FROM trip_checklist WHERE trip_id IN (SELECT id FROM trips WHERE user_id IN (${userIds}))`);
    
    console.log("Deleting trip itinerary...");
    await client.query(`DELETE FROM trip_itinerary WHERE trip_id IN (SELECT id FROM trips WHERE user_id IN (${userIds}))`);
    
    console.log("Deleting trip exchange purchases...");
    await client.query(`DELETE FROM trip_exchange_purchases WHERE trip_id IN (SELECT id FROM trips WHERE user_id IN (${userIds}))`);
    
    console.log("Deleting trip members...");
    // Only delete trip members if the trip itself is owned by these users, OR if the user is a member of any trip. Let's delete where user_id matches
    await client.query(`DELETE FROM trip_members WHERE user_id IN (${userIds})`);
    
    console.log("Deleting trip invitations...");
    await client.query(`DELETE FROM trip_invitations WHERE inviter_id IN (${userIds}) OR invitee_email IN ('wesley.diaslima@gmail.com', 'francy.von@gmail.com')`);
    
    console.log("Deleting trips...");
    await client.query(`DELETE FROM trips WHERE user_id IN (${userIds})`);

    console.log("Deleting subscriptions...");
    await client.query(`DELETE FROM subscription WHERE user_id IN (${userIds})`);
    
    console.log("Deleting notifications...");
    await client.query(`DELETE FROM notifications WHERE user_id IN (${userIds})`);
    
    await client.query('COMMIT');
    console.log("Data reset successfully.");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error resetting data:", err);
  } finally {
    await client.end();
  }
}

resetData();
