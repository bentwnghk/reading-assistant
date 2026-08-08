import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "serwist-navigation",
        // Fall back to the cache when the network is slow or unreachable,
        // instead of waiting indefinitely and rejecting the navigation.
        networkTimeoutSeconds: 3,
        plugins: [],
      }),
    },
    ...defaultCache,
  ],
});

// Last-resort fallback: when both the network and the cache fail for a
// navigation (e.g. first visit while offline, or an uncached URL), serve any
// cached navigation document we have rather than surfacing a "no-response"
// error to the console and failing the request outright.
serwist.setCatchHandler(async ({ request }) => {
  if (request.destination === "document" || request.mode === "navigate") {
    const cached = await caches.match("/", { cacheName: "serwist-navigation" });
    if (cached) return cached;
  }
  return Response.error();
});

serwist.addEventListeners();
