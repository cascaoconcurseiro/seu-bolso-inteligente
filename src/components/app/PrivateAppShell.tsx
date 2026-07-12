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

export function PrivateAppShell() {
  return (
    <ProtectedRoute>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister, maxAge: 1000 * 60 * 60 * 24 }}
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
