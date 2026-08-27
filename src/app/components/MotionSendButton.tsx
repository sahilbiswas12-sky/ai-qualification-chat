"use client";

import { useEffect, useRef, useState } from "react";

type ButtonState = "idle" | "loading" | "success" | "error";
type Outcome = "success" | "error";

export default function MotionSendButton() {
  const [buttonState, setButtonState] = useState<ButtonState>("idle");

  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRunning = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;

      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    };
  }, []);

  async function sendMessage(forcedOutcome?: Outcome) {
    // Prevent rapid clicks from starting multiple requests.
    if (isRunning.current) return;

    isRunning.current = true;

    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }

    setButtonState("loading");

    try {
      const delay = 900 + Math.random() * 700;

      await new Promise<void>((resolve) => {
        setTimeout(resolve, delay);
      });

      if (!isMounted.current) return;

      const outcome: Outcome =
        forcedOutcome ??
        (Math.random() < 0.2 ? "error" : "success");

      setButtonState(outcome);

      if (outcome === "success") {
        resetTimer.current = setTimeout(() => {
          if (isMounted.current) {
            setButtonState("idle");
          }
        }, 1800);
      }
    } finally {
      isRunning.current = false;
    }
  }

  const labels: Record<ButtonState, string> = {
    idle: "Send message",
    loading: "Sending...",
    success: "Message sent",
    error: "Try again",
  };

  const statusMessages: Record<ButtonState, string> = {
    idle: "Ready to send.",
    loading: "Message is being sent.",
    success: "Message sent successfully.",
    error: "Message could not be sent. Try again.",
  };

  return (
    <section className="motion-demo" aria-labelledby="motion-demo-title">
      <div className="motion-card">
        <p className="motion-eyebrow">INTERACTION DEMO</p>

        <h1 id="motion-demo-title">Send button lifecycle</h1>

        <p className="motion-description">
          This button communicates every stage of sending a message through
          motion, colour, text and accessible status updates.
        </p>

        <div className="button-stage">
          <button
            type="button"
            className={`motion-send-button state-${buttonState}`}
            onClick={() => sendMessage()}
            disabled={buttonState === "loading"}
            aria-busy={buttonState === "loading"}
            aria-describedby="button-status"
          >
            <span
              key={`icon-${buttonState}`}
              className="button-icon"
              aria-hidden="true"
            >
              {buttonState === "loading" && <span className="spinner" />}

              {buttonState === "success" && (
                <svg viewBox="0 0 24 24">
                  <path d="m5 12 4 4L19 6" />
                </svg>
              )}

              {buttonState === "error" && (
                <svg viewBox="0 0 24 24">
                  <path d="M12 8v5M12 17h.01" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              )}

              {buttonState === "idle" && (
                <svg viewBox="0 0 24 24">
                  <path d="m4 4 16 8-16 8 3-8-3-8Z" />
                  <path d="M7 12h13" />
                </svg>
              )}
            </span>

            <span
              key={`label-${buttonState}`}
              className="button-label"
            >
              {labels[buttonState]}
            </span>
          </button>
        </div>

        <p
          id="button-status"
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {statusMessages[buttonState]}
        </p>

        <div className="test-controls" aria-label="Button test controls">
          <button
            type="button"
            onClick={() => sendMessage("success")}
            disabled={buttonState === "loading"}
          >
            Test success
          </button>

          <button
            type="button"
            onClick={() => sendMessage("error")}
            disabled={buttonState === "loading"}
          >
            Test error
          </button>
        </div>

        <div className="motion-note">
          <h2>Motion decisions</h2>

          <p>
            Hover and press feedback use 180ms transitions so the button feels
            responsive. State changes use 320ms with an ease-out curve, allowing
            each result to settle clearly. Movement uses compositor-friendly
            transform and opacity properties. Reduced-motion mode removes the
            decorative movement while preserving colours, labels and accessible
            status feedback.
          </p>
        </div>
      </div>
    </section>
  );
}