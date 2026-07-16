/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare const self: ServiceWorkerGlobalScope;

// Ativa o novo SW imediatamente sem esperar as abas fecharem (fix para iOS Safari)
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Precache e rotas geradas pelo vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// App-shell: navegação servida direto do precache — abertura instantânea,
// como app nativo, sem esperar rede. Não há risco de referência de chunk
// morta: o index.html e TODOS os assets com hash entram no precache do mesmo
// SW de forma atômica (o SW novo só ativa depois de baixar tudo), então o
// index.html servido sempre aponta para chunks que já estão em cache.
// Deploys novos chegam em background via atualização do SW (autoUpdate).
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")));

// Nunca cachear (nem servir) uma resposta HTML para um request de script/style.
// Durante uma corrida de deploy, um asset com hash antigo pode 404 e a Vercel
// responde o index.html (200 text/html); sem esta guarda, o SW guardava esse
// HTML e passava a servi-lo como JS ("Failed to load module script"), envenenando
// o cache de forma persistente.
const denyHtmlForAssets = {
  cacheWillUpdate: async ({ response }: { response: Response }) => {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) return null;
    return response.status === 0 || response.status === 200 ? response : null;
  },
};

// Scripts/styles fora do precache (caso raro — assets do build já estão todos
// precacheados): CacheFirst, pois os nomes têm hash e o conteúdo é imutável.
registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    (request.destination === "script" || request.destination === "style"),
  new CacheFirst({
    cacheName: "app-assets",
    plugins: [
      denyHtmlForAssets,
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// Imagens estáticas (logos de banco, avatares, bandeiras de cartão): imutáveis,
// CacheFirst na primeira exibição — depois carregam do disco.
registerRoute(
  ({ request, url }) => url.origin === self.location.origin && request.destination === "image",
  new CacheFirst({
    cacheName: "app-images",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 24 * 60 * 60 }),
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
