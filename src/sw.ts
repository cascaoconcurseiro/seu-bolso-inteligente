/// <reference lib="webworker" />
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare const self: ServiceWorkerGlobalScope;

// Ativa o novo SW imediatamente sem esperar as abas fecharem (fix para iOS Safari)
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Precache e rotas geradas pelo vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA fallback — navegação sempre tenta a rede primeiro para obter o index.html
// do deploy atual (com os hashes de chunk vigentes). Servir o index.html
// pré-cacheado após um novo deploy produziria referências de chunk mortas
// (404 → fallback HTML → "Failed to load module script"). Offline, cai para a
// última versão em cache e, em último caso, para o index.html do precache.
const navigationStrategy = new NetworkFirst({
  cacheName: "app-shell",
  networkTimeoutSeconds: 3,
  plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
});
registerRoute(
  new NavigationRoute(async (options) => {
    try {
      const response = await navigationStrategy.handle(options);
      if (response) return response;
    } catch {
      // rede e cache de navegação indisponíveis — usa o precache abaixo
    }
    return (await matchPrecache("index.html")) ?? Response.error();
  })
);

// Assets são armazenados somente quando usados. Assim a instalação da PWA
// não disputa banda com a primeira tela em conexões móveis.
registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    (request.destination === "script" || request.destination === "style"),
  new StaleWhileRevalidate({
    cacheName: "app-assets",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

registerRoute(
  ({ request, url }) => url.origin === self.location.origin && request.destination === "font",
  new CacheFirst({
    cacheName: "app-fonts",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 12, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

// Dados financeiros não ficam em texto puro no Cache Storage. O modo offline
// usa o persister criptografado do React Query no IndexedDB.

// ─── Push Notifications ─────────────────────────────────────────────────────

self.addEventListener("push", (event: PushEvent) => {
  let data: { title?: string; body?: string; icon?: string; badge?: string; url?: string } = {};

  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: "Pé de Meia", body: event.data?.text() ?? "" };
  }

  const title = data.title ?? "Pé de Meia";
  const options: NotificationOptions = {
    body: data.body ?? "",
    icon: data.icon ?? "/icon-192.png",
    badge: data.badge ?? "/icon-72.png",
    tag: "pedemeia-bill-reminder",
    data: { url: data.url ?? "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const targetUrl = (event.notification.data?.url as string) ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Se o app já está aberto, foca nele e navega
      for (const client of clients) {
        if ("focus" in client) {
          (client as WindowClient).focus();
          (client as WindowClient).navigate(targetUrl);
          return;
        }
      }
      // Caso contrário abre nova janela
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
