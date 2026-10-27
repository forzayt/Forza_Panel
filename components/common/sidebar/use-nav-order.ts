"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { NAV_DATA, type NavItem, type NavSection } from "./data";

// Versioned so future nav changes can invalidate stale orders.
const STORAGE_KEY = "forzapanel.sidebar.order.v1";

/** section label → ordered list of nav item titles */
type OrderMap = Record<string, string[]>;

function readOrder(): OrderMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const order: OrderMap = {};
    for (const [label, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
        order[label] = value as string[];
      }
    }
    return order;
  } catch {
    // Private mode / corrupted value — fall back to the default order.
    return {};
  }
}

/**
 * Applies a saved order to the static nav data. Titles that no longer exist
 * are dropped, and newly added items are appended in their default position,
 * so the sidebar keeps working when the nav changes.
 */
function applyOrder(sections: NavSection[], order: OrderMap): NavSection[] {
  return sections.map((section) => {
    const saved = order[section.label];
    if (!saved || saved.length === 0) return section;

    const byTitle = new Map<string, NavItem>(section.items.map((item) => [item.title, item]));
    const items: NavItem[] = [];
    const used = new Set<string>();

    for (const title of saved) {
      const item = byTitle.get(title);
      if (item && !used.has(title)) {
        items.push(item);
        used.add(title);
      }
    }
    for (const item of section.items) {
      if (!used.has(item.title)) items.push(item);
    }

    return { ...section, items };
  });
}

export function useNavOrder() {
  const [order, setOrder] = useState<OrderMap>({});
  const [hydrated, setHydrated] = useState(false);

  // Read after mount so server and client render the same default order first.
  useEffect(() => {
    setOrder(readOrder());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    } catch {
      // Storage unavailable — reordering still works for this session.
    }
  }, [order, hydrated]);

  const sections = useMemo(() => applyOrder(NAV_DATA, order), [order]);

  const moveItem = useCallback((sectionLabel: string, from: number, to: number) => {
    if (from === to) return;
    setOrder((prev) => {
      const section = applyOrder(NAV_DATA, prev).find((entry) => entry.label === sectionLabel);
      if (!section) return prev;

      const titles = section.items.map((item) => item.title);
      if (from < 0 || from >= titles.length || to < 0 || to >= titles.length) return prev;

      const [moved] = titles.splice(from, 1);
      titles.splice(to, 0, moved);
      return { ...prev, [sectionLabel]: titles };
    });
  }, []);

  const resetOrder = useCallback(() => setOrder({}), []);

  return { sections, moveItem, resetOrder, isCustom: Object.keys(order).length > 0 };
}
