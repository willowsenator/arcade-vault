"use client";

import { useEffect } from "react";
import { PAGE_ERROR } from "@/lib/messages";

export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => console.error(error), [error]);

  return (
    <div style={{ textAlign: "center", padding: 80 }}>
      <div role="alert" style={{ color: "var(--magenta)", marginBottom: 24 }}>
        {PAGE_ERROR}
      </div>
      <button type="button" className="btn lg" onClick={() => retry()}>
        REINTENTAR
      </button>
    </div>
  );
}
