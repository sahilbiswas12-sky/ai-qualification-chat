"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({
  error,
  reset,
}: ErrorPageProps) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="route-error-page">
      <section role="alert" className="route-error-card">
        <span aria-hidden="true" className="route-error-icon">
          !
        </span>

        <p className="route-error-label">Something went wrong</p>

        <h1>The project assistant could not load</h1>

        <p>
          Your conversation has not been deleted. Try loading this
          section again.
        </p>

        <button type="button" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}