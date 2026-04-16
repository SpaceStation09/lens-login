"use client";

import { AppProviders } from "@/components/providers";

export function PrivyBoundary({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
