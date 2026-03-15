import { Suspense } from "react";
import ReviewStudio from "@/components/ReviewStudio";

function DebateFallback() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-6 py-10">
      <div className="surface-panel mx-auto max-w-3xl px-8 py-10 text-center">
        <p className="eyebrow">Loading studio</p>
        <h1 className="mt-3 font-serif text-4xl text-[var(--text-primary)]">리뷰 스튜디오를 준비하고 있습니다.</h1>
      </div>
    </div>
  );
}

export default function DebateAliasPage() {
  return (
    <Suspense fallback={<DebateFallback />}>
      <ReviewStudio />
    </Suspense>
  );
}
