import sys

content = open('src/hooks/useAccounts.ts', 'r', encoding='utf-8').read()

old_query = '''      let query = supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name");

      if (!includeArchived) {
        query = query.is("is_archived", false); // Exclude archived by default
      }

      const { data, error } = await query;

      if (error) {
        logger.error("Erro ao buscar contas", error);
        throw error;
      }
      return data as Account[];'''

new_query = '''      let query = supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      const { data: ownAccounts, error } = await query;

      if (error) {
        logger.error("Erro ao buscar contas", error);
        throw error;
      }

      // Buscar cartões compartilhados onde o usuário atual foi convidado e aceitou
      const { data: sharedData, error: sharedError } = await supabase
        .from("shared_credit_cards")
        .select("accounts(*)")
        .eq("user_id", user.id)
        .eq("status", "ACCEPTED");

      let allAccounts = [...(ownAccounts || [])];
      
      if (sharedData && !sharedError) {
        const sharedAccounts = sharedData
          .map((sc: any) => sc.accounts)
          .filter(Boolean)
          // Assegurar que só adicione cartões que não estão deletados e estão ativos
          .filter((a: any) => a.is_active === true && a.deleted !== true);
        
        allAccounts = [...allAccounts, ...sharedAccounts];
      }

      if (!includeArchived) {
        allAccounts = allAccounts.filter(a => a.is_archived === false || a.is_archived === null || a.is_archived === undefined);
      }

      // Ordenar por nome
      allAccounts.sort((a, b) => a.name.localeCompare(b.name));

      return allAccounts as Account[];'''

content = content.replace(old_query, new_query)

open('src/hooks/useAccounts.ts', 'w', encoding='utf-8').write(content)
print('Done!')
