"use client";

import dynamic from "next/dynamic";

const CreateTestAccountPanel = dynamic(
  () => import("@/components/create-test-account-panel").then((module) => module.CreateTestAccountPanel),
  {
    ssr: false,
    loading: () => <div className="notice">Loading account creator...</div>,
  },
);

export function CreateTestAccountEntry() {
  return <CreateTestAccountPanel />;
}
