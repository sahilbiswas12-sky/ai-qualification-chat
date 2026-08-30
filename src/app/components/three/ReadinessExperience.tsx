"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import StaticReadinessFallback from "./StaticReadinessFallback";

const ReadinessScene = dynamic(() => import("./ReadinessScene"), {
  ssr: false,
  loading: () => <StaticReadinessFallback message="Loading 3D experience…" />,
});

const scoreOptions = [
  {
    score: 35,
    label: "Needs Work",
    description: "Important project details are still missing.",
  },
  {
    score: 68,
    label: "Almost Ready",
    description: "The project is promising but needs minor improvements.",
  },
  {
    score: 88,
    label: "Ready to Build",
    description: "The project information is clear and actionable.",
  },
];

function prefersReducedMotion() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isLowPowerDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const deviceMemory = (
    navigator as Navigator & {
      deviceMemory?: number;
    }
  ).deviceMemory;

  const hasLowMemory =
    typeof deviceMemory === "number" && deviceMemory <= 2;

  const hasFewProcessors =
    typeof navigator.hardwareConcurrency === "number" &&
    navigator.hardwareConcurrency <= 2;

  return hasLowMemory || hasFewProcessors;
}

export default function ReadinessExperience() {
  const [score, setScore] = useState(68);
  const [canRender3D, setCanRender3D] = useState(false);
  const [fallbackReason, setFallbackReason] = useState("");

  const selectedOption =
    scoreOptions.find((option) => option.score === score) ?? scoreOptions[1];

  useEffect(() => {
    if (prefersReducedMotion()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCanRender3D(false);
      setFallbackReason(
        "A static preview is shown because reduced motion is enabled.",
      );
      return;
    }

    if (isLowPowerDevice()) {
      setCanRender3D(false);
      setFallbackReason(
        "A lightweight preview is shown for this low-power device.",
      );
      return;
    }

    setCanRender3D(true);
  }, []);

  return (
    <section
      aria-labelledby="readiness-title"
      className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-slate-950 shadow-2xl shadow-cyan-950/40"
    >
      <div className="grid lg:grid-cols-[1.5fr_0.7fr]">
        <div className="relative min-h-105 bg-[radial-gradient(circle_at_center,#0c4a6e_0%,#020617_58%)] sm:min-h-140">
          {canRender3D ? (
            <ReadinessScene score={score} />
          ) : (
            <StaticReadinessFallback
              score={score}
              message={fallbackReason || "Preparing experience…"}
            />
          )}

          <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-slate-200 backdrop-blur">
            Drag • Zoom • Tap orb
          </div>
        </div>

        <div className="flex flex-col justify-center border-t border-white/10 p-6 lg:border-l lg:border-t-0 lg:p-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Qualification result
          </p>

          <h2
            id="readiness-title"
            className="mt-3 text-3xl font-bold text-white"
          >
            {selectedOption.label}
          </h2>

          <div className="mt-4 flex items-end gap-2">
            <span className="text-6xl font-black text-white">{score}</span>
            <span className="pb-2 text-xl text-slate-400">/ 100</span>
          </div>

          <p className="mt-4 leading-7 text-slate-300">
            {selectedOption.description}
          </p>

          <div className="mt-8 space-y-3">
            <p className="text-sm font-medium text-slate-300">
              Change readiness score
            </p>

            {scoreOptions.map((option) => {
              const selected = score === option.score;

              return (
                <button
                  key={option.score}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setScore(option.score)}
                  className={`flex min-h-12 w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                    selected
                      ? "border-cyan-400 bg-cyan-400/15 text-white"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/50 hover:bg-white/10"
                  }`}
                >
                  <span className="font-medium">{option.label}</span>
                  <span className="text-sm">{option.score}%</span>
                </button>
              );
            })}
          </div>

          <p className="mt-6 text-xs leading-5 text-slate-500">
            The canvas is lazy-loaded. Reduced-motion and low-power devices
            receive a static fallback.
          </p>
        </div>
      </div>
    </section>
  );
}