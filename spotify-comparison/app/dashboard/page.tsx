import { Suspense } from "react";
import DashboardInner from "./DashboardInner";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ background: "#080808", minHeight: "100vh" }} />}>
      <DashboardInner />
    </Suspense>
  );
}