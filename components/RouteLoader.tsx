"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/**
 * Full-screen transparent overlay with the speeder loader, shown while a
 * route transition is in flight. Triggered by internal link clicks, hidden
 * when the pathname changes (plus a safety timeout).
 */
function RouteLoaderInner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Navigation landed — hide immediately.
  useEffect(() => {
    setVisible(false);
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const anchor = el?.closest?.("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.hasAttribute("download")) return;
      const target = anchor.getAttribute("target");
      if (target && target !== "_self") return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      // Small delay so instant transitions don't flicker.
      if (showTimer.current) clearTimeout(showTimer.current);
      showTimer.current = setTimeout(() => setVisible(true), 150);
      // Safety: never leave the overlay stuck.
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), 5000);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (showTimer.current) clearTimeout(showTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fp-route-loader-overlay" role="status" aria-label="Loading page">
      <div className="fp-longfazers text-text-primary">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div className="fp-route-loader-stage text-text-primary">
        <div className="fp-loader">
          <span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </span>
          <div className="fp-base">
            <span></span>
            <div className="fp-face"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RouteLoader() {
  return (
    <Suspense fallback={null}>
      <RouteLoaderInner />
    </Suspense>
  );
}
