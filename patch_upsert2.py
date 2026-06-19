import sys

content = open('src/hooks/useSharedCreditCards.ts', 'r', encoding='utf-8').read()

old_mutation = '''      const { data, error } = await supabase
        .from("shared_credit_cards")
        .upsert({
          account_id: accountId,
          user_id: userId,
          status: 'PENDING',
        }, { onConflict: 'account_id,user_id' })
        .select()
        .single();'''

new_mutation = '''      // First check if it exists
      const { data: existing } = await supabase
        .from("shared_credit_cards")
        .select("id")
        .eq("account_id", accountId)
        .eq("user_id", userId)
        .maybeSingle();

      let data, error;
      
      if (existing) {
        const res = await supabase
          .from("shared_credit_cards")
          .update({ status: 'PENDING' })
          .eq("id", existing.id)
          .select()
          .single();
        data = res.data;
        error = res.error;
      } else {
        const res = await supabase
          .from("shared_credit_cards")
          .insert({
            account_id: accountId,
            user_id: userId,
            status: 'PENDING',
          })
          .select()
          .single();
        data = res.data;
        error = res.error;
      }'''

content = content.replace(old_mutation, new_mutation)

open('src/hooks/useSharedCreditCards.ts', 'w', encoding='utf-8').write(content)
print('Done!')
