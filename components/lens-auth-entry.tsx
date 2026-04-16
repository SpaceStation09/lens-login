"use client";

import dynamic from "next/dynamic";

import type { LensAuthIntent } from "@/lib/lens/types";
import { PrivyBoundary } from "@/components/privy-boundary";

const LensAuthPanel = dynamic(() => import("@/components/lens-auth-panel").then((module) => module.LensAuthPanel), {
  ssr: false,
  loading: () => <div className="notice">Loading Lens login...</div>,
});

export function LensAuthEntry({ mode }: { mode: LensAuthIntent }) {
  return (
    <PrivyBoundary>
      <LensAuthPanel mode={mode} />
    </PrivyBoundary>
  );
}
