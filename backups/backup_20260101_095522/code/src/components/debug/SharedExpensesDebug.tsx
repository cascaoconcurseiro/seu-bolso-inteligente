/**
 * Componente de Debug para Despesas Compartilhadas
 * 
 * Adicione este componente temporariamente na página SharedExpenses
 * para ver exatamente o que está sendo retornado pelas queries
 */

import { useAuth } from "@/contexts/AuthContext";
import { useFamilyMembers } from "@/hooks/useFamily";
import { useSharedFinances } from "@/hooks/useSharedFinances";
import { useTrips } from "@/hooks/useTrips";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function SharedExpensesDebug() {
  const { user } = useAuth();
  const { data: members = [] } = useFamilyMembers();
  const { data: trips = [] } = useTrips();
  const { invoices, transactions } = useSharedFinances({
    currentDate: new Date(),
    activeTab: 'TRAVEL'
  });

  // Query direta para ver transações compartilhadas
  const { data: rawSharedTransactions } = useQuery({
    queryKey: ['debug-shared-transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('is_shared', true)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Query direta para ver splits
  const { data: rawSplits } = useQuery({
    queryKey: ['debug-splits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('transaction_splits')
        .select('*, transaction:transactions!transaction_id(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="fixed bottom-4 right-4 max-w-2xl max-h-96 overflow-auto bg-black text-white p-4 rounded-lg shadow-2xl text-xs font-mono z-50">
      <h3 className="text-yellow-400 font-bold mb-2">🔍 DEBUG: Shared Expenses</h3>
      
      <div className="space-y-4">
        {/* User Info */}
        <div>
          <p className="text-green-400">👤 User ID: {user?.id}</p>
          <p className="text-green-400">📧 Email: {user?.email}</p>
        </div>

        {/* Members */}
        <div>
          <p className="text-blue-400 font-bold">👥 Members ({members.length}):</p>
          {members.map(m => (
            <div key={m.id} className="ml-2">
              <p>• {m.name} (ID: {m.id.slice(0, 8)}...)</p>
              <p className="text-gray-400 ml-4">linked_user_id: {m.linked_user_id?.slice(0, 8) || 'null'}</p>
            </div>
          ))}
        </div>

        {/* Trips */}
        <div>
          <p className="text-purple-400 font-bold">✈️ Trips ({trips.length}):</p>
          {trips.map(t => (
            <div key={t.id} className="ml-2">
              <p>• {t.name} (ID: {t.id.slice(0, 8)}...)</p>
              <p className="text-gray-400 ml-4">Currency: {t.currency}</p>
            </div>
          ))}
        </div>

        {/* Raw Shared Transactions */}
        <div>
          <p className="text-orange-400 font-bold">📝 Raw Shared Transactions ({rawSharedTransactions?.length || 0}):</p>
          {rawSharedTransactions?.map(t => (
            <div key={t.id} className="ml-2 border-l-2 border-orange-600 pl-2 my-1">
              <p className="text-white">• {t.description}</p>
              <p className="text-gray-400">Date: {t.date}</p>
              <p className="text-gray-400">Amount: {t.amount} {t.currency}</p>
              <p className={t.trip_id ? "text-green-400" : "text-red-400"}>
                Trip ID: {t.trip_id ? t.trip_id.slice(0, 8) + '...' : '❌ NULL'}
              </p>
              <p className="text-gray-400">User ID: {t.user_id.slice(0, 8)}...</p>
            </div>
          ))}
        </div>

        {/* Raw Splits */}
        <div>
          <p className="text-cyan-400 font-bold">🔀 Raw Splits ({rawSplits?.length || 0}):</p>
          {rawSplits?.slice(0, 5).map((s: any) => (
            <div key={s.id} className="ml-2 border-l-2 border-cyan-600 pl-2 my-1">
              <p className="text-white">• Split Amount: {s.amount}</p>
              <p className="text-gray-400">Member ID: {s.member_id?.slice(0, 8) || 'null'}</p>
              <p className="text-gray-400">User ID: {s.user_id?.slice(0, 8) || 'null'}</p>
              <p className="text-gray-400">TX: {s.transaction?.description}</p>
              <p className={s.transaction?.trip_id ? "text-green-400" : "text-red-400"}>
                Trip ID: {s.transaction?.trip_id ? s.transaction.trip_id.slice(0, 8) + '...' : '❌ NULL'}
              </p>
            </div>
          ))}
        </div>

        {/* Processed Invoices */}
        <div>
          <p className="text-pink-400 font-bold">📊 Processed Invoices:</p>
          {Object.entries(invoices).map(([memberId, items]) => {
            const member = members.find(m => m.id === memberId);
            const travelItems = items.filter(i => i.tripId);
            
            return (
              <div key={memberId} className="ml-2 border-l-2 border-pink-600 pl-2 my-1">
                <p className="text-white">• {member?.name || 'Unknown'}</p>
                <p className="text-gray-400">Total Items: {items.length}</p>
                <p className="text-green-400">Travel Items: {travelItems.length}</p>
                {travelItems.map(item => (
                  <div key={item.id} className="ml-4 text-xs">
                    <p>- {item.description} ({item.type})</p>
                    <p className="text-gray-500">Trip: {item.tripId?.slice(0, 8)}...</p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Processed Transactions from Hook */}
        <div>
          <p className="text-yellow-400 font-bold">🔄 Hook Transactions ({transactions.length}):</p>
          {transactions.slice(0, 5).map(t => (
            <div key={t.id} className="ml-2 border-l-2 border-yellow-600 pl-2 my-1">
              <p className="text-white">• {t.description}</p>
              <p className={t.trip_id ? "text-green-400" : "text-red-400"}>
                Trip ID: {t.trip_id ? t.trip_id.slice(0, 8) + '...' : '❌ NULL'}
              </p>
              <p className="text-gray-400">Splits: {t.transaction_splits?.length || 0}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
