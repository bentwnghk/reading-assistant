import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, NetworkOnly } from "serwist";

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
        // Never let a navigation be satisfied from the browser HTTP cache —
        // iOS Safari can otherwise resurrect a stale archived HTML document on
        // tab restore. The SW always asks the server for the current page.
        fetchOptions: { cache: "no-store" },
        plugins: [],
      }),
    },
    // /api/config must always hit the network (never the SW cache): it carries
    // the current build ID that ServiceWorkerRegistrar uses to detect stale
    // cached pages. defaultCache otherwise caches every /api/* GET in its
    // "apis" cache, and when the network is unavailable (e.g. iOS Safari's
    // suspended network on tab restore) NetworkFirst serves the cached OLD
    // build ID — hiding deployed updates until a manual reload. This route is
    // registered first so it takes precedence over the defaultCache /api/* rule.
    {
      matcher: ({ url }) => url.pathname === "/api/config",
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
