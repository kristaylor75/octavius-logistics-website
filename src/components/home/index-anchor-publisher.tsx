"use client";

import { useEffect } from "react";
import { useDeepStore, type Anchor } from "@/scene/store";
import type { HueKey } from "@/scene/palette";

/**
 * Publishes faint bioluminescence anchors for the instruments-index rows
 * (Phase 7). The index is a Server Component; this client sibling reads the
 * rows' `[data-anchor]` markers (no markup/SSR change beyond the data attrs),
 * and publishes a soft glow at each row's hue marker when it's in view, brighter
 * on hover. Renders nothing.
 *
 * Efficient: a rAF loop runs only while ≥1 row is in view/hovered (positions
 * must re-read each frame to track scroll); otherwise it stops and clears.
 */
export function IndexAnchorPublisher() {
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-anchor][data-hue]"),
    );
    if (els.length === 0) return;

    const setAnchors = useDeepStore.getState().setAnchors;
    const hover = new Set<HTMLElement>();
    const inview = new Set<HTMLElement>();
    let raf = 0;
    let running = false;

    const anyActive = () => hover.size > 0 || inview.size > 0;

    const publish = () => {
      const list: Anchor[] = [];
      for (const el of els) {
        const strength = hover.has(el) ? 0.7 : inview.has(el) ? 0.4 : 0;
        if (strength <= 0) continue;
        const r = el.getBoundingClientRect();
        list.push({
          id: `index-${el.dataset.anchor}`,
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          hue: el.dataset.hue as HueKey,
          strength,
        });
      }
      setAnchors("index", list);
    };

    const loop = () => {
      publish();
      if (anyActive()) {
        raf = requestAnimationFrame(loop);
      } else {
        running = false;
        setAnchors("index", []);
      }
    };
    const kick = () => {
      if (!running && anyActive()) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) inview.add(el);
          else inview.delete(el);
        }
        kick();
      },
      { threshold: 0.5 },
    );

    // Hover is on the whole row (the marker is small) → listen on its ancestor.
    const rows = new Map<HTMLElement, HTMLElement>(); // row -> marker
    const onEnter = (e: Event) => {
      const m = rows.get(e.currentTarget as HTMLElement);
      if (m) {
        hover.add(m);
        kick();
      }
    };
    const onLeave = (e: Event) => {
      const m = rows.get(e.currentTarget as HTMLElement);
      if (m) hover.delete(m);
    };

    for (const el of els) {
      io.observe(el);
      const row = el.closest("a");
      if (row) {
        rows.set(row, el);
        row.addEventListener("pointerenter", onEnter);
        row.addEventListener("pointerleave", onLeave);
      }
    }

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      for (const [row] of rows) {
        row.removeEventListener("pointerenter", onEnter);
        row.removeEventListener("pointerleave", onLeave);
      }
      setAnchors("index", []);
    };
  }, []);

  return null;
}
