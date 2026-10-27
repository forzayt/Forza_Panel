"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { NAV_DATA, type NavItem, type NavSection } from "./data";

// Versioned so future nav changes can invalidate stale orders. v2: Projects
// was added right below Dashboard, so previously saved orders are discarded
// once to put it there by default.
const STORAGE_KEY = "forzapanel.sidebar.order.v2";

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
 * are dropped, and newly added items land in their *default* position relative
 * to the items around them (e.g. a new link defined right after Dashboard
 * shows up right after Dashboard, even for users with a saved order), so the
 * sidebar keeps working when the nav changes.
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
    // Insert unknown (newly added) items at their default index rather than
    // appending them, by comparing against each default neighbour's position.
    const defaultIndex = new Map(section.items.map((item, index) => [item.title, index]));
    for (const item of section.items) {
      if (used.has(item.title)) continue;
      const itemIndex = defaultIndex.get(item.title) ?? Number.MAX_SAFE_INTEGER;
      const insertAt = items.findIndex(
        (existing) => (defaultIndex.get(existing.title) ?? -1) > itemIndex,
      );
      items.splice(insertAt === -1 ? items.length : insertAt, 0, item);
      used.add(item.title);
    }

    return { ...section, items };
  });
}

export function useNavOrder() {
  const [order, setOrder] = useState<OrderMap>({});
  const [hydrated, setHydrated] = useState(false);

  // Read after mount so server and client render the same default order first.
  useEffect(() => {
    try {
      // Drop the pre-Projects order so the new default takes effect once.
      window.localStorage.removeItem("forzapanel.sidebar.order.v1");
    } catch {
      // Storage unavailable — nothing to clean up.
    }
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
