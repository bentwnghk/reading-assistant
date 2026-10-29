import { useEffect, useState } from "react";

/**
 * Mirrors a CSS media query in React state.
 *
 * The initial value is read synchronously from `window.matchMedia` (same
 * idea as the direct localStorage read pattern for first-render values),
 * so components rendered client-only — like the Header — get the correct
 * value on their very first render with no icon/behavior flicker. Returns
 * false during SSR, where `matchMedia` does not exist.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
