"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary.
 *
 * Catches errors thrown inside the route segment (the main app tree). It gives
 * users a recoverable in-app UI instead of the default "Application error"
 * dead-end. Errors that escape both the root layout and this boundary are
 * handled by `global-error.tsx`.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h2 className="mb-3 text-xl font-semibold">Something went wrong</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          An unexpected error occurred while loading this page.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md border border-border px-5 py-2 text-sm font-medium hover:bg-muted"
          >
            Reload
          </button>
        </div>
        {error?.message ? (
          <p className="mt-6 break-words text-xs text-muted-foreground">{error.message}</p>
        ) : null}
      </div>
    </div>
  );
}
