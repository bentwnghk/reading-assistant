import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup, act } from "@testing-library/react";
import { usePrintLightTheme } from "./usePrintLightTheme";

// Regression tests for "always print the light version": the Class Assessment
// Report must print with its light design even while the app is in dark mode.
// jsdom cannot run a real print pipeline, so the print window is simulated by
// dispatching the same beforeprint/afterprint events the browser fires (the
// only mechanism the hook uses).

function printWindow() {
  window.dispatchEvent(new Event("beforeprint"));
  window.dispatchEvent(new Event("afterprint"));
}

beforeEach(() => {
  document.documentElement.className = "";
  document.documentElement.style.colorScheme = "";
});

afterEach(() => {
  cleanup();
  document.documentElement.className = "";
  document.documentElement.style.colorScheme = "";
});

describe("usePrintLightTheme", () => {
  it("strips .dark and color-scheme for the print window, then restores both", () => {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
    renderHook(() => usePrintLightTheme());

    window.dispatchEvent(new Event("beforeprint"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");

    window.dispatchEvent(new Event("afterprint"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("leaves an already-light page untouched", () => {
    document.documentElement.style.colorScheme = "light";
    renderHook(() => usePrintLightTheme());

    printWindow();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("restores the theme if the hook unmounts mid-print (afterprint never fired)", () => {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
    const { unmount } = renderHook(() => usePrintLightTheme());

    window.dispatchEvent(new Event("beforeprint"));
    act(() => unmount());
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("restores nothing after a completed print cycle (no double-apply)", () => {
    document.documentElement.classList.add("dark");
    renderHook(() => usePrintLightTheme());

    printWindow();
    // Someone else (a second hook instance) re-printing must not resurrect
    // the stale captured state of this hook's cycle.
    document.documentElement.classList.remove("dark");
    window.dispatchEvent(new Event("afterprint"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("stops listening once unmounted", () => {
    const { unmount } = renderHook(() => usePrintLightTheme());
    act(() => unmount());

    document.documentElement.classList.add("dark");
    window.dispatchEvent(new Event("beforeprint"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
