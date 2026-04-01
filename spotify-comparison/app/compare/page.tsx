// app/compare/page.tsx
import { Suspense } from "react";
import ComparePageInner from "./ComparePageInner"; // rename your current component

export default function ComparePage() {
  return (
    <Suspense fallback={<div style={{background:"#080808",minHeight:"100vh"}} />}>
      <ComparePageInner />
    </Suspense>
  );
}