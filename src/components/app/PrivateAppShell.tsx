import { PinWrapper } from "@/components/auth/PinWrapper";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { queryClient } from "@/config/queryClient";
import { MonthProvider } from "@/contexts/MonthContext";
import { PrivacyProvider } from "@/contexts/PrivacyContext";
import { TransactionModalProvider } from "@/contexts/TransactionModalContext";
import { createEncryptedForageStorage } from "@/utils/encryptedStorage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import localforage from "localforage";
import { Outlet } from "react-router-dom";

localforage.config({
  name: "SeuBolsoInteligente",
  storeName: "reactQueryCache",
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: createEncryptedForageStorage(localforage),
});

// Só dados sem valores monetários são persistidos. Saldos, faturas e totais sempre vêm
// da rede: restaurar do IndexedDB mostrava o valor antigo e trocava segundos depois.
const PERSISTED_QUERY_ROOTS = new Set([
  "categories",
  "user-profile",
  "family-members",
  "family",
  "notification-preferences",
  "auto-share-rules",
]);

// Mudar este valor descarta o cache antigo (que ainda contém saldos) no aparelho do usuário.
const PERSIST_BUSTER = "no-money-cache-v1";

export function PrivateAppShell() {
  return (
    <ProtectedRoute>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: asyncStoragePersister,
          maxAge: 1000 * 60 * 60 * 24,
          buster: PERSIST_BUSTER,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) =>
              query.state.status === "success" &&
              PERSISTED_QUERY_ROOTS.has(String(query.queryKey[0])),
          },
        }}
      >
        <MonthProvider>
          <TransactionModalProvider>
            <PrivacyProvider>
              <PinWrapper>
                <AppLayout>
                  <Outlet />
                </AppLayout>
              </PinWrapper>
            </PrivacyProvider>
          </TransactionModalProvider>
        </MonthProvider>
      </PersistQueryClientProvider>
    </ProtectedRoute>
  );
}
