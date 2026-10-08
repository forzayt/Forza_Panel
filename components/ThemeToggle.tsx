"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Card } from "@/components/tailgrids/core/card";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isLight = mounted && theme === "light";

  return (
    <Card className="flex items-center px-2 py-1.5">
      <button
        onClick={() => setTheme(isLight ? "dark" : "light")}
        aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
        title={isLight ? "Switch to dark mode" : "Switch to light mode"}
        className="rounded-lg p-1 text-text-tertiary transition-colors hover:text-text-primary"
      >
        {isLight ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        )}
      </button>
    </Card>
  );
}
